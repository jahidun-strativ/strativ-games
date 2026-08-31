import { dayBadge } from "@/lib/format";

// An animated "Today" / "Tomorrow" pill for imminent fixtures. Today pulses in
// live red; tomorrow sits in a calmer gold. Renders nothing for other days.
export function DayBadge({ at, now }: { at: Date; now?: Date }) {
  const label = dayBadge(at, now);
  if (!label) return null;
  const today = label === "Today";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
        today ? "bg-tvred-500/15 text-tvred-600" : "bg-gold-400/20 text-gold-500"
      }`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {today ? (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-tvred-500 opacity-75" />
        ) : null}
        <span
          className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
            today ? "bg-tvred-500" : "bg-gold-400"
          }`}
        />
      </span>
      {label}
    </span>
  );
}
