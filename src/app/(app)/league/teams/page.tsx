import { eq } from "drizzle-orm";
import { db } from "@/db";
import { teams } from "@/db/schema";
import { isAdmin, canManageTeam } from "@/server/auth";
import { getActiveSeason, getSeasonView } from "@/server/queries/season";
import { RosterTable } from "@/components/tables/roster-table";
import { CaptainPicker } from "@/components/captain-picker";
import { AddPlayerButton } from "@/components/add-player-to-team";
import { EditTeamButton } from "@/components/entity-modals";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "League teams" };
export const dynamic = "force-dynamic";

// League teams are the season sport's internal teams — managed inline here
// (roster, captain, edit) using the SAME components as the main Teams section.
export default async function LeagueTeamsPage() {
  const [admin, season] = await Promise.all([isAdmin(), getActiveSeason()]);
  if (!season) return null;

  const [view, sportTeams, allSports, allTeams, allPlayers] = await Promise.all([
    getSeasonView(season),
    db.query.teams.findMany({
      where: eq(teams.sportId, season.sportId),
      with: {
        players: { orderBy: (p, { asc }) => asc(p.name) },
        captain: { columns: { id: true, name: true } },
      },
      orderBy: (t, { asc }) => asc(t.name),
    }),
    db.query.sports.findMany(),
    db.query.teams.findMany(),
    db.query.players.findMany({
      orderBy: (p, { asc }) => asc(p.name),
      with: { team: { columns: { name: true } } },
    }),
  ]);

  const internal = sportTeams.filter((t) => t.kind !== "external");
  if (internal.length === 0) {
    return (
      <p className="tv-card px-4 py-6 text-sm text-ink-500">
        No teams in this league&apos;s sport yet. Add teams from the Teams section first.
      </p>
    );
  }

  const rankByTeam = new Map(view.standings.map((r, i) => [r.teamId, i + 1]));
  // Whether the viewer may manage each team (admin, or that team's captain).
  const manageable = await Promise.all(internal.map((t) => canManageTeam(t.id)));

  const assignablePlayers = allPlayers.map((p) => ({
    id: p.id,
    name: p.name,
    position: p.position,
    sportId: p.sportId,
    teamId: p.teamId,
    teamName: p.team?.name ?? null,
  }));

  return (
    <div className="space-y-6">
      {internal.map((team, i) => {
        const canManage = manageable[i];
        const rank = rankByTeam.get(team.id);
        return (
          <div key={team.id} className="tv-card space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-lg text-ink-900">
                  {rank ? <span className="mr-2 text-gold-300">#{rank}</span> : null}
                  {team.name}
                </p>
                <p className="text-xs text-ink-500">
                  {team.players.length} player{team.players.length === 1 ? "" : "s"}
                </p>
              </div>
              {admin ? <EditTeamButton sports={allSports} team={team} /> : null}
            </div>

            {/* Captain */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Captain
              </span>
              {admin ? (
                <CaptainPicker
                  teamId={team.id}
                  captainId={team.captainId}
                  players={team.players.map((p) => ({ id: p.id, name: p.name }))}
                />
              ) : (
                <span className="text-sm font-semibold text-ink-900">
                  {team.captain?.name ?? "Not assigned"}
                </span>
              )}
            </div>

            {/* Roster */}
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-base text-ink-900">Roster</h3>
              {canManage ? (
                <AddPlayerButton
                  teamId={team.id}
                  teamName={team.name}
                  teamSportId={team.sportId}
                  canCreate={admin}
                  canSwap={admin}
                  sports={allSports}
                  teams={allTeams}
                  players={assignablePlayers}
                />
              ) : null}
            </div>
            <RosterTable
              captainId={team.captainId}
              players={team.players.map((p) => ({
                id: p.id,
                name: p.name,
                position: p.position,
                status: p.status,
              }))}
            />

            <div>
              <ButtonLink variant="ghost" href={`/teams/${team.id}/lineup`}>
                Set lineup →
              </ButtonLink>
            </div>
          </div>
        );
      })}
    </div>
  );
}
