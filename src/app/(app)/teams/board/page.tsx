import { Suspense } from "react";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { players, teams } from "@/db/schema";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { CardGridSkeleton } from "@/components/ui/skeleton";
import { ButtonLink } from "@/components/ui/button";
import { SquadBoard } from "@/components/squad-board";
import { isAdmin } from "@/server/auth";

export const metadata = { title: "Squad board" };

async function BoardContent() {
  // Both board actions (move, swap) are admin-only, so the page is too.
  if (!(await isAdmin())) redirect("/teams");

  const [allSports, allTeams, allPlayers] = await Promise.all([
    db.query.sports.findMany(),
    db.query.teams.findMany({ orderBy: asc(teams.name) }),
    db.query.players.findMany({ orderBy: asc(players.name) }),
  ]);

  // External opponents have no roster to manage.
  const ourTeams = allTeams.filter((t) => t.kind !== "external");
  if (ourTeams.length === 0) {
    return (
      <EmptyState
        title="No teams yet"
        hint="Create a team first — the board moves players between your squads."
        action={<ButtonLink href="/teams">Go to teams</ButtonLink>}
      />
    );
  }

  return (
    <SquadBoard
      sports={allSports.map((s) => ({ id: s.id, name: s.name, color: s.color }))}
      teams={ourTeams.map((t) => ({
        id: t.id,
        name: t.name,
        sportId: t.sportId,
        captainId: t.captainId,
      }))}
      players={allPlayers.map((p) => ({
        id: p.id,
        name: p.name,
        position: p.position,
        sportId: p.sportId,
        teamId: p.teamId,
      }))}
    />
  );
}

export default function SquadBoardPage() {
  return (
    <div>
      <PageHeader
        kicker="Squad room"
        title="Squad board"
        actions={<ButtonLink variant="secondary" href="/teams">All teams</ButtonLink>}
      />
      <p className="mb-6 max-w-2xl text-sm text-ink-500">
        Drag a player onto another team to move them, or onto another player to swap the two.
        Free agents sit in their own column. On a touchscreen, tap a player to pick them up, then
        tap a team or a player to drop.
      </p>
      <Suspense fallback={<CardGridSkeleton count={3} height="h-40" />}>
        <BoardContent />
      </Suspense>
    </div>
  );
}
