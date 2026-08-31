// Pure scoring logic for the live match timeline — no DB, so it stays testable
// (see scripts/check-match-scoring.ts). Both the score sync and the finalize
// rollup in src/server/actions/match-events.ts go through here.

export type ScoringEvent = {
  kind: string; // "goal" | "save"
  teamId: string | null;
  playerId: string;
  assistPlayerId: string | null;
};

export type PlayerTally = {
  playerId: string;
  goals: number;
  assists: number;
  saves: number;
  tackles: number;
  clearances: number;
  goalkeeper: boolean;
  played: true;
};

// Goals logged for each side become the live score.
export function deriveScore(
  events: ScoringEvent[],
  homeTeamId: string | null,
  awayTeamId: string | null,
): { homeScore: number; awayScore: number } {
  let homeScore = 0;
  let awayScore = 0;
  for (const e of events) {
    if (e.kind !== "goal") continue;
    if (e.teamId && e.teamId === homeTeamId) homeScore++;
    else if (e.teamId && e.teamId === awayTeamId) awayScore++;
  }
  return { homeScore, awayScore };
}

// Roll the timeline into one aggregate row per involved player: goal → scorer +1
// goal and assister +1 assist; save → keeper +1 save and flagged as goalkeeper.
// Anyone appearing on the timeline is marked played.
export function tallyEvents(events: ScoringEvent[]): PlayerTally[] {
  const byPlayer = new Map<string, PlayerTally>();
  const bump = (id: string, patch: Partial<PlayerTally>) => {
    const t =
      byPlayer.get(id) ??
      ({ playerId: id, goals: 0, assists: 0, saves: 0, tackles: 0, clearances: 0, goalkeeper: false, played: true } as PlayerTally);
    byPlayer.set(id, {
      ...t,
      goals: t.goals + (patch.goals ?? 0),
      assists: t.assists + (patch.assists ?? 0),
      saves: t.saves + (patch.saves ?? 0),
      tackles: t.tackles + (patch.tackles ?? 0),
      clearances: t.clearances + (patch.clearances ?? 0),
      goalkeeper: t.goalkeeper || Boolean(patch.goalkeeper),
    });
  };
  for (const e of events) {
    if (e.kind === "goal") {
      bump(e.playerId, { goals: 1 });
      if (e.assistPlayerId) bump(e.assistPlayerId, { assists: 1 });
    } else if (e.kind === "save") {
      bump(e.playerId, { saves: 1, goalkeeper: true });
    } else if (e.kind === "tackle") {
      bump(e.playerId, { tackles: 1 });
    } else if (e.kind === "clearance") {
      bump(e.playerId, { clearances: 1 });
    }
  }
  return [...byPlayer.values()];
}
