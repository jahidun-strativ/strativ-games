import assert from "node:assert";
import { playerLedger } from "@/server/queries/session-costs";
import { tallyKeeperMatches } from "@/lib/match-scoring";

// Two self-paid slots + one office-paid. Player "a" played all three; paid the
// first, not the second. Office slot must not affect spent or due.
const stat = (id: string, played = true) => ({ playerId: id, played, player: { name: id } });
const slots = [
  {
    cost: 900, extraCost: null, paidBy: "self",
    fixtures: [{ playerStats: [stat("a"), stat("b"), stat("c")] }], // perHead 300
    payments: [{ playerId: "a", paid: true }],
  },
  {
    cost: 400, extraCost: 100, paidBy: "self",
    fixtures: [{ playerStats: [stat("a"), stat("b")] }], // total 500, perHead 250
    payments: [], // a unpaid
  },
  {
    cost: 1000, extraCost: null, paidBy: "office",
    fixtures: [{ playerStats: [stat("a")] }], // office pays — ignored
    payments: [],
  },
];

const a = playerLedger("a", slots);
assert.strictEqual(a.spent, 300, `a.spent ${a.spent}`);
assert.strictEqual(a.due, 250, `a.due ${a.due}`);

// "c" only played the first slot, unpaid → owes 300, spent 0.
const c = playerLedger("c", slots);
assert.strictEqual(c.spent, 0, `c.spent ${c.spent}`);
assert.strictEqual(c.due, 300, `c.due ${c.due}`);

// A player who never played owes nothing.
const z = playerLedger("z", slots);
assert.deepStrictEqual(z, { spent: 0, due: 0 });

// Keeper tally: team "home" kept 3 matches — a shutout (0 conceded, 4 saves),
// a 2-goal concede (2 saves), and an away fixture they conceded 1 (5 saves).
// A voided match (null score) is skipped; a match their team wasn't in is skipped.
const km = tallyKeeperMatches("home", [
  { homeTeamId: "home", awayTeamId: "x", homeScore: 1, awayScore: 0, saves: 4 }, // clean sheet
  { homeTeamId: "home", awayTeamId: "x", homeScore: 3, awayScore: 2, saves: 2 },
  { homeTeamId: "x", awayTeamId: "home", homeScore: 1, awayScore: 1, saves: 5 }, // away, conceded 1
  { homeTeamId: "home", awayTeamId: "x", homeScore: null, awayScore: null, saves: 9 }, // voided
  { homeTeamId: "p", awayTeamId: "q", homeScore: 0, awayScore: 0, saves: 9 }, // not their match
]);
assert.strictEqual(km.kept, 3, `kept ${km.kept}`);
assert.strictEqual(km.saves, 11, `saves ${km.saves}`);
assert.strictEqual(km.cleanSheets, 1, `cleanSheets ${km.cleanSheets}`);

console.log("check-player-ledger OK");
