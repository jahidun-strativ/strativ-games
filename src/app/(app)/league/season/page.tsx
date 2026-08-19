import { isAdmin } from "@/server/auth";
import { getActiveSeason } from "@/server/queries/season";
import { SeasonStatusButton } from "@/components/league/season-admin";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/format";

export const metadata = { title: "League season" };
export const dynamic = "force-dynamic";

export default async function LeagueSeasonPage() {
  const [admin, season] = await Promise.all([isAdmin(), getActiveSeason()]);
  if (!season) return null;

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Season", value: season.name },
    { label: "Status", value: <StatusBadge status={season.status} /> },
    { label: "Starts", value: formatDate(season.startAt) },
    { label: "Planned matchdays", value: season.plannedMatchdays },
  ];

  return (
    <div className="space-y-6">
      <div className="tv-card-sm p-5">
        <h2 className="font-display mb-4 text-xl text-ink-900">Season details</h2>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3 border-b border-line pb-2 last:border-b-0">
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">{r.label}</dt>
              <dd className="font-display text-ink-900">{r.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {admin ? (
        <div className="tv-card-sm flex flex-col items-start gap-3 p-5">
          <h2 className="font-display text-xl text-ink-900">Manage season</h2>
          <p className="text-sm text-ink-500">
            {season.status === "ended"
              ? "This season is over. Reopen it if you need to add or fix results."
              : "Ending the season crowns the top of the table as champion and notifies everyone. You can reopen it later."}
          </p>
          <SeasonStatusButton season={season} />
        </div>
      ) : null}
    </div>
  );
}
