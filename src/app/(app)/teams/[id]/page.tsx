import { notFound } from "next/navigation";
import { desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { deleteTeam } from "@/server/actions/teams";
import { MatchCard } from "@/components/match-card";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { RosterTable } from "@/components/tables/roster-table";
import { EditTeamButton } from "@/components/entity-modals";
import { AddPlayerButton } from "@/components/add-player-to-team";
import { isAdmin } from "@/server/auth";

export const metadata = { title: "Team" };

export default async function TeamDetailPage({
  params,
}: PageProps<"/teams/[id]">) {
  const { id } = await params;
  const [team, allSports, allTeams, allPlayers] = await Promise.all([
    db.query.teams.findFirst({
      where: (t, { eq }) => eq(t.id, id),
      with: {
        sport: true,
        players: { orderBy: (p, { asc }) => asc(p.name) },
        staff: true,
      },
    }),
    db.query.sports.findMany(),
    db.query.teams.findMany(),
    db.query.players.findMany({
      orderBy: (p, { asc }) => asc(p.name),
      with: { team: { columns: { name: true } } },
    }),
  ]);
  if (!team) notFound();
  const external = team.kind === "external";
  const admin = await isAdmin();

  const teamMatches = await db.query.matches.findMany({
    where: or(eq(matches.homeTeamId, id), eq(matches.awayTeamId, id)),
    orderBy: desc(matches.kickoffAt),
    limit: 6,
    with: { homeTeam: true, awayTeam: true, venue: true },
  });

  return (
    <div>
      <PageHeader
        kicker={`${external ? "Opponent" : team.sport.name}${team.league ? ` · ${team.league}` : ""}`}
        title={team.name}
        actions={
          <>
            {admin ? <EditTeamButton sports={allSports} team={team} /> : null}
            {!external ? (
              <ButtonLink variant={admin ? "secondary" : "primary"} href={`/teams/${team.id}/lineup`}>
                Lineup
              </ButtonLink>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section>
          {external ? (
            <div className="tv-card-sm p-5">
              <p className="text-sm text-ink-500">
                This is an external opponent. Strativ tracks match results against them but
                doesn&apos;t manage their roster or lineup.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-display text-xl text-ink-900">
                  Roster <span className="text-sm text-ink-500">({team.players.length})</span>
                </h2>
                {admin ? (
                  <AddPlayerButton
                    teamId={team.id}
                    teamName={team.name}
                    teamSportId={team.sportId}
                    sports={allSports}
                    teams={allTeams}
                    players={allPlayers.map((p) => ({
                      id: p.id,
                      name: p.name,
                      position: p.position,
                      sportId: p.sportId,
                      teamId: p.teamId,
                      teamName: p.team?.name ?? null,
                    }))}
                  />
                ) : null}
              </div>
              <RosterTable
                players={team.players.map((p) => ({
                  id: p.id,
                  name: p.name,
                  position: p.position,
                  status: p.status,
                }))}
              />

              <h2 className="font-display mb-3 mt-8 text-xl text-ink-900">Staff</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {team.staff.length === 0 ? (
                  <p className="text-sm text-ink-500">No team staff assigned.</p>
                ) : (
                  team.staff.map((s) => (
                    <div key={s.id} className="tv-card-sm p-3">
                      <p className="font-bold">{s.name}</p>
                      <p className="text-xs text-ink-500">
                        {s.role}
                        {s.department ? ` · ${s.department}` : ""}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </section>

        <section>
          <h2 className="font-display mb-3 text-xl text-ink-900">Recent & upcoming</h2>
          <div className="space-y-3">
            {teamMatches.length === 0 ? (
              <p className="text-sm text-ink-500">No matches for this team yet.</p>
            ) : (
              teamMatches.map((m) => <MatchCard key={m.id} match={m} />)
            )}
          </div>

          {admin ? (
            <div className="mt-8 border-t border-line pt-4">
              <ConfirmDelete
                action={deleteTeam.bind(null, team.id)}
                label={external ? "Delete opponent" : "Delete team"}
                confirmMessage={`Delete ${team.name}? Its matches will be removed${external ? "." : " and players unassigned."}`}
              />
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
