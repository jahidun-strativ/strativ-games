export type PlannedFixture = {
  homeTeamId: string;
  awayTeamId: string;
  offsetMin: number; // minutes after the slot start
  durationMin: number;
  breakMin: number;
  orderIndex: number;
};

// Round-robin among 3 teams: A–B, A–C, B–C, each 25 min + 5 min break,
// staggered 30 min apart so they fit a 90-min slot.
// ponytail: fixed home/away per pairing (repeats each matchday); alternate only
// if a league complains about who's nominally "home".
export function threeTeamRoundRobin(ids: string[]): PlannedFixture[] {
  const pairs: [number, number][] = [
    [0, 1],
    [0, 2],
    [1, 2],
  ];
  return pairs.map(([h, a], i) => ({
    homeTeamId: ids[h],
    awayTeamId: ids[a],
    offsetMin: i * 30,
    durationMin: 25,
    breakMin: 5,
    orderIndex: i,
  }));
}
