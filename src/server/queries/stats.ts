import { and, desc, eq, gte, lt, sql, sum, count } from "drizzle-orm";
import { db } from "@/db";
import { matches, playerMatchStats, players, teams } from "@/db/schema";

export type LeaderboardRow = {
  playerId: string;
  name: string;
  teamName: string | null;
  position: string;
  goals: number;
  assists: number;
  appearances: number;
};

export async function getLeaderboard(sportId?: string): Promise<LeaderboardRow[]> {
  const rows = await db
    .select({
      playerId: players.id,
      name: players.name,
      teamName: teams.name,
      position: players.position,
      goals: sum(playerMatchStats.goals).mapWith(Number),
      assists: sum(playerMatchStats.assists).mapWith(Number),
      appearances: count(playerMatchStats.id).mapWith(Number),
    })
    .from(playerMatchStats)
    .innerJoin(players, eq(playerMatchStats.playerId, players.id))
    .leftJoin(teams, eq(players.teamId, teams.id))
    .where(sportId ? eq(players.sportId, sportId) : sql`true`)
    .groupBy(players.id, players.name, teams.name, players.position)
    .orderBy(
      desc(sum(playerMatchStats.goals)),
      desc(sum(playerMatchStats.assists)),
    );
  return rows;
}

// Leaderboard scoped to matches whose kickoff falls in [monthStart, monthEnd).
// Only counts completed matches so an unplayed fixture never awards stats.
export async function getMonthlyLeaderboard(
  monthStart: Date,
  monthEnd: Date,
  sportId?: string,
): Promise<LeaderboardRow[]> {
  const rows = await db
    .select({
      playerId: players.id,
      name: players.name,
      teamName: teams.name,
      position: players.position,
      goals: sum(playerMatchStats.goals).mapWith(Number),
      assists: sum(playerMatchStats.assists).mapWith(Number),
      appearances: count(playerMatchStats.id).mapWith(Number),
    })
    .from(playerMatchStats)
    .innerJoin(players, eq(playerMatchStats.playerId, players.id))
    .innerJoin(matches, eq(playerMatchStats.matchId, matches.id))
    .leftJoin(teams, eq(players.teamId, teams.id))
    .where(
      and(
        eq(matches.status, "completed"),
        gte(matches.kickoffAt, monthStart),
        lt(matches.kickoffAt, monthEnd),
        sportId ? eq(players.sportId, sportId) : undefined,
      ),
    )
    .groupBy(players.id, players.name, teams.name, players.position)
    .orderBy(
      desc(sum(playerMatchStats.goals)),
      desc(sum(playerMatchStats.assists)),
    );
  return rows;
}

export async function getPlayerTotals(playerId: string) {
  const [row] = await db
    .select({
      goals: sum(playerMatchStats.goals).mapWith(Number),
      assists: sum(playerMatchStats.assists).mapWith(Number),
      appearances: count(playerMatchStats.id).mapWith(Number),
    })
    .from(playerMatchStats)
    .where(eq(playerMatchStats.playerId, playerId));
  return {
    goals: row?.goals ?? 0,
    assists: row?.assists ?? 0,
    appearances: row?.appearances ?? 0,
  };
}
