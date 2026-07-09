import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { teams } from "@/db/schema";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { NewTeamButton } from "@/components/entity-modals";

export const metadata = { title: "Teams" };

export default async function TeamsPage() {
  const [allTeams, allSports] = await Promise.all([
    db.query.teams.findMany({
      orderBy: asc(teams.name),
      with: { sport: true, players: { columns: { id: true } } },
    }),
    db.query.sports.findMany(),
  ]);

  const canCreate = allSports.length > 0;

  return (
    <div>
      <PageHeader
        kicker="Squad room"
        title="Teams"
        actions={canCreate ? <NewTeamButton sports={allSports} /> : undefined}
      />

      {allTeams.length === 0 ? (
        <EmptyState
          title="No teams yet"
          hint={
            canCreate
              ? "Create your first squad to start scheduling matches."
              : "Add a sport first, then create your teams."
          }
          action={canCreate ? <NewTeamButton sports={allSports} label="New team" /> : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allTeams.map((team) => (
            <Link
              key={team.id}
              href={`/teams/${team.id}`}
              className="tv-card p-5 transition-transform hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-xl leading-tight">{team.name}</h2>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white"
                  style={{ backgroundColor: team.sport.color }}
                >
                  {team.sport.shortName}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-500">{team.league ?? "No league"}</p>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm">
                <span className="scoreboard font-bold text-pitch-500">{team.formation}</span>
                <span className="text-ink-500">{team.players.length} players</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
