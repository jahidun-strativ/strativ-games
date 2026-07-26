"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  matchAvailability,
  matchLineupSlots,
  matchLineups,
  matchSquadPlayers,
  matches,
  players,
  teams,
} from "@/db/schema";
import { requireTeamManager } from "@/server/auth";
import { notifyPlayers } from "@/server/notifications";
import { getEffectiveSquad } from "@/server/queries/match-squad";

// Loads a match and the side (home/away) that `teamId` plays, plus the opposing
// team id. Throws if the team isn't in this match.
async function matchSide(matchId: string, teamId: string) {
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
    columns: { id: true, homeTeamId: true, awayTeamId: true },
    with: {
      homeTeam: { columns: { id: true, name: true, kind: true, sportId: true } },
      awayTeam: { columns: { id: true, name: true, kind: true, sportId: true } },
    },
  });
  if (!match) throw new Error("Match not found.");
  const team =
    match.homeTeamId === teamId
      ? match.homeTeam
      : match.awayTeamId === teamId
        ? match.awayTeam
        : null;
  if (!team) throw new Error("That team isn't in this match.");
  if (team.kind === "external") throw new Error("Opponent teams don't have a squad.");
  const opponentId = match.homeTeamId === teamId ? match.awayTeamId : match.homeTeamId;
  return { team, opponentId };
}

// A squad belongs to a team for the whole SLOT (session), not one match — a
// round-robin slot has the team playing several games with the same players.
// This returns every match in this match's slot the team plays in (always
// includes `matchId`), plus every match id in the slot (for cross-team checks).
// For legacy sessionless matches the slot is just this one match.
async function slotMatchIds(matchId: string, teamId: string) {
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
    columns: { sessionId: true },
  });
  if (!match?.sessionId) return { teamMatchIds: [matchId], allMatchIds: [matchId] };

  const rows = await db
    .select({ id: matches.id, homeTeamId: matches.homeTeamId, awayTeamId: matches.awayTeamId })
    .from(matches)
    .where(eq(matches.sessionId, match.sessionId));

  return {
    teamMatchIds: rows.filter((m) => m.homeTeamId === teamId || m.awayTeamId === teamId).map((m) => m.id),
    allMatchIds: rows.map((m) => m.id),
  };
}

// Whether `playerId` is already explicitly picked by a DIFFERENT team anywhere
// in this slot. Only explicit match_squad_players rows count — roster
// membership doesn't, so a player can still guest for another team without
// being locked to his home side. Returns the blocking team's name, or null.
async function pickedByAnotherTeamInSlot(
  allMatchIds: string[],
  teamId: string,
  playerId: string,
): Promise<string | null> {
  const clash = await db
    .select({ name: teams.name })
    .from(matchSquadPlayers)
    .innerJoin(teams, eq(matchSquadPlayers.teamId, teams.id))
    .where(
      and(
        inArray(matchSquadPlayers.matchId, allMatchIds),
        eq(matchSquadPlayers.playerId, playerId),
        ne(matchSquadPlayers.teamId, teamId),
      ),
    )
    .limit(1);
  return clash[0]?.name ?? null;
}

// Replace this team's squad across ALL its slot matches with exactly
// `playerIds`. A squad is a slot-level thing, so every game the team plays in
// the slot ends up with the identical squad — this both propagates edits and
// reconciles any divergent/legacy per-match rows.
async function replaceSlotSquad(teamMatchIds: string[], teamId: string, playerIds: string[]) {
  await db
    .delete(matchSquadPlayers)
    .where(
      and(inArray(matchSquadPlayers.matchId, teamMatchIds), eq(matchSquadPlayers.teamId, teamId)),
    );
  if (playerIds.length > 0) {
    await db
      .insert(matchSquadPlayers)
      .values(
        teamMatchIds.flatMap((mid) => playerIds.map((playerId) => ({ matchId: mid, teamId, playerId }))),
      )
      .onConflictDoNothing();
  }
}

function revalidateTeamMatches(teamMatchIds: string[], teamId: string) {
  for (const mid of teamMatchIds) {
    revalidatePath(`/matches/${mid}`);
    revalidatePath(`/matches/${mid}/lineup/${teamId}`);
  }
}

// Add a player to this team's squad for the whole slot — a team member kept, or
// a guest (free agent / borrowed) who is NOT added to the roster. Admin or the
// team's captain.
export async function addMatchSquadPlayer(matchId: string, teamId: string, playerId: string) {
  await requireTeamManager(teamId);
  const { team } = await matchSide(matchId, teamId);
  const { teamMatchIds, allMatchIds } = await slotMatchIds(matchId, teamId);

  const player = await db.query.players.findFirst({
    where: eq(players.id, playerId),
    columns: { id: true, sportId: true },
  });
  if (!player) throw new Error("Player not found.");
  if (player.sportId !== team.sportId) {
    throw new Error("Player plays a different sport.");
  }

  // A player can only be picked by one team in the whole slot (session).
  const clashTeam = await pickedByAnotherTeamInSlot(allMatchIds, teamId, playerId);
  if (clashTeam) {
    throw new Error(`That player is already in ${clashTeam}'s squad for this slot.`);
  }

  // Current slot squad (from this match's view) + the new player, applied to
  // every game the team plays in the slot.
  const { players: current } = await getEffectiveSquad(matchId, teamId);
  const next = [...new Set([...current.map((p) => p.id), playerId])];
  await replaceSlotSquad(teamMatchIds, teamId, next);
  // Being picked for the squad implies availability — default them to "in"
  // for every game of the slot (kept if they already responded; still tappable).
  await db
    .insert(matchAvailability)
    .values(teamMatchIds.map((mid) => ({ matchId: mid, playerId, status: "in" })))
    .onConflictDoNothing();

  await notifyPlayers([playerId], {
    type: "assignment",
    title: "✅ Picked for a match",
    body: `You've been added to the squad for ${team.name}.`,
    url: `/matches/${matchId}`,
  });

  revalidateTeamMatches(teamMatchIds, teamId);
}

// Add every player on this team who RSVP'd "in" to the slot squad in one go.
// Admin or the team's captain. Returns how many were added. Handy after RSVPs come in.
export async function fillSquadFromAvailability(matchId: string, teamId: string) {
  await requireTeamManager(teamId);
  await matchSide(matchId, teamId);
  const { teamMatchIds, allMatchIds } = await slotMatchIds(matchId, teamId);

  const rows = await db
    .select({ playerId: matchAvailability.playerId })
    .from(matchAvailability)
    .innerJoin(players, eq(matchAvailability.playerId, players.id))
    .where(
      and(
        eq(matchAvailability.matchId, matchId),
        eq(matchAvailability.status, "in"),
        eq(players.teamId, teamId),
      ),
    );

  // Skip anyone already picked by another team in this slot (one player, one team).
  const eligible: typeof rows = [];
  for (const r of rows) {
    if (!(await pickedByAnotherTeamInSlot(allMatchIds, teamId, r.playerId))) eligible.push(r);
  }

  if (eligible.length > 0) {
    const { players: current } = await getEffectiveSquad(matchId, teamId);
    const next = [...new Set([...current.map((p) => p.id), ...eligible.map((r) => r.playerId)])];
    await replaceSlotSquad(teamMatchIds, teamId, next);
  }

  revalidateTeamMatches(teamMatchIds, teamId);
  return eligible.length;
}

// Drop a player from this team's slot squad (roster untouched). Also clears them
// from every saved lineup in the slot so a lineup can't reference a non-squad
// player. Admin or the team's captain.
export async function removeMatchSquadPlayer(matchId: string, teamId: string, playerId: string) {
  await requireTeamManager(teamId);
  await matchSide(matchId, teamId);
  const { teamMatchIds } = await slotMatchIds(matchId, teamId);

  const { players: current } = await getEffectiveSquad(matchId, teamId);
  const next = current.map((p) => p.id).filter((id) => id !== playerId);
  await replaceSlotSquad(teamMatchIds, teamId, next);

  // Remove them from any saved lineup slot across the slot's matches.
  const lineups = await db.query.matchLineups.findMany({
    where: and(inArray(matchLineups.matchId, teamMatchIds), eq(matchLineups.teamId, teamId)),
    columns: { id: true },
  });
  if (lineups.length > 0) {
    await db
      .update(matchLineupSlots)
      .set({ playerId: null })
      .where(
        and(
          inArray(
            matchLineupSlots.matchLineupId,
            lineups.map((l) => l.id),
          ),
          eq(matchLineupSlots.playerId, playerId),
        ),
      );
  }

  revalidateTeamMatches(teamMatchIds, teamId);
}
