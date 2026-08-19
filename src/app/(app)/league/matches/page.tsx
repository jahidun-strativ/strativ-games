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
    <div className="space-y-6">
      {admin && season.status === "active" ? (
        <AddMatchdayButton seasonId={season.id} venues={venues} nextNumber={matchdays.length + 1} />
      ) : null}

      {matchdays.length === 0 ? (
        <p className="tv-card px-4 py-6 text-sm text-ink-500">No matchdays scheduled yet.</p>
      ) : (
        <div className="space-y-3">
          {matchdays.map((md, i) => (
            <div key={md.id} className="tv-card-sm overflow-hidden">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-line bg-cream-100 px-4 py-2">
                <p className="font-display text-ink-900">{md.title ?? `Matchday ${i + 1}`}</p>
                <p className="text-xs text-ink-500">
                  {formatDate(md.startAt)} · {formatTime(md.startAt)}
                  {md.venue ? ` · 📍 ${md.venue.name}` : ""}
                </p>
              </div>
              <ul>
                {md.fixtures.map((g) => (
                  <li
                    key={g.id}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm not-last:border-b not-last:border-line"
                  >
                    <span className="flex-1 truncate text-right font-medium">
                      {g.homeTeam?.name ?? "TBD"}
                    </span>
                    <span className="scoreboard w-16 shrink-0 text-center font-bold">
                      {g.status === "completed" && g.homeScore !== null
                        ? `${g.homeScore}–${g.awayScore}`
                        : g.status === "cancelled"
                          ? "—"
                          : "vs"}
                    </span>
                    <span className="flex-1 truncate font-medium">{g.awayTeam?.name ?? "TBD"}</span>
                    <span className="hidden shrink-0 sm:block">
                      <StatusBadge status={g.status} />
                    </span>
                    <Link
                      href={`/league/matches/${g.id}`}
                      className="shrink-0 text-xs font-semibold text-burnt-400 hover:text-burnt-300"
                    >
                      Manage →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
