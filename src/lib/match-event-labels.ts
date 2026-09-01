// Display icon + text for each live match-event kind, shared by the scorecard
// console and the read-only timelines so they never drift apart.
export const MATCH_EVENT_LABELS: Record<string, { icon: string; text: string }> = {
  goal: { icon: "⚽", text: "Goal" },
  own_goal: { icon: "🥅", text: "Own goal" },
  save: { icon: "🧤", text: "Save" },
  tackle: { icon: "🛡️", text: "Tackle" },
  clearance: { icon: "🧹", text: "Clearance" },
};

export const eventLabel = (kind: string) =>
  MATCH_EVENT_LABELS[kind] ?? { icon: "•", text: kind };
