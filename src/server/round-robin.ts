export type PlannedFixture = {
  homeTeamId: string;
  awayTeamId: string;
  offsetMin: number; // minutes after the slot start
  durationMin: number;
  breakMin: number;
  orderIndex: number;
};

// Round-robin among 3 teams: 3 games of 25 min + 5 min break, staggered 30 min
// apart to fit a 90-min slot.
//
// With 3 teams / 3 games one team unavoidably plays two games back-to-back, so
// there are three "rest roles" each matchday:
//   • rest-in-middle — plays games 1 & 3 (a break between; the easy draw)
//   • early back-to-back — plays games 1 & 2
//   • late back-to-back — plays games 2 & 3 (the hardest — no warm-up, tired end)
// A fixed pairing order would hand the same team the easy draw every week. We
// instead rotate by matchday index so the roles cycle through all three teams:
// over any 3 matchdays each team gets each role exactly once (a Latin square),
// so rest is shared equally instead of the standings leader always benefiting.
export function threeTeamRoundRobin(ids: string[], matchdayIndex = 0): PlannedFixture[] {
  const m = (((matchdayIndex % 3) + 3) % 3); // rest-in-middle team for this matchday
  const early = (m + 1) % 3; // early back-to-back
  const late = (m + 2) % 3; // late back-to-back
  // G1: middle vs early · G2: early vs late · G3: late vs middle
  const pairs: [number, number][] = [
    [m, early],
    [early, late],
    [late, m],
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
