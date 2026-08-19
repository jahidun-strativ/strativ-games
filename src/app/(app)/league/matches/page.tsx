import Link from "next/link";
import { db } from "@/db";
import { isAdmin } from "@/server/auth";
import { getActiveSeason, getSeasonMatchdays } from "@/server/queries/season";
import { AddMatchdayButton } from "@/components/league/add-matchday-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatTime } from "@/lib/format";

export const metadata = { title: "League matches" };
export const dynamic = "force-dynamic";

export default async function LeagueMatchesPage() {
  const [admin, season] = await Promise.all([isAdmin(), getActiveSeason()]);
  if (!season) return null;
  const [matchdays, venues] = await Promise.all([
    getSeasonMatchdays(season.id),
    admin ? db.query.venues.findMany() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-500">Schedule and manage the league matchdays.</p>
        {admin && season.status === "active" ? (
          <AddMatchdayButton seasonId={season.id} venues={venues} nextNumber={matchdays.length + 1} />
        ) : null}
      </div>

      {matchdays.length === 0 ? (
        <p className="tv-card px-4 py-6 text-sm text-ink-500">No matchdays scheduled yet.</p>
      ) : (
        <div className="space-y-4">
          {matchdays.map((md, i) => {
            const done = md.fixtures.filter((f) => f.status === "completed").length;
            return (
              <div key={md.id} className="tv-card p-5">
                {/* Matchday header */}
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <span className="scoreboard flex h-10 shrink-0 items-center justify-center rounded-xl bg-cream-200 px-3 text-sm font-bold text-ink-700">
                    MD {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg text-ink-900">
                      {md.title ?? `Matchday ${i + 1}`}
                    </p>
                    <p className="truncate text-xs text-ink-500">
                      {formatDate(md.startAt)} · {formatTime(md.startAt)}
                      {md.venue ? ` · 📍 ${md.venue.name}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-ink-500">
                    {done}/{md.fixtures.length} played
                  </span>
                </div>

                {/* Fixtures */}
                <div className="space-y-2">
                  {md.fixtures.map((g) => {
                    const played = g.status === "completed" && g.homeScore !== null;
                    return (
                      <div
                        key={g.id}
                        className="flex items-center gap-2 rounded-lg border border-line bg-cream-200 px-3 py-2.5 sm:gap-3"
                      >
                        <span className="min-w-0 flex-1 truncate text-right text-sm font-semibold text-ink-900">
                          {g.homeTeam?.name ?? "TBD"}
                        </span>
                        <span
                          className={`scoreboard flex min-w-14 shrink-0 items-center justify-center rounded-md bg-cream-50 px-2 py-1 text-center text-base font-bold ${
                            played ? "text-ink-900" : "text-ink-400"
                          }`}
                        >
                          {played
                            ? `${g.homeScore}–${g.awayScore}`
                            : g.status === "cancelled"
                              ? "—"
                              : "vs"}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900">
                          {g.awayTeam?.name ?? "TBD"}
                        </span>
                        <span className="hidden shrink-0 md:block">
                          <StatusBadge status={g.status} />
                        </span>
                        <Link
                          href={`/league/matches/${g.id}`}
                          className="shrink-0 rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-burnt-400 transition-colors hover:border-burnt-500/40 hover:text-burnt-300"
                        >
                          Manage
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
