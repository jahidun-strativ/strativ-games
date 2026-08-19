import { Suspense } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { players } from "@/db/schema";
import { isAdmin } from "@/server/auth";
import { getActiveSeason, getSeasonView } from "@/server/queries/season";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { CardGridSkeleton } from "@/components/ui/skeleton";
import { SeasonBoard } from "@/components/league/season-board";
import { CreateSeasonButton } from "@/components/league/create-season-button";
import { AddMatchdayButton } from "@/components/league/add-matchday-button";
import { AwardEditor, SeasonStatusButton } from "@/components/league/season-admin";

export const metadata = { title: "League" };
// Live standings — recomputed on every visit so a just-recorded result shows.
export const dynamic = "force-dynamic";

async function LeagueContent() {
  const [admin, season] = await Promise.all([isAdmin(), getActiveSeason()]);

  if (!season) {
    const sports = admin ? await db.query.sports.findMany() : [];
    return (
      <>
        <PageHeader kicker="League office" title="League" />
        <EmptyState
          title="No active season"
          hint={
            admin
              ? "Start a season to open standings, fixtures and awards."
              : "The league hasn't started yet — check back once a season is live."
          }
          action={admin ? <CreateSeasonButton sports={sports} /> : undefined}
        />
      </>
    );
  }

  const [view, venues, leaguePlayers] = await Promise.all([
    getSeasonView(season),
    admin ? db.query.venues.findMany() : Promise.resolve([]),
    db.query.players.findMany({
      where: eq(players.sportId, season.sportId),
      columns: { id: true, name: true, teamId: true },
      with: { team: { columns: { name: true } } },
    }),
  ]);

  const teamIds = new Set(view.teams.map((t) => t.id));
  const playerOpts = leaguePlayers
    .filter((p) => p.teamId && teamIds.has(p.teamId))
    .map((p) => ({ id: p.id, name: p.name, teamName: p.team?.name ?? null }));
  const teamOpts = view.teams.map((t) => ({ id: t.id, name: t.name }));

  return (
    <>
      <PageHeader
        kicker={season.status === "ended" ? "League office · Final" : "League office"}
        title={season.name}
        actions={
          admin ? (
            <div className="flex flex-wrap gap-2">
              {season.status === "active" ? (
                <AddMatchdayButton
                  seasonId={season.id}
                  venues={venues}
                  nextNumber={view.matchdays.length + 1}
                />
              ) : null}
              <SeasonStatusButton season={season} />
            </div>
          ) : undefined
        }
      />

      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/league/${season.id}`}
          target="_blank"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-burnt-500 hover:text-burnt-400"
        >
          <ExternalLink className="h-4 w-4" />
          Public league page
        </Link>
      </div>

      {admin ? (
        <section className="mb-8">
          <h2 className="font-display mb-3 text-xl text-ink-900">Set awards</h2>
          <AwardEditor season={season} players={playerOpts} teams={teamOpts} />
        </section>
      ) : null}

      <SeasonBoard view={view} />
    </>
  );
}

export default function LeaguePage() {
  return (
    <div>
      <Suspense fallback={<CardGridSkeleton count={3} height="h-64" />}>
        <LeagueContent />
      </Suspense>
    </div>
  );
}
