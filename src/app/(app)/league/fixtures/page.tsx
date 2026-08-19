import { db } from "@/db";
import { isAdmin } from "@/server/auth";
import { getActiveSeason, getSeasonView } from "@/server/queries/season";
import { LeagueMatchdays } from "@/components/league/season-board";
import { AddMatchdayButton } from "@/components/league/add-matchday-button";

export const metadata = { title: "League fixtures" };
export const dynamic = "force-dynamic";

export default async function LeagueFixturesPage() {
  const [admin, season] = await Promise.all([isAdmin(), getActiveSeason()]);
  if (!season) return null;
  const [view, venues] = await Promise.all([
    getSeasonView(season),
    admin ? db.query.venues.findMany() : Promise.resolve([]),
  ]);

  return (
    <div>
      {admin && season.status === "active" ? (
        <div className="mb-6">
          <AddMatchdayButton
            seasonId={season.id}
            venues={venues}
            nextNumber={view.matchdays.length + 1}
          />
        </div>
      ) : null}
      <LeagueMatchdays view={view} />
    </div>
  );
}
