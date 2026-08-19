import { eq } from "drizzle-orm";
import { db } from "@/db";
import { teams } from "@/db/schema";
import { getActiveSeason, getSeasonView } from "@/server/queries/season";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "League teams" };
export const dynamic = "force-dynamic";

// League teams are the season sport's internal teams — the SAME team records
// used everywhere else, just shown with their league standing and deep-links to
// the full team management (roster, captain, lineup).
export default async function LeagueTeamsPage() {
  const season = await getActiveSeason();
  if (!season) return null;

  const [view, sportTeams] = await Promise.all([
    getSeasonView(season),
    db.query.teams.findMany({
      where: eq(teams.sportId, season.sportId),
      with: { players: { columns: { id: true } }, captain: { columns: { name: true } } },
      orderBy: (t, { asc }) => asc(t.name),
    }),
  ]);

  const internal = sportTeams.filter((t) => t.kind !== "external");
  const rankByTeam = new Map(view.standings.map((r, i) => [r.teamId, i + 1]));
  const recByTeam = new Map(view.standings.map((r) => [r.teamId, r]));

  if (internal.length === 0) {
    return (
      <p className="tv-card px-4 py-6 text-sm text-ink-500">
        No teams in this league&apos;s sport yet. Add teams from the Teams section first.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {internal.map((team) => {
        const rec = recByTeam.get(team.id);
        const rank = rankByTeam.get(team.id);
        return (
          <div key={team.id} className="tv-card-sm flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-display text-lg text-ink-900">{team.name}</p>
                <p className="truncate text-xs text-ink-500">
                  {team.players.length} player{team.players.length === 1 ? "" : "s"}
                  {" · "}
                  Captain: {team.captain?.name ?? "—"}
                </p>
              </div>
              {rank ? (
                <span className="scoreboard flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold-400/20 text-sm font-bold text-gold-300">
                  #{rank}
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-5 gap-1.5 text-center">
              {[
                { label: "P", value: rec?.played ?? 0 },
                { label: "W", value: rec?.won ?? 0 },
                { label: "D", value: rec?.drawn ?? 0 },
                { label: "L", value: rec?.lost ?? 0 },
                { label: "Pts", value: rec?.points ?? 0 },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-cream-50 py-1.5">
                  <p className="scoreboard text-base font-bold text-burnt-400">{s.value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <ButtonLink variant="secondary" href={`/teams/${team.id}`}>
                Manage team
              </ButtonLink>
              <ButtonLink variant="ghost" href={`/teams/${team.id}/lineup`}>
                Lineup
              </ButtonLink>
            </div>
          </div>
        );
      })}
    </div>
  );
}
