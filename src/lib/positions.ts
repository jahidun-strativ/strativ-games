// Canonical football positions, grouped defence → attack, so a player's position
// is a fixed vocabulary instead of free text. "GK" stays detectable by the
// "gk"/"keeper" check that drives goalkeeper stats (see season queries).
export const POSITION_GROUPS = [
  { label: "Goalkeeper", positions: [["GK", "Goalkeeper"]] },
  {
    label: "Defence",
    positions: [
      ["RB", "Right back"],
      ["CB", "Centre back"],
      ["LB", "Left back"],
      ["RWB", "Right wing-back"],
      ["LWB", "Left wing-back"],
    ],
  },
  {
    label: "Midfield",
    positions: [
      ["CDM", "Defensive mid"],
      ["CM", "Central mid"],
      ["CAM", "Attacking mid"],
      ["RM", "Right mid"],
      ["LM", "Left mid"],
    ],
  },
  {
    label: "Attack",
    positions: [
      ["RW", "Right wing"],
      ["LW", "Left wing"],
      ["CF", "Centre forward"],
      ["ST", "Striker"],
    ],
  },
] as const;

// antd Select option groups: "GK · Goalkeeper" etc.
export const POSITION_OPTIONS = POSITION_GROUPS.map((g) => ({
  label: g.label,
  options: g.positions.map(([value, name]) => ({ value, label: `${value} · ${name}` })),
}));

export const POSITIONS: string[] = POSITION_GROUPS.flatMap((g) => g.positions.map(([v]) => v));

// Defence codes (RB/CB/LB/RWB/LWB) — used to gate the defender-only match stats
// (tackles & clearances) and the Top defenders board. Matches the position code
// case-insensitively; free-text positions outside the vocabulary count as false.
const DEFENDER_CODES = new Set(
  (POSITION_GROUPS.find((g) => g.label === "Defence")?.positions ?? []).map(([v]) =>
    v.toLowerCase(),
  ),
);
export function isDefender(position: string | null | undefined): boolean {
  return DEFENDER_CODES.has((position ?? "").trim().toLowerCase());
}
