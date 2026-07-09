import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { teams } from "@/db/schema";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { NewTeamButton } from "@/components/entity-modals";
import type { Sport } from "@/db/schema";

export const metadata = { title: "Teams" };

type TeamCard = {
  id: string;
  name: string;
  kind: string;
  league: string | null;
  formation: string;
  sport: Sport;
  players: { id: string }[];
};

function TeamGrid({ items }: { items: TeamCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((team) => {
        const external = team.kind === "external";
        return (
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
              {external ? (
                <span className="rounded-full bg-cream-200 px-2.5 py-0.5 text-xs font-semibold uppercase text-ink-500">
                  Opponent
                </span>
              ) : (
                <>
                  <span className="scoreboard font-bold text-pitch-500">{team.formation}</span>
                  <span className="text-ink-500">{team.players.length} players</span>
                </>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default async function TeamsPage() {
  const [allTeams, allSports] = await Promise.all([
    db.query.teams.findMany({
      orderBy: asc(teams.name),
      with: { sport: true, players: { columns: { id: true } } },
    }),
    db.query.sports.findMany(),
  ]);

  const canCreate = allSports.length > 0;
  const ourTeams = allTeams.filter((t) => t.kind !== "external");
  const opponents = allTeams.filter((t) => t.kind === "external");

  return (
    <div>
      <PageHeader
        kicker="Squad room"
        title="Teams"
        actions={
          canCreate ? (
            <div className="flex flex-wrap gap-2">
              <NewTeamButton sports={allSports} />
              <NewTeamButton sports={allSports} kind="external" variant="secondary" />
            </div>
          ) : undefined
        }
      />

      {!canCreate ? (
        <EmptyState title="Add a sport first" hint="Create a sport, then add your teams and opponents." />
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="font-display mb-3 text-xl text-ink-900">Our teams</h2>
            {ourTeams.length === 0 ? (
              <EmptyState
                title="No teams yet"
                hint="Create your first Strativ squad to start scheduling matches."
                action={<NewTeamButton sports={allSports} label="New team" />}
              />
            ) : (
              <TeamGrid items={ourTeams} />
            )}
          </section>

          <section>
            <h2 className="font-display mb-1 text-xl text-ink-900">Opponents</h2>
            <p className="mb-3 text-sm text-ink-500">
              External teams you play competitive matches against.
            </p>
            {opponents.length === 0 ? (
              <EmptyState
                title="No opponents yet"
                hint="Add a rival company or local club to schedule competitive matches."
                action={
                  <NewTeamButton sports={allSports} kind="external" label="New opponent" />
                }
              />
            ) : (
              <TeamGrid items={opponents} />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
