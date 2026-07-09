import Link from "next/link";
import type { LeaderboardRow } from "@/server/queries/stats";

export function MonthlyRace({
  title,
  metricLabel,
  metric,
  rows,
}: {
  title: string;
  metricLabel: string;
  metric: (r: LeaderboardRow) => number;
  rows: LeaderboardRow[];
}) {
  return (
    <div>
      <h3 className="font-display mb-3 text-lg text-ink-900">{title}</h3>
      <div className="tv-card overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-ink-500">No {metricLabel} this month yet.</p>
        ) : (
          <ul>
            {rows.map((row, i) => (
              <li
                key={row.playerId}
                className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
              >
                <span
                  className={`scoreboard flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    i === 0 ? "bg-gold-300 text-black" : "bg-cream-200"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/players/${row.playerId}`}
                    className="block truncate font-bold hover:text-burnt-400"
                  >
                    {row.name}
                  </Link>
                  <p className="truncate text-xs text-ink-500">
                    {row.teamName ?? "Free agent"} · {row.position}
                  </p>
                </div>
                <span className="text-right">
                  <span className="scoreboard block text-lg font-bold leading-none text-burnt-400">
                    {metric(row)}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                    {metricLabel}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
