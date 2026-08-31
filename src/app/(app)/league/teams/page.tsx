import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appUsers, teams } from "@/db/schema";
import { isAdmin, canManageTeam, canSetLineup } from "@/server/auth";
import { getActiveSeason, getSeasonView } from "@/server/queries/season";
import { CaptainPicker } from "@/components/captain-picker";
import { GkPicker } from "@/components/gk-picker";
import { ManagerPicker } from "@/components/league/manager-picker";
import { RosterCard } from "@/components/league/roster-card";
import { TeamStaffManager } from "@/components/league/team-staff-manager";
import { AddPlayerButton } from "@/components/add-player-to-team";
import { EditTeamButton } from "@/components/entity-modals";
import { TeamBanner } from "@/components/team-banner";
import { TeamBannerGenerator } from "@/components/team-banner-generator";
import { PosterButton } from "@/components/poster-button";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "League teams" };
export const dynamic = "force-dynamic";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "") || name[0] || "?").toUpperCase();
}

// Availability status → a small coloured dot.
const STATUS_DOT: Record<string, string> = {
  active: "bg-pitch-500",
  injured: "bg-tvred-500",
  suspended: "bg-gold-400",
  inactive: "bg-ink-400",
};

// League teams = the season sport's internal teams. Managed inline (roster,
// captain, edit) with the SAME components as the main Teams section.
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
        staff: { orderBy: (s, { asc }) => asc(s.name) },
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

  // Suggestions for the staff Name field: every app user, named by their linked
  // player if any, else their email. Managers can still type any name manually.
  const users = await db.select({ userId: appUsers.userId, email: appUsers.email }).from(appUsers);
  const nameByUser = new Map(
    allPlayers.filter((p) => p.userId).map((p) => [p.userId as string, p.name] as const),
  );
  const staffPeople = users.map((u) => {
    const label = nameByUser.get(u.userId) ?? u.email;
    return { value: label, label };
  });

  const internal = sportTeams.filter((t) => t.kind !== "external");
  if (internal.length === 0) {
    return (
      <p className="tv-card px-4 py-6 text-sm text-ink-500">
        No teams in this league&apos;s sport yet. Add teams from the Teams section first.
      </p>
    );
  }

  const rankByTeam = new Map(view.standings.map((r, i) => [r.teamId, i + 1]));
  const recByTeam = new Map(view.standings.map((r) => [r.teamId, r]));
  const manageable = await Promise.all(internal.map((t) => canManageTeam(t.id)));
  // Setting player positions is the captain's/manager's job, not admin's.
  const roleEditable = await Promise.all(internal.map((t) => canSetLineup(t.id)));

  const assignablePlayers = allPlayers.map((p) => ({
    id: p.id,
    name: p.name,
    position: p.position,
    sportId: p.sportId,
    teamId: p.teamId,
    teamName: p.team?.name ?? null,
  }));

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-500">
        Rosters, captains and lineups for the {internal.length} league teams.
      </p>

      {internal.map((team, i) => {
        const canManage = manageable[i];
        const canEditRole = roleEditable[i];
        const rank = rankByTeam.get(team.id);
        const rec = recByTeam.get(team.id);
        const record = [
          { label: "P", value: rec?.played ?? 0 },
          { label: "W", value: rec?.won ?? 0 },
          { label: "D", value: rec?.drawn ?? 0 },
          { label: "L", value: rec?.lost ?? 0 },
          { label: "Pts", value: rec?.points ?? 0 },
        ];

        return (
          <div key={team.id} className="tv-card relative overflow-hidden">
            <TeamBanner
              name={team.name}
              seed={team.bannerSeed}
              variant="strip"
              className="h-16 w-full"
            />
            {admin ? (
              <div className="absolute left-3 top-3 z-10">
                <TeamBannerGenerator
                  teamId={team.id}
                  teamName={team.name}
                  currentSeed={team.bannerSeed}
                />
              </div>
            ) : null}
            <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[260px_1fr]">
            {/* Identity + management rail */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span
                  className={`scoreboard flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${
                    rank === 1 ? "bg-gold-400 text-black" : "bg-cream-200 text-ink-500"
                  }`}
                >
                  {rank ? `#${rank}` : "–"}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-lg text-ink-900">{team.name}</p>
                  <p className="text-xs text-ink-500">
                    {team.players.length} player{team.players.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              {/* League record */}
              <div className="grid grid-cols-5 gap-1.5">
                {record.map((s) => (
                  <div key={s.label} className="rounded-lg bg-cream-50 py-1.5 text-center">
                    <p className="scoreboard text-base font-bold text-burnt-400">{s.value}</p>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Captain */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                  Captain
                </p>
                {admin ? (
                  <CaptainPicker
                    teamId={team.id}
                    captainId={team.captainId}
                    players={team.players.map((p) => ({ id: p.id, name: p.name }))}
                  />
                ) : (
                  <p className="text-sm font-semibold text-ink-900">
                    {team.captain?.name ?? "Not assigned"}
                  </p>
                )}
              </div>

              {/* Goalkeepers */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                  Goalkeepers
                </p>
                {admin ? (
                  <GkPicker
                    teamId={team.id}
                    goalkeeperIds={team.goalkeeperIds}
                    players={team.players.map((p) => ({ id: p.id, name: p.name }))}
                  />
                ) : (
                  <p className="text-sm font-semibold text-ink-900">
                    {team.players
                      .filter((p) => team.goalkeeperIds.includes(p.id))
                      .map((p) => p.name)
                      .join(", ") || "Not assigned"}
                  </p>
                )}
              </div>

              {/* Manager — admin assigns; the manager gets captain-level powers.
                  Only this team's players who have a linked account can be picked. */}
              {admin ? (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                    Manager
                  </p>
                  <ManagerPicker
                    teamId={team.id}
                    managerUserId={team.managerUserId}
                    users={team.players
                      .filter((p) => p.userId)
                      .map((p) => ({ userId: p.userId!, label: p.name }))}
                  />
                </div>
              ) : null}

              {/* Actions — one column of consistent full-width buttons: primary
                  CTA, then Lineup/Edit paired, then the share action. */}
              <div className="space-y-2 border-t border-line pt-4 [&_.ant-btn]:w-full [&_.ant-btn]:justify-center">
                {/* Roster membership is admin-only — captains/managers don't add,
                    remove or move players. */}
                {admin ? (
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
                <div className="flex gap-2 *:flex-1">
                  <ButtonLink variant="secondary" href={`/teams/${team.id}/lineup`}>
                    Lineup
                  </ButtonLink>
                  {canManage ? <EditTeamButton sports={allSports} team={team} /> : null}
                </div>
                <div className="[&>span]:block">
                  <PosterButton
                    basePath={`/teams/${team.id}/poster`}
                    label="Squad picture"
                    variants={[{ label: "Squad picture", variant: "squad", hint: "Team + player names" }]}
                  />
                </div>
              </div>
            </div>

            {/* Roster */}
            <div className="min-w-0 border-t border-line pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <div className="mb-3 flex items-baseline justify-between">
                <h3 className="font-display text-base text-ink-900">Roster</h3>
                <span className="text-xs text-ink-500">{team.players.length}</span>
              </div>
              {team.players.length === 0 ? (
                <p className="text-sm text-ink-500">No players yet.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {team.players.map((p) => (
                    <RosterCard
                      key={p.id}
                      player={{ id: p.id, name: p.name, position: p.position, status: p.status }}
                      isCaptain={team.captainId === p.id}
                      canEditRole={canEditRole}
                      initials={initials(p.name)}
                      statusDot={STATUS_DOT[p.status] ?? "bg-ink-400"}
                    />
                  ))}
                </div>
              )}

              {/* Staff — the team's OWN captain/manager add coaches, physios,
                  etc. (not admin), same as positions. */}
              <div className="mt-6 border-t border-line pt-5">
                <h3 className="font-display mb-3 text-base text-ink-900">Staff</h3>
                <TeamStaffManager
                  teamId={team.id}
                  sportId={team.sportId}
                  staff={team.staff}
                  canManage={canEditRole}
                  people={staffPeople}
                />
              </div>
            </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
