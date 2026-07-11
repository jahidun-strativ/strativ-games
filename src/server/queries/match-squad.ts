import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { matchSquadPlayers, players, type Player } from "@/db/schema";

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

  const roster = await db.query.players.findMany({
    where: eq(players.teamId, teamId),
    orderBy: asc(players.name),
  });
  return { players: roster, customized: false };
}
