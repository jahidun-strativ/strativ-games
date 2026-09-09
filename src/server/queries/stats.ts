import { and, desc, eq, gte, lt, sql, sum, count } from "drizzle-orm";
import { db } from "@/db";
import { matches, playerMatchStats, players, teams } from "@/db/schema";
import { tallyKeeperMatches } from "@/lib/match-scoring";

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

// Career card for one player: matches actually played (played=true), plus goal
// and assist totals. Distinct from getPlayerTotals, which counts every stat row.
export async function getPlayerScorecard(playerId: string) {
  const [row] = await db
    .select({
      played: count().mapWith(Number),
      goals: sum(playerMatchStats.goals).mapWith(Number),
      assists: sum(playerMatchStats.assists).mapWith(Number),
    })
    .from(playerMatchStats)
    .where(and(eq(playerMatchStats.playerId, playerId), eq(playerMatchStats.played, true)));
  return {
    played: row?.played ?? 0,
    goals: row?.goals ?? 0,
    assists: row?.assists ?? 0,
  };
}

// All-time goalkeeping card for one keeper: completed matches kept, saves made,
// and clean sheets. ponytail: attributes every completed match the player kept
// to their CURRENT team (same limitation as seasonKeepers) — a keeper who
// transferred sees old clean sheets scored against their new team's side.
export async function getKeeperScorecard(playerId: string, teamId: string | null) {
  const rows = await db
    .select({
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      saves: playerMatchStats.saves,
    })
    .from(playerMatchStats)
    .innerJoin(matches, eq(playerMatchStats.matchId, matches.id))
    .where(
      and(
        eq(playerMatchStats.playerId, playerId),
        eq(playerMatchStats.played, true),
        eq(matches.status, "completed"),
      ),
    );
  return tallyKeeperMatches(teamId, rows);
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
