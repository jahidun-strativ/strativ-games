import Link from "next/link";
import { Suspense } from "react";
import { Goal, Handshake, Footprints } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { getLeaderboard } from "@/server/queries/stats";
import { computeCompetitiveRecord, computeStandings } from "@/server/queries/standings";
import { PageHeader } from "@/components/ui/page-header";
import { CardGridSkeleton } from "@/components/ui/skeleton";
import { StandingsTable } from "@/components/tables/standings-table";
import type { LeaderboardRow } from "@/server/queries/stats";

export const metadata = { title: "Stats" };

function Leaderboard({
  title,
  rows,
  metric,
  unit,
}: {
  title: React.ReactNode;
  rows: LeaderboardRow[];
  metric: (r: LeaderboardRow) => number;
  unit: string;
}) {
  const sorted = [...rows].sort((a, b) => metric(b) - metric(a)).slice(0, 8);
  return (
    <div className="tv-card overflow-hidden">
      <p className="flex items-center gap-2 bg-black/60 px-4 py-2.5 font-display text-gold-300">
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

async function StatsContent() {
  const [allSports, leaderboard] = await Promise.all([
    db.query.sports.findMany({ with: { teams: true } }),
    getLeaderboard(),
  ]);

  const standingsBySport = await Promise.all(
    allSports.map(async (sport) => {
      const sportMatches = await db.query.matches.findMany({
        where: eq(matches.sportId, sport.id),
        with: { session: { columns: { seasonId: true } } },
      });
      const internalTeams = sport.teams.filter((t) => t.kind !== "external");
      // League matchdays have their own table on /league — keep them out of the
      // general internal standings so "regular" and "league" stay separate.
      const internal = computeStandings(
        internalTeams,
        sportMatches.filter((m) => m.kind === "internal" && !m.session?.seasonId),
      );
      const competitive = computeCompetitiveRecord(
        internalTeams,
        sportMatches.filter((m) => m.kind === "competitive"),
      );
      return { sport, internal, competitive };
    }),
  );

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Leaderboard
          title={<><Goal className="h-4 w-4" /> Top scorers</>}
          rows={leaderboard}
          metric={(r) => r.goals}
          unit="G"
        />
        <Leaderboard
          title={<><Handshake className="h-4 w-4" /> Top assists</>}
          rows={leaderboard}
          metric={(r) => r.assists}
          unit="A"
        />
        <Leaderboard
          title={<><Footprints className="h-4 w-4" /> Appearances</>}
          rows={leaderboard}
          metric={(r) => r.appearances}
          unit="apps"
        />
      </div>

      <section className="mt-10 space-y-8">
        {standingsBySport.map(({ sport, internal, competitive }) =>
          internal.length === 0 && competitive.length === 0 ? null : (
            <div key={sport.id} className="space-y-6">
              {internal.length > 0 ? (
                <div>
                  <h2 className="font-display mb-3 text-xl text-ink-900">
                    {sport.name} — internal league
                  </h2>
                  <StandingsTable rows={internal} />
                </div>
              ) : null}
              {competitive.length > 0 ? (
                <div>
                  <h2 className="font-display mb-1 text-xl text-ink-900">
                    {sport.name} — competitive record
                  </h2>
                  <p className="mb-3 text-sm text-ink-500">
                    Strativ teams&apos; results against external opponents.
                  </p>
                  <StandingsTable rows={competitive} />
                </div>
              ) : null}
            </div>
          ),
        )}
      </section>
    </>
  );
}

export default function StatsPage() {
  return (
    <div>
      <PageHeader kicker="League office" title="Stats & standings" />

      <Suspense fallback={<CardGridSkeleton count={3} height="h-64" />}>
        <StatsContent />
      </Suspense>
    </div>
  );
}
