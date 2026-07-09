import { asc } from "drizzle-orm";
import { db } from "@/db";
import { players } from "@/db/schema";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { PlayersTable } from "@/components/tables/players-table";
import { NewPlayerButton } from "@/components/entity-modals";

export const metadata = { title: "Players" };

export default async function PlayersPage({
  searchParams,
}: PageProps<"/players">) {
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

  const filtered = allPlayers.filter(
    (p) => (!teamId || p.teamId === teamId) && (!sportId || p.sportId === sportId),
  );

  return (
    <div>
      <PageHeader
        kicker="Locker room"
        title="Players"
        actions={
          allSports.length > 0 ? (
            <NewPlayerButton sports={allSports} teams={allTeams} />
          ) : undefined
        }
      />

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
          hint="Try clearing filters, or sign a new player."
          action={
            allSports.length > 0 ? (
              <NewPlayerButton sports={allSports} teams={allTeams} label="New player" />
            ) : undefined
          }
        />
      ) : (
        <PlayersTable
          players={filtered.map((p) => ({
            id: p.id,
            name: p.name,
            position: p.position,
            squadNumber: p.squadNumber,
            status: p.status,
            teamId: p.teamId,
            teamName: p.team?.name ?? null,
            sportName: p.sport.name,
          }))}
        />
      )}
    </div>
  );
}
