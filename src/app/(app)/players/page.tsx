import { Suspense } from "react";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { players } from "@/db/schema";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { FilterBarSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { PlayersTable } from "@/components/tables/players-table";
import { NewPlayerButton } from "@/components/entity-modals";
import { isAdmin } from "@/server/auth";

export const metadata = { title: "Players" };

async function PlayersActions() {
  const [admin, allSports, allTeams] = await Promise.all([
    isAdmin(),
    db.query.sports.findMany(),
    db.query.teams.findMany(),
  ]);
  if (!admin || allSports.length === 0) return null;
  return <NewPlayerButton sports={allSports} teams={allTeams} />;
}

async function PlayersContent({
  searchParams,
}: {
  searchParams: PageProps<"/players">["searchParams"];
}) {
  const { team: teamFilter, sport: sportFilter } = await searchParams;
  const teamId = typeof teamFilter === "string" && teamFilter !== "" ? teamFilter : null;
  const sportId = typeof sportFilter === "string" && sportFilter !== "" ? sportFilter : null;

  const [allPlayers, allTeams, allSports] = await Promise.all([
    db.query.players.findMany({
      orderBy: asc(players.name),
      with: { team: true, sport: true },
    }),
    db.query.teams.findMany(),
    db.query.sports.findMany(),
  ]);

  const admin = await isAdmin();
  const canCreate = admin && allSports.length > 0;
  const filtered = allPlayers.filter(
    (p) => (!teamId || p.teamId === teamId) && (!sportId || p.sportId === sportId),
  );

  return (
    <>
      <FilterBar
        filters={[
          {
            param: "sport",
            placeholder: "All sports",
            options: allSports.map((s) => ({ value: s.id, label: s.name })),
          },
          {
            param: "team",
            placeholder: "All teams",
            options: allTeams.map((t) => ({ value: t.id, label: t.name })),
          },
        ]}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="No players found"
          hint="Try clearing filters, or add a player."
          action={
            canCreate ? (
              <NewPlayerButton sports={allSports} teams={allTeams} label="Add player" />
            ) : undefined
          }
        />
      ) : (
        <PlayersTable
          players={filtered.map((p) => ({
            id: p.id,
            name: p.name,
            position: p.position,
            status: p.status,
            teamId: p.teamId,
            teamName: p.team?.name ?? null,
            sportName: p.sport.name,
            email: p.email,
          }))}
        />
      )}
    </>
  );
}

export default function PlayersPage({ searchParams }: PageProps<"/players">) {
  return (
    <div>
      <PageHeader
        kicker="Locker room"
        title="Players"
        actions={
          <Suspense fallback={null}>
            <PlayersActions />
          </Suspense>
        }
      />

      <Suspense
        fallback={
          <>
            <FilterBarSkeleton />
            <TableSkeleton rows={8} />
          </>
        }
      >
        <PlayersContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
