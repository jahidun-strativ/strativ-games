import assert from "node:assert/strict";
import { deriveScore, tallyEvents, type ScoringEvent } from "../src/lib/match-scoring";

// Self-check for the live-scorecard scoring math. Run: npx tsx scripts/check-match-scoring.ts
const H = "home";
const A = "away";
const events: ScoringEvent[] = [
  { kind: "goal", teamId: H, playerId: "p1", assistPlayerId: "p2" }, // p1 scores, p2 assists
  { kind: "goal", teamId: H, playerId: "p1", assistPlayerId: null }, // p1 scores again, no assist
  { kind: "goal", teamId: A, playerId: "p3", assistPlayerId: "p1" }, // away goal, p1 assists
  { kind: "save", teamId: H, playerId: "gk", assistPlayerId: null }, // keeper save
  { kind: "save", teamId: H, playerId: "gk", assistPlayerId: null }, // keeper save
  { kind: "tackle", teamId: H, playerId: "def", assistPlayerId: null }, // defender tackle
  { kind: "tackle", teamId: H, playerId: "def", assistPlayerId: null }, // defender tackle
  { kind: "clearance", teamId: H, playerId: "def", assistPlayerId: null }, // defender clearance
  { kind: "own_goal", teamId: H, playerId: "og1", assistPlayerId: null }, // home OG → away scores
];

// Score = goals per side; an own goal by home credits away.
assert.deepEqual(deriveScore(events, H, A), { homeScore: 2, awayScore: 2 });
// A goal for a side not in the match counts for neither.
assert.deepEqual(deriveScore(events, "x", "y"), { homeScore: 0, awayScore: 0 });

const tally = Object.fromEntries(tallyEvents(events).map((t) => [t.playerId, t]));
assert.equal(tally.p1.goals, 2, "p1 scored twice");
assert.equal(tally.p1.assists, 1, "p1 assisted the away goal");
assert.equal(tally.p2.assists, 1, "p2 assisted once");
assert.equal(tally.p2.goals, 0, "p2 scored none");
assert.equal(tally.p3.goals, 1, "p3 scored once");
assert.equal(tally.gk.saves, 2, "keeper made two saves");
assert.equal(tally.gk.goalkeeper, true, "a player with a save is flagged keeper");
assert.equal(tally.def.tackles, 2, "defender made two tackles");
assert.equal(tally.def.clearances, 1, "defender made one clearance");
assert.equal(tally.def.goalkeeper, false, "a tackler is not flagged keeper");
assert.equal(tally.og1.goals, 0, "an own goal is not a personal goal");
assert.equal(tally.og1.played, true, "the own-goal scorer still played");
assert.equal(tally.p1.played, true, "everyone on the timeline played");
// Six distinct players touched the timeline.
assert.equal(tallyEvents(events).length, 6);
// Empty timeline yields no rows and a goalless score.
assert.equal(tallyEvents([]).length, 0);
assert.deepEqual(deriveScore([], H, A), { homeScore: 0, awayScore: 0 });

console.log("check-match-scoring: all assertions passed");
