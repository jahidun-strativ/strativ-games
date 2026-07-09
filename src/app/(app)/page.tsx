import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { EnvironmentOutlined, FlagOutlined, UserOutlined } from "@/components/icons";
import { db } from "@/db";
import { matches, players } from "@/db/schema";
import { getMonthlyLeaderboard, type LeaderboardRow } from "@/server/queries/stats";
import { MatchCard } from "@/components/match-card";
import { MonthlyRace } from "@/components/monthly-race";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { NewMatchButton } from "@/components/entity-modals";

export default async function Dashboard() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthLabel = monthStart.toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const [upcoming, recent, monthly, allSports, allTeams, allVenues, playerCount] =
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
      db.query.sports.findMany(),
      db.query.teams.findMany(),
      db.query.venues.findMany(),
      db.$count(players),
    ]);

  const teamCount = allTeams.length;
  const venueCount = allVenues.length;
  const canSchedule = allVenues.length >= 1;
  const scheduleButton = canSchedule ? (
    <NewMatchButton sports={allSports} teams={allTeams} venues={allVenues} />
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
    <div>
      <PageHeader
        kicker="Matchday Control Room"
        title="Dashboard"
        actions={scheduleButton}
      />

      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Teams", value: teamCount, href: "/teams", icon: <FlagOutlined /> },
          { label: "Players", value: playerCount, href: "/players", icon: <UserOutlined /> },
          { label: "Venues", value: venueCount, href: "/venues", icon: <EnvironmentOutlined /> },
        ].map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="tv-card-sm group flex items-center gap-4 p-5 transition-colors hover:border-cream-300"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-burnt-500/12 text-lg text-burnt-400">
              {card.icon}
            </span>
            <div>
              <p className="scoreboard text-3xl font-bold leading-none text-ink-900">
                {card.value}
              </p>
              <p className="mt-1.5 text-xs font-semibold uppercase tracking-wider text-ink-500">
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
    </div>
  );
}
