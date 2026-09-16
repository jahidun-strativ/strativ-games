import { db } from "@/db";
import { isAdmin } from "@/server/auth";
import { getActiveSeason, getUpcomingSeasons, getSeasonMatchdays } from "@/server/queries/season";
import { EditSeasonForm } from "@/components/league/edit-season-form";
import { UpcomingSeasons } from "@/components/league/upcoming-seasons";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "League settings" };
export const dynamic = "force-dynamic";

export default async function LeagueSettingsPage() {
  const [admin, season] = await Promise.all([isAdmin(), getActiveSeason()]);
  if (!season) return null;

  if (!admin) {
    return (
      <EmptyState
        title="Admins only"
        hint="Season settings can only be changed by an admin."
      />
    );
  }

  const upcoming = await getUpcomingSeasons();
  const [venues, ...matchdaysPer] = await Promise.all([
    db.query.venues.findMany(),
    ...upcoming.map((s) => getSeasonMatchdays(s.id)),
  ]);
  const items = upcoming.map((s, i) => ({
    season: s,
    matchdays: matchdaysPer[i].map((md) => ({
      id: md.id,
      title: md.title,
      startAt: md.startAt,
      venueName: md.venue?.name ?? null,
      games: md.fixtures.length,
    })),
  }));

  return (
    <div className="max-w-xl space-y-8">
      <div className="tv-card-sm p-5">
        <h2 className="font-display mb-1 text-xl text-ink-900">Edit season</h2>
        <p className="mb-4 text-sm text-ink-500">
          Rename the season, move its start date, or change how many matchdays are planned.
        </p>
        <EditSeasonForm season={season} />
      </div>

      <UpcomingSeasons items={items} venues={venues} />
    </div>
  );
}
