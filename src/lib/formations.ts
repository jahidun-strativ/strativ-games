// Strativ plays small- and large-sided games, so lineups range from 5 to 11
// players (goalkeeper included) with 1–5 substitutes on the bench.
//
// Coordinates are percentages on a vertical pitch: x 0–100 (left→right),
// y 0–100 (own goal at bottom → opponent goal at top).
export type FormationSlot = { position: string; x: number; y: number };

export const MIN_SQUAD = 5;
export const MAX_SQUAD = 11;
export const SQUAD_SIZES = [5, 6, 7, 8, 9, 10, 11];

export const MIN_SUBS = 1;
export const MAX_SUBS = 5;
export const DEFAULT_SUBS = 3;

// Formation strings are the OUTFIELD lines from defense → attack; the
// goalkeeper is implicit. Keyed by total squad size (GK included).
export const FORMATIONS_BY_SIZE: Record<number, string[]> = {
  5: ["2-2", "1-2-1", "2-1-1", "1-1-2"],
  6: ["2-2-1", "1-2-2", "2-1-2", "3-2"],
  7: ["2-3-1", "3-2-1", "2-1-3", "3-1-2", "2-2-2"],
  8: ["3-3-1", "3-2-2", "2-3-2", "3-1-3"],
  9: ["3-3-2", "3-2-3", "4-3-1", "3-4-1"],
  10: ["4-3-2", "3-4-2", "4-4-1", "3-3-3"],
  11: ["4-4-2", "4-3-3", "3-5-2", "4-2-3-1", "5-3-2"],
};

export const ALL_FORMATIONS = Object.values(FORMATIONS_BY_SIZE).flat();
export const FORMATION_KEYS = ALL_FORMATIONS; // back-compat alias

// Strativ mostly plays small-sided games, so a fresh lineup builds up at
// 6-a-side (2 DEF, 2 MID, 1 FWD + GK) rather than a full 11.
export const DEFAULT_FORMATION = "2-2-1";

// Total players (GK included) implied by a formation string.
export function formationSize(formation: string): number {
  return 1 + formation.split("-").reduce((sum, n) => sum + (parseInt(n, 10) || 0), 0);
}

export function squadSizeOf(formation: string): number {
  return formationSize(formation);
}

export function formationsForSize(size: number): string[] {
  return FORMATIONS_BY_SIZE[size] ?? FORMATIONS_BY_SIZE[MAX_SQUAD];
}

// Generate on-pitch slot coordinates for any formation string.
export function buildFormationSlots(formation: string): FormationSlot[] {
  const lines = formation.split("-").map((n) => parseInt(n, 10) || 0);
  const slots: FormationSlot[] = [{ position: "GK", x: 50, y: 92 }];
  const lineCount = lines.length;

  lines.forEach((count, i) => {
    // Defense line sits near y=74, attack near y=20.
    const y = lineCount === 1 ? 32 : 74 - (i * (74 - 20)) / (lineCount - 1);
    const role = i === 0 ? "DEF" : i === lineCount - 1 ? "FWD" : "MID";
    for (let j = 0; j < count; j++) {
      const x = count === 1 ? 50 : 15 + (j * (85 - 15)) / (count - 1);
      slots.push({ position: role, x, y });
    }
  });

  return slots;
}
