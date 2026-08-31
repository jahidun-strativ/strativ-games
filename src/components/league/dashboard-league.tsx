import Link from "next/link";
import { Trophy } from "lucide-react";
import { FixtureRow } from "@/components/league/season-board";
import { StandingsTable } from "@/components/tables/standings-table";
import { matchdayLabel, formatDate } from "@/lib/format";
import type { SeasonView } from "@/server/queries/season";

// Compact league snapshot for the dashboard: the CURRENT matchday's fixtures
// (the first matchday still holding a scheduled game, else the last one) plus a
// live standings table. Keeps the league visible without opening /league.
export function DashboardLeague({ view }: { view: SeasonView }) {
  const { season, matchdays, standings, playedMatchdays } = view;

  const currentIdx = matchdays.findIndex((m) => m.fixtures.some((f) => f.status === "scheduled"));
  const current = currentIdx >= 0 ? matchdays[currentIdx] : (matchdays[matchdays.length - 1] ?? null);
  const currentIndex = currentIdx >= 0 ? currentIdx : matchdays.length - 1;
  const hasResults = standings.some((r) => r.played > 0);

  return (
    <section>
      <div className="mb-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <Trophy className="h-5 w-5 shrink-0 text-gold-300" />
          <h2 className="font-display min-w-0 text-lg leading-tight text-ink-900 sm:text-xl">
            {season.name}
          </h2>
          <span className="shrink-0 rounded bg-cream-200 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-ink-700">
            MD {Math.min(currentIndex + 1, season.plannedMatchdays)}/{season.plannedMatchdays}
          </span>
        </div>
        <Link
          href="/league"
          className="mt-1 inline-block text-sm font-bold text-burnt-400 hover:underline"
        >
          League table &amp; awards →
        </Link>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        {/* Current matchday */}
        <div className="tv-card-sm min-w-0 overflow-hidden">
          <div className="flex items-baseline justify-between gap-x-3 border-b border-line bg-cream-100 px-3 py-2">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-700">
              {current ? matchdayLabel(current.title, currentIndex) : "Current matchday"}
            </span>
            {current ? (
              <span className="truncate text-[11px] text-ink-500">
                {formatDate(current.startAt)}
                {current.venue ? ` · ${current.venue.name}` : ""}
              </span>
            ) : null}
          </div>
          {current && current.fixtures.length > 0 ? (
            current.fixtures.map((g) => <FixtureRow key={g.id} g={g} />)
          ) : (
            <p className="px-3 py-4 text-sm text-ink-500">No matchdays scheduled yet.</p>
          )}
        </div>

        {/* Standings snapshot */}
        <div className="min-w-0">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-500">
            Standings · after matchday {playedMatchdays}
          </p>
          {hasResults ? (
            <StandingsTable rows={standings} />
          ) : (
            <p className="tv-card px-4 py-6 text-sm text-ink-500">
              No results yet — the table fills in as matchdays are played.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
