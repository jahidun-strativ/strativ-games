import "server-only";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { matchSquadPlayers, matches, players, type Player } from "@/db/schema";

// The players fielded for a team in a specific match. If the squad has been
// customised (any match_squad_players rows exist) those rows are authoritative;
// otherwise it falls back to the team's current roster. `customized` tells the
// UI whether it's showing a per-match snapshot or the live roster.
export async function getEffectiveSquad(
  matchId: string,
  teamId: string,
): Promise<{ players: Player[]; customized: boolean }> {
  const rows = await db
    .select({ player: players })
    .from(matchSquadPlayers)
    .innerJoin(players, eq(matchSquadPlayers.playerId, players.id))
    .where(and(eq(matchSquadPlayers.matchId, matchId), eq(matchSquadPlayers.teamId, teamId)))
    .orderBy(asc(players.name));

  if (rows.length > 0) {
    return { players: rows.map((r) => r.player), customized: true };
  }

  // Roster default — but drop anyone already picked by another team in this
  // slot, so a player guesting elsewhere doesn't also show as fielded here.
  const [roster, pickedElsewhere] = await Promise.all([
    db.query.players.findMany({
      where: eq(players.teamId, teamId),
      orderBy: asc(players.name),
    }),
    pickedByOtherTeamsInSlot(matchId, teamId),
  ]);
  return { players: roster.filter((p) => !pickedElsewhere.has(p.id)), customized: false };
}

// Player ids explicitly picked by a DIFFERENT team anywhere in this match's slot
// (session). Used to stop the same player being fielded by two teams in one
// slot. Only explicit squad rows count — roster membership doesn't lock a player
// to his home team, so he can still guest elsewhere. Empty for legacy
// sessionless matches (nothing to span).
export async function pickedByOtherTeamsInSlot(
  matchId: string,
  teamId: string,
): Promise<Set<string>> {
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
    columns: { sessionId: true },
  });
  if (!match?.sessionId) return new Set();

  const slotMatchIds = (
    await db
      .select({ id: matches.id })
      .from(matches)
      .where(eq(matches.sessionId, match.sessionId))
  ).map((m) => m.id);

  const rows = await db
    .select({ playerId: matchSquadPlayers.playerId })
    .from(matchSquadPlayers)
    .where(
      and(
        inArray(matchSquadPlayers.matchId, slotMatchIds),
        ne(matchSquadPlayers.teamId, teamId),
      ),
    );
  return new Set(rows.map((r) => r.playerId));
}
