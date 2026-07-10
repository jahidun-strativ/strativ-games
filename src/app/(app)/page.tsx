import Link from "next/link";
import { Suspense } from "react";
import { asc, desc, eq } from "drizzle-orm";
import { EnvironmentOutlined, FlagOutlined, UserOutlined } from "@/components/icons";
import { db } from "@/db";
import { matches, players } from "@/db/schema";
import { getMonthlyLeaderboard, type LeaderboardRow } from "@/server/queries/stats";
import { isAdmin } from "@/server/auth";
import { MatchCard } from "@/components/match-card";
import { MonthlyRace } from "@/components/monthly-race";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, CardGridSkeleton } from "@/components/ui/skeleton";
import { NewSessionButton } from "@/components/entity-modals";

async function DashboardActions() {
  const [admin, allTeams, allVenues] = await Promise.all([
    isAdmin(),
    db.query.teams.findMany(),
    db.query.venues.findMany(),
  ]);
  if (!admin || allVenues.length < 1) return null;
  return <NewSessionButton venues={allVenues} teams={allTeams} />;
}

async function DashboardContent() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthLabel = monthStart.toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const [upcoming, recent, monthly, allTeams, allVenues, playerCount] =
    await Promise.all([
      db.query.matches.findMany({
        where: (m, { and, eq, gte }) => and(eq(m.status, "scheduled"), gte(m.kickoffAt, now)),
        orderBy: asc(matches.kickoffAt),
        limit: 5,
        with: { homeTeam: true, awayTeam: true, venue: true },
      }),
      db.query.matches.findMany({
        where: eq(matches.status, "completed"),
        orderBy: desc(matches.kickoffAt),
        limit: 3,
        with: { homeTeam: true, awayTeam: true, venue: true },
      }),
      getMonthlyLeaderboard(monthStart, monthEnd),
      db.query.teams.findMany(),
      db.query.venues.findMany(),
      db.$count(players),
    ]);

  const admin = await isAdmin();
  const teamCount = allTeams.length;
  const venueCount = allVenues.length;
  const canSchedule = admin && allVenues.length >= 1;
  const scheduleButton = canSchedule ? (
    <NewSessionButton venues={allVenues} teams={allTeams} />
  ) : undefined;

  const topScorers: LeaderboardRow[] = [...monthly]
    .filter((r) => r.goals > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
    .slice(0, 5);
  const topAssists: LeaderboardRow[] = [...monthly]
    .filter((r) => r.assists > 0)
    .sort((a, b) => b.assists - a.assists || b.goals - a.goals)
    .slice(0, 5);

  return (
    <>
      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Teams", value: teamCount, href: "/teams", icon: <FlagOutlined /> },
          { label: "Players", value: playerCount, href: "/players", icon: <UserOutlined /> },
          { label: "Venues", value: venueCount, href: "/venues", icon: <EnvironmentOutlined /> },
        ].map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="tv-card-sm group flex flex-col items-center gap-2 p-3 text-center transition-colors hover:border-cream-300 sm:flex-row sm:items-center sm:gap-4 sm:p-5 sm:text-left"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-burnt-500/12 text-base text-burnt-400 sm:h-11 sm:w-11 sm:text-lg">
              {card.icon}
            </span>
            <div className="min-w-0">
              <p className="scoreboard text-2xl font-bold leading-none text-ink-900 sm:text-3xl">
                {card.value}
              </p>
              <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-wider text-ink-500 sm:text-xs">
                {card.label}
              </p>
            </div>
          </Link>
        ))}
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          <section>
            <h2 className="font-display mb-3 text-xl text-ink-900">Upcoming fixtures</h2>
            {upcoming.length === 0 ? (
              <EmptyState
                title="No fixtures scheduled"
                hint={
                  canSchedule
                    ? "Book a venue and schedule your next match."
                    : "Add a venue first, then schedule a match."
                }
                action={scheduleButton}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {upcoming.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl text-ink-900">Latest results</h2>
              <Link href="/matches" className="text-sm font-bold text-burnt-400 hover:underline">
                All matches →
              </Link>
            </div>
            {recent.length === 0 ? (
              <EmptyState title="No results yet" hint="Record a result from a match page." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {recent.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-burnt-400">
                Monthly race
              </p>
              <h2 className="font-display text-xl text-ink-900">{monthLabel}</h2>
            </div>
            <Link href="/stats" className="text-sm font-bold text-burnt-400 hover:underline">
              Full stats →
            </Link>
          </div>
          <MonthlyRace
            title="🥇 Top scorer"
            metricLabel="goals"
            metric={(r) => r.goals}
            rows={topScorers}
          />
          <MonthlyRace
            title="🅰️ Assist maker"
            metricLabel="assists"
            metric={(r) => r.assists}
            rows={topAssists}
          />
        </section>
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="tv-card-sm h-20" />
        ))}
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <CardGridSkeleton count={4} />
        <Skeleton className="tv-card-sm h-64" />
      </div>
    </>
  );
}

export default function Dashboard() {
  return (
    <div>
      <PageHeader
        kicker="Matchday Control Room"
        title="Dashboard"
        actions={
          <Suspense fallback={null}>
            <DashboardActions />
          </Suspense>
        }
      />

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
