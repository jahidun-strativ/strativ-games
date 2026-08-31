import { cache } from "react";
import { and, asc, count, desc, eq, inArray, sum } from "drizzle-orm";
import { db } from "@/db";
import { matches, playerMatchStats, players, seasons, sessions, teams } from "@/db/schema";
import { computeStandings, type StandingsRow } from "@/server/queries/standings";
import { isDefender } from "@/lib/positions";
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
  tackles: number;
  clearances: number;
  appearances: number;
};

// Fair play = fewest fouls. points === fouls (kept for the table's "Pts" column).
export type FairplayRow = { teamId: string; teamName: string; fouls: number; points: number };

// A goalkeeper's defensive record: goals conceded while they were on the pitch,
// clean sheets and matches kept. Best GK = highest rating (see GK_WEIGHTS).
export type KeeperRow = {
  playerId: string;
  name: string;
  teamName: string | null;
  matches: number;
  conceded: number;
  cleanSheets: number;
  saves: number;
  gaPerGame: number;
  // Overall goalkeeper rating that drives the ranking (see gkScore).
  score: number;
  // Played enough of the tournament to qualify for the Best GK award.
  eligible: boolean;
};

// GK rating = reward shutouts & shot-stopping & availability, punish conceding.
// Kept as plain integer weights so the formula shown to users matches exactly.
export const GK_WEIGHTS = { cleanSheet: 4, save: 1, appearance: 1, conceded: 2 } as const;
export function gkScore(k: {
  cleanSheets: number;
  saves: number;
  matches: number;
  conceded: number;
}): number {
  return (
    k.cleanSheets * GK_WEIGHTS.cleanSheet +
    k.saves * GK_WEIGHTS.save +
    k.matches * GK_WEIGHTS.appearance -
    k.conceded * GK_WEIGHTS.conceded
  );
}

// Top-defender rating from live defensive events. A tackle (winning the ball) is
// weighted above a clearance (hoofing it away). Plain integer weights so the
// formula shown to users matches exactly.
export const DEF_WEIGHTS = { tackle: 2, clearance: 1 } as const;
export function defScore(d: { tackles: number; clearances: number }): number {
  return d.tackles * DEF_WEIGHTS.tackle + d.clearances * DEF_WEIGHTS.clearance;
}

type AwardPlayer = { id: string; name: string; teamName: string | null };

export type SeasonAwards = {
  topScorer: { player: AwardPlayer; goals: number; auto: boolean } | null;
  fairplay: { teamId: string; teamName: string; points: number; auto: boolean } | null;
  playerOfSeason: AwardPlayer | null;
  bestGk: { player: AwardPlayer; cleanSheets: number; conceded: number; saves: number; matches: number; auto: boolean } | null;
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
      tackles: sum(playerMatchStats.tackles).mapWith(Number),
      clearances: sum(playerMatchStats.clearances).mapWith(Number),
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
// add a floor only if a keeper games the table by playing once. If a match flags
// two keepers for one team (a sub), both are credited the full conceded — we
// don't track minutes; split only if that ever matters.
type RawKeeper = Omit<KeeperRow, "eligible">;

async function seasonKeepers(seasonId: string): Promise<RawKeeper[]> {
  const rows = await db
    .select({
      matchId: matches.id,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      playerId: players.id,
      name: players.name,
      teamId: players.teamId,
      teamName: teams.name,
      position: players.position,
      // The team's default GKs; used only when a match names no keeper.
      teamGkIds: teams.goalkeeperIds,
      // Whether this player was flagged as keeper in THIS match, and their saves.
      keeperFlag: playerMatchStats.goalkeeper,
      saves: playerMatchStats.saves,
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

  type Row = (typeof rows)[number];
  // Group the played players by match+team so we can resolve one team's keeper(s)
  // per match with a clear priority: per-match GK flag → team default → position.
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    if (!r.teamId) continue;
    const key = `${r.matchId}::${r.teamId}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(r);
  }

  const byKeeper = new Map<string, RawKeeper>();
  for (const group of groups.values()) {
    const g = group[0];
    if (g.homeScore === null || g.awayScore === null) continue;
    const conceded =
      g.teamId === g.homeTeamId
        ? g.awayScore
        : g.teamId === g.awayTeamId
          ? g.homeScore
          : null;
    if (conceded === null) continue; // team wasn't in this match

    const flagged = group.filter((r) => r.keeperFlag);
    const keepers =
      flagged.length > 0
        ? flagged
        : g.teamGkIds && g.teamGkIds.length > 0
          ? group.filter((r) => g.teamGkIds!.includes(r.playerId))
          : group.filter((r) => isKeeperPosition(r.position));

    for (const k of keepers) {
      const row =
        byKeeper.get(k.playerId) ??
        { playerId: k.playerId, name: k.name, teamName: k.teamName, matches: 0, conceded: 0, cleanSheets: 0, saves: 0, gaPerGame: 0, score: 0 };
      row.matches += 1;
      row.conceded += conceded;
      row.saves += k.saves;
      if (conceded === 0) row.cleanSheets += 1;
      byKeeper.set(k.playerId, row);
    }
  }

  return [...byKeeper.values()]
    .map((k) => ({
      ...k,
      gaPerGame: k.matches ? k.conceded / k.matches : 0,
      score: gkScore(k),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.gaPerGame - b.gaPerGame ||
        b.cleanSheets - a.cleanSheets ||
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
  minGkMatches: number,
): Promise<SeasonAwards> {
  // Names for whichever players the awards point at (auto picks are already in
  // `scorers`, but admin overrides/picks may not be — fetch them all to be safe).
  const topScorerAuto = scorers.find((s) => s.goals > 0) ?? null;
  const topScorerId = season.topScorerId ?? topScorerAuto?.playerId ?? null;
  // Best GK is an END-OF-SEASON award: only auto-picked once the season is
  // ended, so a mid-season leader on a small sample never gets crowned. Among
  // keepers who kept at least half the tournament, best defensive record wins
  // (keepers is pre-sorted best-first). An admin pick still shows any time.
  const bestGkAuto =
    season.status === "ended"
      ? keepers.find((k) => k.matches >= minGkMatches) ?? null
      : null;
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
        saves: rec?.saves ?? 0,
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

  const playedMatchdays = matchdays.filter(
    (m) => m.fixtures.length > 0 && m.fixtures.every((f) => f.status !== "scheduled"),
  ).length;
  // "Half the tournament" in games: each team plays 2 games per matchday, so half
  // of a full keeper's games ≈ the number of completed matchdays. A GK must reach
  // this to win Best GK (guards against a lucky one-match clean sheet topping it).
  const gkFloor = playedMatchdays;
  const rankedKeepers: KeeperRow[] = keepers
    .map((k) => ({ ...k, eligible: k.matches >= gkFloor }))
    // Eligible keepers first; the raw list is already sorted by defensive record,
    // and the sort is stable, so order within each group is preserved.
    .sort((a, b) => Number(b.eligible) - Number(a.eligible));

  // Top defenders: defenders (by position) with any tackle/clearance credit,
  // ranked by defensive rating. Only defenders earn these — never other players.
  const defenders = scorers
    .filter((s) => isDefender(s.position) && s.tackles + s.clearances > 0)
    .map((s) => ({ ...s, score: defScore(s) }))
    .sort((a, b) => b.score - a.score || b.tackles - a.tackles || a.name.localeCompare(b.name));

  const awards = await resolveAwards(season, scorers, fairplay, rankedKeepers, gkFloor);
  const champion: StandingsRow | null =
    season.status === "ended" && standings[0]?.played > 0 ? standings[0] : null;

  return {
    season,
    teams: internalTeams,
    standings,
    matchdays,
    playedMatchdays,
    scorers,
    defenders,
    fairplay,
    keepers: rankedKeepers,
    gkFloor,
    awards,
    champion,
  };
});
