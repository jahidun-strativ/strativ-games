import type { Match, Team } from "@/db/schema";

export type StandingsRow = {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
};

export function computeStandings(teams: Team[], matches: Match[]): StandingsRow[] {
  const table = new Map<string, StandingsRow>(
    teams.map((t) => [
      t.id,
      {
        teamId: t.id,
        teamName: t.name,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        points: 0,
      },
    ]),
  );

  for (const m of matches) {
    if (m.status !== "completed" || m.homeScore === null || m.awayScore === null) continue;
    if (!m.homeTeamId || !m.awayTeamId) continue;
    const home = table.get(m.homeTeamId);
    const away = table.get(m.awayTeamId);
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.goalsFor += m.homeScore;
    home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore;
    away.goalsAgainst += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if (m.homeScore < m.awayScore) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
      home.points++;
      away.points++;
    }
  }

  return finalize(table);
}

// Each internal team's own W/D/L in competitive matches. Unlike the internal
// league table, only one side needs to be in the table (the opponent is
// external and simply ignored in the standings).
export function computeCompetitiveRecord(teams: Team[], matches: Match[]): StandingsRow[] {
  const table = newTable(teams);

  for (const m of matches) {
    if (m.status !== "completed" || m.homeScore === null || m.awayScore === null) continue;
    const sides = [
      { id: m.homeTeamId, gf: m.homeScore, ga: m.awayScore },
      { id: m.awayTeamId, gf: m.awayScore, ga: m.homeScore },
    ];
    for (const s of sides) {
      if (!s.id) continue;
      const row = table.get(s.id);
      if (!row) continue; // external side — not tracked as a Strativ team
      row.played++;
      row.goalsFor += s.gf;
      row.goalsAgainst += s.ga;
      if (s.gf > s.ga) {
        row.won++;
        row.points += 3;
      } else if (s.gf < s.ga) {
        row.lost++;
      } else {
        row.drawn++;
        row.points++;
      }
    }
  }

  return finalize(table).filter((r) => r.played > 0);
}

function newTable(teams: Team[]) {
  return new Map<string, StandingsRow>(
    teams.map((t) => [
      t.id,
      {
        teamId: t.id,
        teamName: t.name,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        points: 0,
      },
    ]),
  );
}

function finalize(table: Map<string, StandingsRow>): StandingsRow[] {
  const rows = [...table.values()];
  for (const r of rows) r.goalDiff = r.goalsFor - r.goalsAgainst;
  rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDiff - a.goalDiff ||
      b.goalsFor - a.goalsFor ||
      a.teamName.localeCompare(b.teamName),
  );
  return rows;
}
