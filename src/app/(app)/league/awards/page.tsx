import { eq } from "drizzle-orm";
import { db } from "@/db";
import { players } from "@/db/schema";
import { isAdmin } from "@/server/auth";
import { getActiveSeason, getSeasonView } from "@/server/queries/season";
import { LeagueAwards } from "@/components/league/season-board";
import { AwardEditor } from "@/components/league/season-admin";

export const metadata = { title: "League awards" };
export const dynamic = "force-dynamic";

export default async function LeagueAwardsPage() {
  const [admin, season] = await Promise.all([isAdmin(), getActiveSeason()]);
  if (!season) return null;
  const view = await getSeasonView(season);

  // Admins can override the auto-computed winners; needs the league's players/teams.
  let editor: React.ReactNode = null;
  if (admin) {
    const leaguePlayers = await db.query.players.findMany({
      where: eq(players.sportId, season.sportId),
      columns: { id: true, name: true, teamId: true },
      with: { team: { columns: { name: true } } },
    });
    const teamIds = new Set(view.teams.map((t) => t.id));
    const playerOpts = leaguePlayers
      .filter((p) => p.teamId && teamIds.has(p.teamId))
      .map((p) => ({ id: p.id, name: p.name, teamName: p.team?.name ?? null }));
    const teamOpts = view.teams.map((t) => ({ id: t.id, name: t.name }));
    editor = <AwardEditor season={season} players={playerOpts} teams={teamOpts} />;
  }

  return (
    <div className="space-y-8">
      <LeagueAwards view={view} />
      {editor ? (
        <section>
          <h2 className="font-display mb-3 text-xl text-ink-900">Set awards</h2>
          {editor}
        </section>
      ) : null}
    </div>
  );
}
