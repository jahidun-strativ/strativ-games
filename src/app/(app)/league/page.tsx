import { getActiveSeason, getSeasonView } from "@/server/queries/season";
import { LeagueChampion, LeagueStandings } from "@/components/league/season-board";

export const metadata = { title: "League" };
export const dynamic = "force-dynamic";

export default async function LeagueOverviewPage() {
  const season = await getActiveSeason();
  if (!season) return null; // layout renders the no-season empty state
  const view = await getSeasonView(season);
  return (
    <div className="space-y-8">
      <LeagueChampion view={view} />
      <LeagueStandings view={view} />
    </div>
  );
}
