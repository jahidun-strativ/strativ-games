// Slot coordinates are percentages on a vertical pitch: x 0–100 (left→right),
// y 0–100 (own goal at bottom → opponent goal at top).
export type FormationSlot = { position: string; x: number; y: number };

export const FORMATIONS: Record<string, { label: string; slots: FormationSlot[] }> = {
  "4-4-2": {
    label: "4-4-2 Classic",
    slots: [
      { position: "GK", x: 50, y: 92 },
      { position: "RB", x: 85, y: 72 },
      { position: "CB", x: 63, y: 76 },
      { position: "CB", x: 37, y: 76 },
      { position: "LB", x: 15, y: 72 },
      { position: "RM", x: 85, y: 46 },
      { position: "CM", x: 62, y: 50 },
      { position: "CM", x: 38, y: 50 },
      { position: "LM", x: 15, y: 46 },
      { position: "ST", x: 62, y: 20 },
      { position: "ST", x: 38, y: 20 },
    ],
  },
  "4-3-3": {
    label: "4-3-3 Attack",
    slots: [
      { position: "GK", x: 50, y: 92 },
      { position: "RB", x: 85, y: 72 },
      { position: "CB", x: 63, y: 76 },
      { position: "CB", x: 37, y: 76 },
      { position: "LB", x: 15, y: 72 },
      { position: "CM", x: 72, y: 50 },
      { position: "CM", x: 50, y: 54 },
      { position: "CM", x: 28, y: 50 },
      { position: "RW", x: 80, y: 22 },
      { position: "ST", x: 50, y: 16 },
      { position: "LW", x: 20, y: 22 },
    ],
  },
  "3-5-2": {
    label: "3-5-2 Wingbacks",
    slots: [
      { position: "GK", x: 50, y: 92 },
      { position: "CB", x: 72, y: 76 },
      { position: "CB", x: 50, y: 79 },
      { position: "CB", x: 28, y: 76 },
      { position: "RWB", x: 88, y: 52 },
      { position: "CM", x: 66, y: 50 },
      { position: "CM", x: 50, y: 56 },
      { position: "CM", x: 34, y: 50 },
      { position: "LWB", x: 12, y: 52 },
      { position: "ST", x: 62, y: 20 },
      { position: "ST", x: 38, y: 20 },
    ],
  },
  "4-2-3-1": {
    label: "4-2-3-1 Modern",
    slots: [
      { position: "GK", x: 50, y: 92 },
      { position: "RB", x: 85, y: 72 },
      { position: "CB", x: 63, y: 76 },
      { position: "CB", x: 37, y: 76 },
      { position: "LB", x: 15, y: 72 },
      { position: "DM", x: 62, y: 56 },
      { position: "DM", x: 38, y: 56 },
      { position: "RAM", x: 78, y: 34 },
      { position: "CAM", x: 50, y: 36 },
      { position: "LAM", x: 22, y: 34 },
      { position: "ST", x: 50, y: 14 },
    ],
  },
  "5-3-2": {
    label: "5-3-2 Fortress",
    slots: [
      { position: "GK", x: 50, y: 92 },
      { position: "RWB", x: 88, y: 66 },
      { position: "CB", x: 68, y: 76 },
      { position: "CB", x: 50, y: 79 },
      { position: "CB", x: 32, y: 76 },
      { position: "LWB", x: 12, y: 66 },
      { position: "CM", x: 66, y: 46 },
      { position: "CM", x: 50, y: 52 },
      { position: "CM", x: 34, y: 46 },
      { position: "ST", x: 62, y: 20 },
      { position: "ST", x: 38, y: 20 },
    ],
  },
};

export const FORMATION_KEYS = Object.keys(FORMATIONS);
