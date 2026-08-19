import { cache } from "react";
import { and, asc, count, desc, eq, inArray, sum } from "drizzle-orm";
import { db } from "@/db";
import { matches, playerMatchStats, players, seasons, sessions, teams } from "@/db/schema";
import { computeStandings, type StandingsRow } from "@/server/queries/standings";
import type { Season } from "@/db/schema";

// Red weighs more than yellow — standard fair-play scoring. Fewest points wins.
// ponytail: fixed 1/3 weighting; make it a season setting only if a league asks.
const CARD_POINTS = { yellow: 1, red: 3 };

export type SeasonScorer = {
  playerId: string;
  name: string;
  teamId: string | null;
  teamName: string | null;
  position: string;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  appearances: number;
};

export type FairplayRow = { teamId: string; teamName: string; yellow: number; red: number; points: number };

type AwardPlayer = { id: string; name: string; teamName: string | null };

export type SeasonAwards = {
  topScorer: { player: AwardPlayer; goals: number; auto: boolean } | null;
  fairplay: { teamId: string; teamName: string; points: number; auto: boolean } | null;
  playerOfSeason: AwardPlayer | null;
  bestGk: AwardPlayer | null;
};

// cache(): the league layout and the active sub-page both resolve the season —
// dedupe so it's one DB round-trip per request, not one per component.
export const getActiveSeason = cache(async (): Promise<Season | null> => {
  const row = await db.query.seasons.findFirst({
    where: eq(seasons.status, "active"),
    orderBy: desc(seasons.createdAt),
  });
  return row ?? null;
});

export const getSeasonById = cache(async (id: string): Promise<Season | null> => {
  const row = await db.query.seasons.findFirst({ where: eq(seasons.id, id) });
  return row ?? null;
});

// The matchday schedule (nested fixtures + team names). Its own cached query so
// the Fixtures page can load just this without computing scorers/awards.
export const getSeasonMatchdays = cache(async (seasonId: string) => {
  return db.query.sessions.findMany({
    where: eq(sessions.seasonId, seasonId),
    orderBy: asc(sessions.startAt),
    with: {
      venue: { columns: { name: true, city: true } },
      fixtures: {
        orderBy: asc(matches.orderIndex),
        with: { homeTeam: { columns: { name: true } }, awayTeam: { columns: { name: true } } },
      },
    },
  });
});

// Every completed-match player stat in the season, summed per player.
async function seasonScorers(seasonId: string): Promise<SeasonScorer[]> {
  return db
    .select({
      playerId: players.id,
      name: players.name,
      teamId: players.teamId,
      teamName: teams.name,
      position: players.position,
      goals: sum(playerMatchStats.goals).mapWith(Number),
      assists: sum(playerMatchStats.assists).mapWith(Number),
      yellow: sum(playerMatchStats.yellowCards).mapWith(Number),
      red: sum(playerMatchStats.redCards).mapWith(Number),
      appearances: count(playerMatchStats.id).mapWith(Number),
    })
    .from(playerMatchStats)
    .innerJoin(matches, eq(playerMatchStats.matchId, matches.id))
    .innerJoin(sessions, eq(matches.sessionId, sessions.id))
    .innerJoin(players, eq(playerMatchStats.playerId, players.id))
    .leftJoin(teams, eq(players.teamId, teams.id))
    .where(and(eq(sessions.seasonId, seasonId), eq(matches.status, "completed")))
    .groupBy(players.id, players.name, players.teamId, teams.name, players.position)
    .orderBy(desc(sum(playerMatchStats.goals)), desc(sum(playerMatchStats.assists)));
}

// One player's totals scoped to a single season (completed league matches only).
// Mirrors getPlayerTotals (overall) so a profile can show League vs Overall.
export async function getPlayerSeasonTotals(playerId: string, seasonId: string) {
  const [row] = await db
    .select({
      goals: sum(playerMatchStats.goals).mapWith(Number),
      assists: sum(playerMatchStats.assists).mapWith(Number),
      appearances: count(playerMatchStats.id).mapWith(Number),
    })
    .from(playerMatchStats)
    .innerJoin(matches, eq(playerMatchStats.matchId, matches.id))
    .innerJoin(sessions, eq(matches.sessionId, sessions.id))
    .where(
      and(
        eq(playerMatchStats.playerId, playerId),
        eq(sessions.seasonId, seasonId),
        eq(matches.status, "completed"),
      ),
    );
  return {
    goals: row?.goals ?? 0,
    assists: row?.assists ?? 0,
    appearances: row?.appearances ?? 0,
  };
}

async function resolveAwards(
  season: Season,
  scorers: SeasonScorer[],
  fairplay: FairplayRow[],
): Promise<SeasonAwards> {
  // Names for whichever players the awards point at (auto picks are already in
  // `scorers`, but admin overrides/picks may not be — fetch them all to be safe).
  const topScorerAuto = scorers.find((s) => s.goals > 0) ?? null;
  const topScorerId = season.topScorerId ?? topScorerAuto?.playerId ?? null;
  const ids = [topScorerId, season.playerOfSeasonId, season.bestGkId].filter(
    (v): v is string => Boolean(v),
  );
  const nameRows = ids.length
    ? await db.query.players.findMany({
        where: inArray(players.id, ids),
        columns: { id: true, name: true },
        with: { team: { columns: { name: true } } },
      })
    : [];
  const nameOf = (id: string | null): AwardPlayer | null => {
    if (!id) return null;
    const r = nameRows.find((p) => p.id === id);
    return r ? { id: r.id, name: r.name, teamName: r.team?.name ?? null } : null;
  };

  const topScorerPlayer = nameOf(topScorerId);
  const topGoals =
    scorers.find((s) => s.playerId === topScorerId)?.goals ?? topScorerAuto?.goals ?? 0;

  const fairplayAuto = fairplay[0] ?? null;
  const fairplayTeamId = season.fairplayTeamId ?? fairplayAuto?.teamId ?? null;
  const fairplayRow = fairplay.find((f) => f.teamId === fairplayTeamId) ?? null;

  return {
    topScorer:
      topScorerPlayer && topGoals > 0
        ? { player: topScorerPlayer, goals: topGoals, auto: !season.topScorerId }
        : null,
    fairplay: fairplayRow
      ? { teamId: fairplayRow.teamId, teamName: fairplayRow.teamName, points: fairplayRow.points, auto: !season.fairplayTeamId }
      : null,
    playerOfSeason: nameOf(season.playerOfSeasonId),
    bestGk: nameOf(season.bestGkId),
  };
}

export type SeasonView = Awaited<ReturnType<typeof getSeasonView>>;

// Everything the league page renders for one season: standings, matchdays,
// scorers, fair-play and resolved awards. Read-only — used by both the in-app
// and the public page.
export const getSeasonView = cache(async (season: Season) => {
  const [sportTeams, matchdays, scorers] = await Promise.all([
    db.query.teams.findMany({ where: eq(teams.sportId, season.sportId) }),
    getSeasonMatchdays(season.id),
    seasonScorers(season.id),
  ]);

  const internalTeams = sportTeams.filter((t) => t.kind !== "external");
  const leagueMatches = matchdays.flatMap((m) => m.fixtures);
  const standings = computeStandings(internalTeams, leagueMatches);

  // Team discipline, only for teams that have actually played. A player's cards
  // fall to their current roster team (rosters are stable within a season).
  const playedTeamIds = new Set(standings.filter((r) => r.played > 0).map((r) => r.teamId));
  const disc = new Map<string, FairplayRow>(
    internalTeams
      .filter((t) => playedTeamIds.has(t.id))
      .map((t) => [t.id, { teamId: t.id, teamName: t.name, yellow: 0, red: 0, points: 0 }]),
  );
  for (const s of scorers) {
    if (!s.teamId) continue;
    const row = disc.get(s.teamId);
    if (!row) continue;
    row.yellow += s.yellow;
    row.red += s.red;
    row.points += s.yellow * CARD_POINTS.yellow + s.red * CARD_POINTS.red;
  }
  const fairplay = [...disc.values()].sort(
    (a, b) => a.points - b.points || a.teamName.localeCompare(b.teamName),
  );

  const awards = await resolveAwards(season, scorers, fairplay);
  const playedMatchdays = matchdays.filter(
    (m) => m.fixtures.length > 0 && m.fixtures.every((f) => f.status !== "scheduled"),
  ).length;
  const champion: StandingsRow | null =
    season.status === "ended" && standings[0]?.played > 0 ? standings[0] : null;

  return {
    season,
    teams: internalTeams,
    standings,
    matchdays,
    playedMatchdays,
    scorers,
    fairplay,
    awards,
    champion,
  };
});
