import { cache } from "react";
import { and, asc, count, desc, eq, inArray, sum } from "drizzle-orm";
import { db } from "@/db";
import { matches, playerMatchStats, players, seasons, sessions, teams } from "@/db/schema";
import { computeStandings, type StandingsRow } from "@/server/queries/standings";
import type { Season } from "@/db/schema";

export type SeasonScorer = {
  playerId: string;
  name: string;
  teamId: string | null;
  teamName: string | null;
  position: string;
  goals: number;
  assists: number;
  fouls: number;
  appearances: number;
};

// Fair play = fewest fouls. points === fouls (kept for the table's "Pts" column).
export type FairplayRow = { teamId: string; teamName: string; fouls: number; points: number };

// A goalkeeper's defensive record: goals conceded while they were on the pitch,
// clean sheets and matches kept. Best GK = lowest goals-against per game.
export type KeeperRow = {
  playerId: string;
  name: string;
  teamName: string | null;
  matches: number;
  conceded: number;
  cleanSheets: number;
  gaPerGame: number;
};

type AwardPlayer = { id: string; name: string; teamName: string | null };

export type SeasonAwards = {
  topScorer: { player: AwardPlayer; goals: number; auto: boolean } | null;
  fairplay: { teamId: string; teamName: string; points: number; auto: boolean } | null;
  playerOfSeason: AwardPlayer | null;
  bestGk: { player: AwardPlayer; cleanSheets: number; conceded: number; matches: number; auto: boolean } | null;
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
      fouls: sum(playerMatchStats.fouls).mapWith(Number),
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

// A player counts as a keeper by their free-text position ("GK" / "Goalkeeper").
const isKeeperPosition = (pos: string | null | undefined) => {
  const p = (pos ?? "").toLowerCase();
  return p.includes("gk") || p.includes("keeper");
};

// Goalkeeper defensive records for the season. We can't sum a "conceded" column
// (there isn't one) — a keeper concedes the OPPONENT's score in each match they
// played, so we compute per-match in JS. Best GK = fewest goals-against per game
// (tie-break: more clean sheets, then more matches). This is what turns a team's
// defensive solidity into GK credit, recomputed from live results.
// ponytail: no min-appearances floor — a 1-match keeper can top a small league;
// add a floor only if a keeper games the table by playing once.
async function seasonKeepers(seasonId: string): Promise<KeeperRow[]> {
  const rows = await db
    .select({
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      playerId: players.id,
      name: players.name,
      teamId: players.teamId,
      teamName: teams.name,
      position: players.position,
    })
    .from(playerMatchStats)
    .innerJoin(matches, eq(playerMatchStats.matchId, matches.id))
    .innerJoin(sessions, eq(matches.sessionId, sessions.id))
    .innerJoin(players, eq(playerMatchStats.playerId, players.id))
    .leftJoin(teams, eq(players.teamId, teams.id))
    .where(
      and(
        eq(sessions.seasonId, seasonId),
        eq(matches.status, "completed"),
        eq(playerMatchStats.played, true),
      ),
    );

  const byKeeper = new Map<string, KeeperRow>();
  for (const r of rows) {
    if (!isKeeperPosition(r.position)) continue;
    if (r.homeScore === null || r.awayScore === null) continue;
    const conceded =
      r.teamId === r.homeTeamId
        ? r.awayScore
        : r.teamId === r.awayTeamId
          ? r.homeScore
          : null;
    if (conceded === null) continue; // keeper's team wasn't in this match
    const row =
      byKeeper.get(r.playerId) ??
      { playerId: r.playerId, name: r.name, teamName: r.teamName, matches: 0, conceded: 0, cleanSheets: 0, gaPerGame: 0 };
    row.matches += 1;
    row.conceded += conceded;
    if (conceded === 0) row.cleanSheets += 1;
    byKeeper.set(r.playerId, row);
  }

  return [...byKeeper.values()]
    .map((k) => ({ ...k, gaPerGame: k.matches ? k.conceded / k.matches : 0 }))
    .sort(
      (a, b) =>
        a.gaPerGame - b.gaPerGame ||
        b.cleanSheets - a.cleanSheets ||
        b.matches - a.matches ||
        a.name.localeCompare(b.name),
    );
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
  keepers: KeeperRow[],
): Promise<SeasonAwards> {
  // Names for whichever players the awards point at (auto picks are already in
  // `scorers`, but admin overrides/picks may not be — fetch them all to be safe).
  const topScorerAuto = scorers.find((s) => s.goals > 0) ?? null;
  const topScorerId = season.topScorerId ?? topScorerAuto?.playerId ?? null;
  // Best GK auto = the keeper with the best defensive record (already sorted).
  const bestGkAuto = keepers[0] ?? null;
  const bestGkId = season.bestGkId ?? bestGkAuto?.playerId ?? null;
  const ids = [topScorerId, season.playerOfSeasonId, bestGkId].filter(
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
    bestGk: (() => {
      const player = nameOf(bestGkId);
      if (!player) return null;
      const rec = keepers.find((k) => k.playerId === bestGkId) ?? null;
      return {
        player,
        cleanSheets: rec?.cleanSheets ?? 0,
        conceded: rec?.conceded ?? 0,
        matches: rec?.matches ?? 0,
        auto: !season.bestGkId,
      };
    })(),
  };
}

export type SeasonView = Awaited<ReturnType<typeof getSeasonView>>;

// Everything the league page renders for one season: standings, matchdays,
// scorers, fair-play and resolved awards. Read-only — used by both the in-app
// and the public page.
export const getSeasonView = cache(async (season: Season) => {
  const [sportTeams, matchdays, scorers, keepers] = await Promise.all([
    db.query.teams.findMany({ where: eq(teams.sportId, season.sportId) }),
    getSeasonMatchdays(season.id),
    seasonScorers(season.id),
    seasonKeepers(season.id),
  ]);

  const internalTeams = sportTeams.filter((t) => t.kind !== "external");
  const leagueMatches = matchdays.flatMap((m) => m.fixtures);
  const standings = computeStandings(internalTeams, leagueMatches);

  // Team discipline, only for teams that have actually played. A player's fouls
  // fall to their current roster team (rosters are stable within a season).
  const playedTeamIds = new Set(standings.filter((r) => r.played > 0).map((r) => r.teamId));
  const disc = new Map<string, FairplayRow>(
    internalTeams
      .filter((t) => playedTeamIds.has(t.id))
      .map((t) => [t.id, { teamId: t.id, teamName: t.name, fouls: 0, points: 0 }]),
  );
  for (const s of scorers) {
    if (!s.teamId) continue;
    const row = disc.get(s.teamId);
    if (!row) continue;
    row.fouls += s.fouls;
    row.points += s.fouls;
  }
  const fairplay = [...disc.values()].sort(
    (a, b) => a.points - b.points || a.teamName.localeCompare(b.teamName),
  );

  const awards = await resolveAwards(season, scorers, fairplay, keepers);
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
    keepers,
    awards,
    champion,
  };
});
