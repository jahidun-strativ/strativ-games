import { getActiveSeason, getSeasonView } from "@/server/queries/season";
import { LeagueStats } from "@/components/league/season-board";

export const metadata = { title: "League stats" };
export const dynamic = "force-dynamic";

export default async function LeagueStatsPage() {
  const season = await getActiveSeason();
  if (!season) return null;
  const view = await getSeasonView(season);
  return <LeagueStats view={view} />;
}
