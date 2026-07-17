// The cost split for a booked slot is derived, not hand-managed: it's exactly
// the players who PLAYED any of the slot's fixtures (playerMatchStats.played).
// sessionPayments no longer defines who's in the split — it only records who has
// settled up. So editing a match squad / result flows straight through to costs.

export type SessionPayer = { id: string; name: string; paid: boolean };

// A slot's total bill = the booking cost plus any additional charges. Every
// cost calculation (split per-head, totals, outstanding) should use this.
export function slotTotal(s: { cost: number | null; extraCost: number | null }): number {
  return (s.cost ?? 0) + (s.extraCost ?? 0);
}

type StatRow = {
  playerId: string;
  played: boolean;
  player: { name: string } | null;
};
type FixtureRow = { playerStats: StatRow[] };
type PaymentRow = { playerId: string; paid: boolean };

// Union of players marked "played" across all fixtures, with paid status pulled
// from any existing sessionPayments row (default: unpaid). Sorted by name.
export function deriveSessionPayers(
  fixtures: FixtureRow[],
  payments: PaymentRow[],
): SessionPayer[] {
  const paidById = new Map(payments.map((p) => [p.playerId, p.paid]));
  const nameById = new Map<string, string>();
  for (const f of fixtures) {
    for (const st of f.playerStats) {
      if (st.played && st.player) nameById.set(st.playerId, st.player.name);
    }
  }
  return [...nameById.entries()]
    .map(([id, name]) => ({ id, name, paid: paidById.get(id) ?? false }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
