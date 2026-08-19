import { eq } from "drizzle-orm";
import { db } from "@/db";
import { players } from "@/db/schema";
import { isAdmin } from "@/server/auth";
import { getActiveSeason, getSeasonView } from "@/server/queries/season";
import {
  LeagueChampion,
  LeagueStandings,
  LeagueAwards,
  LeagueStats,
  LeagueMatchdays,
} from "@/components/league/season-board";
import { AwardEditor } from "@/components/league/season-admin";

export const metadata = { title: "League" };
export const dynamic = "force-dynamic";

export default async function LeagueOverviewPage() {
  const [admin, season] = await Promise.all([isAdmin(), getActiveSeason()]);
  if (!season) return null; // layout renders the no-season empty state
  const view = await getSeasonView(season);

  // Admins edit the award winners right where they're shown.
  let awardEditor: React.ReactNode = null;
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
    awardEditor = <AwardEditor season={season} players={playerOpts} teams={teamOpts} />;
  }

  const leader = view.standings.find((r) => r.played > 0) ?? null;
  const topScorer = view.scorers.find((s) => s.goals > 0) ?? null;

  const summary: { label: string; value: React.ReactNode; text?: boolean }[] = [
    { label: "Matchday", value: `${view.playedMatchdays}/${season.plannedMatchdays}` },
    { label: "Teams", value: view.teams.length },
    { label: "Leader", value: leader?.teamName ?? "—", text: true },
    { label: "Top scorer", value: topScorer?.name ?? "—", text: true },
  ];

  return (
    <div className="space-y-8">
      <LeagueChampion view={view} />

      {/* Season summary band */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summary.map((s) => (
          <div key={s.label} className="tv-card-sm p-4 text-center">
            {s.text ? (
              <p className="truncate text-base font-bold text-ink-900" title={String(s.value)}>
                {s.value}
              </p>
            ) : (
              <p className="scoreboard text-2xl font-bold text-burnt-400">{s.value}</p>
            )}
            <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-ink-500">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <LeagueStandings view={view} />

      <div>
        <LeagueAwards view={view} />
        {awardEditor ? (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">
              Set awards
            </p>
            {awardEditor}
          </div>
        ) : null}
      </div>

      <LeagueStats view={view} />
      <LeagueMatchdays matchdays={view.matchdays} />
    </div>
  );
}
