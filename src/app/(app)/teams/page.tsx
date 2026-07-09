import Link from "next/link";
import { Suspense } from "react";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { teams } from "@/db/schema";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { CardGridSkeleton } from "@/components/ui/skeleton";
import { NewTeamButton } from "@/components/entity-modals";
import { isAdmin } from "@/server/auth";
import type { Sport } from "@/db/schema";

export const metadata = { title: "Teams" };

type TeamCard = {
  id: string;
  name: string;
  kind: string;
  league: string | null;
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
            {team.league ? (
              <p className="mt-1 text-sm text-ink-500">{team.league}</p>
            ) : null}
            <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm">
              {external ? (
                <span className="rounded-full bg-cream-200 px-2.5 py-0.5 text-xs font-semibold uppercase text-ink-500">
                  Opponent
                </span>
              ) : (
                <span className="text-ink-500">
                  {team.players.length} player{team.players.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

async function TeamsActions() {
  const [admin, allSports] = await Promise.all([isAdmin(), db.query.sports.findMany()]);
  if (!admin || allSports.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      <NewTeamButton sports={allSports} />
      <NewTeamButton sports={allSports} kind="external" variant="secondary" />
    </div>
  );
}

async function TeamsContent() {
  const [allTeams, allSports] = await Promise.all([
    db.query.teams.findMany({
      orderBy: asc(teams.name),
      with: { sport: true, players: { columns: { id: true } } },
    }),
    db.query.sports.findMany(),
  ]);

  const admin = await isAdmin();
  const canCreate = admin && allSports.length > 0;
  const ourTeams = allTeams.filter((t) => t.kind !== "external");
  const opponents = allTeams.filter((t) => t.kind === "external");

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-display mb-3 text-xl text-ink-900">Our teams</h2>
        {ourTeams.length === 0 ? (
          <EmptyState
            title="No teams yet"
            hint={
              canCreate
                ? "Create your first Strativ squad to start scheduling matches."
                : admin
                  ? "Add a sport first, then create your teams."
                  : "No teams have been added yet."
            }
            action={canCreate ? <NewTeamButton sports={allSports} label="New team" /> : undefined}
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
            hint={
              canCreate
                ? "Add a rival company or local team to schedule competitive matches."
                : "No opponents have been added yet."
            }
            action={
              canCreate ? (
                <NewTeamButton sports={allSports} kind="external" label="New opponent" />
              ) : undefined
            }
          />
        ) : (
          <TeamGrid items={opponents} />
        )}
      </section>
    </div>
  );
}

export default function TeamsPage() {
  return (
    <div>
      <PageHeader
        kicker="Squad room"
        title="Teams"
        actions={
          <Suspense fallback={null}>
            <TeamsActions />
          </Suspense>
        }
      />

      <Suspense fallback={<CardGridSkeleton count={6} height="h-32" />}>
        <TeamsContent />
      </Suspense>
    </div>
  );
}
