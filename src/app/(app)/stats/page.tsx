import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { getLeaderboard } from "@/server/queries/stats";
import { computeStandings } from "@/server/queries/standings";
import { PageHeader } from "@/components/ui/page-header";
import { StandingsTable } from "@/components/tables/standings-table";
import type { LeaderboardRow } from "@/server/queries/stats";

export const metadata = { title: "Stats" };

function Leaderboard({
  title,
  rows,
  metric,
  unit,
}: {
  title: string;
  rows: LeaderboardRow[];
  metric: (r: LeaderboardRow) => number;
  unit: string;
}) {
  const sorted = [...rows].sort((a, b) => metric(b) - metric(a)).slice(0, 8);
  return (
    <div className="tv-card overflow-hidden">
      <p className="bg-black/60 px-4 py-2.5 font-display text-gold-300">
        {title}
      </p>
      {sorted.length === 0 ? (
        <p className="p-4 text-sm text-ink-500">No data yet.</p>
      ) : (
        <ul>
          {sorted.map((row, i) => (
            <li
              key={row.playerId}
              className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0"
            >
              <span
                className={`scoreboard flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  i === 0 ? "bg-gold-300 text-black" : i < 3 ? "bg-cream-200" : "bg-cream-50"
                }`}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/players/${row.playerId}`}
                  className="block truncate text-sm font-bold hover:text-burnt-400"
                >
                  {row.name}
                </Link>
                <p className="truncate text-xs text-ink-500">{row.teamName ?? "Free agent"}</p>
              </div>
              <span className="scoreboard text-base font-bold text-burnt-400">
                {metric(row)} {unit}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function StatsPage() {
  const [allSports, leaderboard] = await Promise.all([
    db.query.sports.findMany({ with: { teams: true } }),
    getLeaderboard(),
  ]);

  const standingsBySport = await Promise.all(
    allSports.map(async (sport) => {
      const sportMatches = await db.query.matches.findMany({
        where: eq(matches.sportId, sport.id),
      });
      return { sport, rows: computeStandings(sport.teams, sportMatches) };
    }),
  );

  return (
    <div>
      <PageHeader kicker="League office" title="Stats & standings" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Leaderboard title="⚽ Top scorers" rows={leaderboard} metric={(r) => r.goals} unit="G" />
        <Leaderboard title="🅰️ Top assists" rows={leaderboard} metric={(r) => r.assists} unit="A" />
        <Leaderboard
          title="👟 Appearances"
          rows={leaderboard}
          metric={(r) => r.appearances}
          unit="apps"
        />
      </div>

      <section className="mt-10 space-y-8">
        {standingsBySport.map(({ sport, rows }) =>
          rows.length === 0 ? null : (
            <div key={sport.id}>
              <h2 className="font-display mb-3 text-xl text-ink-900">
                {sport.name} standings
              </h2>
              <StandingsTable rows={rows} />
            </div>
          ),
        )}
      </section>
    </div>
  );
}
