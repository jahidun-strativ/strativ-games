"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { matchLineupSlots, matchLineups, matchSquadPlayers, matches, players } from "@/db/schema";
import { requireCaptainOf } from "@/server/auth";
import { getEffectiveSquad } from "@/server/queries/match-squad";

// Loads a match and the side (home/away) that `teamId` plays, plus the opposing
// team id. Throws if the team isn't in this match.
async function matchSide(matchId: string, teamId: string) {
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
    columns: { id: true, homeTeamId: true, awayTeamId: true },
    with: {
      homeTeam: { columns: { id: true, kind: true, sportId: true } },
      awayTeam: { columns: { id: true, kind: true, sportId: true } },
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

// Copy the team's current roster into the match squad the first time it's
// edited, so from then on the match holds its own snapshot.
async function materialize(matchId: string, teamId: string) {
  const existing = await db
    .select({ id: matchSquadPlayers.id })
    .from(matchSquadPlayers)
    .where(and(eq(matchSquadPlayers.matchId, matchId), eq(matchSquadPlayers.teamId, teamId)))
    .limit(1);
  if (existing.length > 0) return;

  const roster = await db.query.players.findMany({
    where: eq(players.teamId, teamId),
    columns: { id: true },
  });
  if (roster.length > 0) {
    await db
      .insert(matchSquadPlayers)
      .values(roster.map((p) => ({ matchId, teamId, playerId: p.id })))
      .onConflictDoNothing();
  }
}

// Add a player to this team's squad for this match only — a team member kept,
// or a guest (free agent / borrowed) who is NOT added to the roster. Admin or
// the team's captain.
export async function addMatchSquadPlayer(matchId: string, teamId: string, playerId: string) {
  await requireCaptainOf(teamId);
  const { team, opponentId } = await matchSide(matchId, teamId);

  const player = await db.query.players.findFirst({
    where: eq(players.id, playerId),
    columns: { id: true, sportId: true },
  });
  if (!player) throw new Error("Player not found.");
  if (player.sportId !== team.sportId) {
    throw new Error("Player plays a different sport.");
  }

  // A player can't be in both squads of the same match.
  if (opponentId) {
    const opposing = await getEffectiveSquad(matchId, opponentId);
    if (opposing.players.some((p) => p.id === playerId)) {
      throw new Error("That player is already in the opponent's squad for this match.");
    }
  }

  await materialize(matchId, teamId);
  await db
    .insert(matchSquadPlayers)
    .values({ matchId, teamId, playerId })
    .onConflictDoNothing();

  revalidatePath(`/matches/${matchId}`);
  revalidatePath(`/matches/${matchId}/lineup/${teamId}`);
}

// Drop a player from this match's squad only (roster untouched). Also clears
// them from this match's saved lineup so the lineup can't reference a
// non-squad player. Admin or the team's captain.
export async function removeMatchSquadPlayer(matchId: string, teamId: string, playerId: string) {
  await requireCaptainOf(teamId);
  await matchSide(matchId, teamId);

  await materialize(matchId, teamId);
  await db
    .delete(matchSquadPlayers)
    .where(
      and(
        eq(matchSquadPlayers.matchId, matchId),
        eq(matchSquadPlayers.teamId, teamId),
        eq(matchSquadPlayers.playerId, playerId),
      ),
    );

  // Remove them from any saved lineup slot for this match+team.
  const lineup = await db.query.matchLineups.findFirst({
    where: and(eq(matchLineups.matchId, matchId), eq(matchLineups.teamId, teamId)),
    columns: { id: true },
  });
  if (lineup) {
    await db
      .update(matchLineupSlots)
      .set({ playerId: null })
      .where(
        and(eq(matchLineupSlots.matchLineupId, lineup.id), eq(matchLineupSlots.playerId, playerId)),
      );
  }

  revalidatePath(`/matches/${matchId}`);
  revalidatePath(`/matches/${matchId}/lineup/${teamId}`);
}
