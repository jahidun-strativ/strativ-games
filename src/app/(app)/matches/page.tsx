import { Suspense } from "react";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { MatchCard } from "@/components/match-card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { FilterBarSkeleton, CardGridSkeleton } from "@/components/ui/skeleton";
import { NewMatchButton } from "@/components/entity-modals";
import { isAdmin } from "@/server/auth";
import { formatDate } from "@/lib/format";
import type { MatchWithRefs } from "@/components/match-card";

export const metadata = { title: "Matches" };

function groupByDate(list: MatchWithRefs[]) {
  const groups = new Map<string, MatchWithRefs[]>();
  for (const m of list) {
    const key = formatDate(m.kickoffAt);
    const group = groups.get(key) ?? [];
    group.push(m);
    groups.set(key, group);
  }
  return [...groups.entries()];
}

// Only admins with at least one venue can schedule; lives in the header, so it
// gets its own Suspense boundary and never delays the page title.
async function MatchesActions() {
  const [admin, allSports, allTeams, allVenues] = await Promise.all([
    isAdmin(),
    db.query.sports.findMany(),
    db.query.teams.findMany(),
    db.query.venues.findMany(),
  ]);
  if (!admin || allVenues.length < 1) return null;
  return <NewMatchButton sports={allSports} teams={allTeams} venues={allVenues} />;
}

async function MatchesContent({
  searchParams,
}: {
  searchParams: PageProps<"/matches">["searchParams"];
}) {
  const { sport: sportFilter, kind: kindFilter } = await searchParams;
  const sportId = typeof sportFilter === "string" && sportFilter !== "" ? sportFilter : null;
  const kind = typeof kindFilter === "string" && kindFilter !== "" ? kindFilter : null;

  const [allMatches, allSports, allTeams, allVenues] = await Promise.all([
    db.query.matches.findMany({
      orderBy: asc(matches.kickoffAt),
      with: { homeTeam: true, awayTeam: true, venue: true },
    }),
    db.query.sports.findMany(),
    db.query.teams.findMany(),
    db.query.venues.findMany(),
  ]);

  const admin = await isAdmin();
  const canSchedule = admin && allVenues.length >= 1;
  const scheduleButton = canSchedule ? (
    <NewMatchButton sports={allSports} teams={allTeams} venues={allVenues} />
  ) : undefined;

  const filtered = allMatches.filter(
    (m) => (!sportId || m.sportId === sportId) && (!kind || m.kind === kind),
  );
  const now = new Date();
  const upcoming = filtered.filter((m) => m.status === "scheduled" && m.kickoffAt >= now);
  const results = filtered
    .filter((m) => m.status !== "scheduled" || m.kickoffAt < now)
    .sort((a, b) => b.kickoffAt.getTime() - a.kickoffAt.getTime());

  return (
    <>
      <FilterBar
        filters={[
          {
            param: "kind",
            placeholder: "All types",
            options: [
              { value: "internal", label: "Internal" },
              { value: "competitive", label: "Competitive" },
            ],
          },
          {
            param: "sport",
            placeholder: "All sports",
            options: allSports.map((s) => ({ value: s.id, label: s.name })),
          },
        ]}
      />

      <section>
        <h2 className="font-display mb-3 text-xl text-ink-900">Upcoming fixtures</h2>
        {upcoming.length === 0 ? (
          <EmptyState
            title="Nothing scheduled"
            hint={
              canSchedule
                ? "Book a venue and set up the next fixture."
                : "Add a venue first, then you can schedule fixtures."
            }
            action={scheduleButton}
          />
        ) : (
          <div className="space-y-6">
            {groupByDate(upcoming).map(([date, dayMatches]) => (
              <div key={date}>
                <p className="scoreboard mb-2 inline-block rounded-md bg-black/60 px-2.5 py-1 text-xs font-bold uppercase text-gold-300">
                  {date}
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {dayMatches.map((m) => (
                    <MatchCard key={m.id} match={m} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display mb-3 text-xl text-ink-900">Results & past</h2>
        {results.length === 0 ? (
          <p className="text-sm text-ink-500">No results yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export default function MatchesPage({ searchParams }: PageProps<"/matches">) {
  return (
    <div>
      <PageHeader
        kicker="Fixtures & results"
        title="Matches"
        actions={
          <Suspense fallback={null}>
            <MatchesActions />
          </Suspense>
        }
      />

      <Suspense
        fallback={
          <>
            <FilterBarSkeleton />
            <CardGridSkeleton count={6} />
          </>
        }
      >
        <MatchesContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
