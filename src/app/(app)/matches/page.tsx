import { Suspense } from "react";
import { asc, isNull } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { MatchCard } from "@/components/match-card";
import { SlotCard, type SlotWithFixtures } from "@/components/slot-card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { FilterBarSkeleton, CardGridSkeleton } from "@/components/ui/skeleton";
import { NewSessionButton } from "@/components/entity-modals";
import { isAdmin } from "@/server/auth";

export const metadata = { title: "Matches" };

// Only admins with at least one venue can schedule; lives in the header, so it
// gets its own Suspense boundary and never delays the page title.
async function MatchesActions() {
  const [admin, allTeams, allVenues] = await Promise.all([
    isAdmin(),
    db.query.teams.findMany(),
    db.query.venues.findMany(),
  ]);
  if (!admin || allVenues.length < 1) return null;
  return <NewSessionButton venues={allVenues} teams={allTeams} />;
}

async function MatchesContent({
  searchParams,
}: {
  searchParams: PageProps<"/matches">["searchParams"];
}) {
  const { sport: sportFilter, kind: kindFilter } = await searchParams;
  const sportId = typeof sportFilter === "string" && sportFilter !== "" ? sportFilter : null;
  const kind = typeof kindFilter === "string" && kindFilter !== "" ? kindFilter : null;

  const [allSlots, standaloneMatches, allSports, allTeams, allVenues] = await Promise.all([
    // Slots group their games; each fixture keeps its own teams/scores.
    db.query.sessions.findMany({
      with: {
        venue: true,
        fixtures: {
          orderBy: (f, { asc }) => asc(f.orderIndex),
          with: { homeTeam: true, awayTeam: true, venue: true },
        },
      },
    }),
    // Legacy matches created before slots existed have no session.
    db.query.matches.findMany({
      where: isNull(matches.sessionId),
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
    <NewSessionButton venues={allVenues} teams={allTeams} />
  ) : undefined;

  const now = new Date();

  // A slot's status is derived from its games: done when all are, scheduled
  // while any still is. Used to bucket slots into upcoming vs results.
  const slotStatus = (s: SlotWithFixtures) => {
    if (s.fixtures.length === 0) return "scheduled";
    if (s.fixtures.every((f) => f.status === "completed")) return "completed";
    if (s.fixtures.every((f) => f.status === "cancelled")) return "cancelled";
    return "scheduled";
  };

  // Unified feed: each item is a whole slot or a legacy standalone match, with a
  // representative time + status so the two kinds bucket and sort together.
  type Item =
    | { kind: "slot"; at: Date; status: string; slot: SlotWithFixtures }
    | { kind: "match"; at: Date; status: string; match: (typeof standaloneMatches)[number] };

  const slotItems: Item[] = allSlots
    .filter((s) => (!sportId || s.sportId === sportId) && (!kind || s.kind === kind))
    .map((s) => ({ kind: "slot", at: s.startAt, status: slotStatus(s), slot: s }));
  const matchItems: Item[] = standaloneMatches
    .filter((m) => (!sportId || m.sportId === sportId) && (!kind || m.kind === kind))
    .map((m) => ({ kind: "match", at: m.kickoffAt, status: m.status, match: m }));
  const items = [...slotItems, ...matchItems];

  const upcoming = items
    .filter((it) => it.status === "scheduled" && it.at >= now)
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  const results = items
    .filter((it) => it.status !== "scheduled" || it.at < now)
    .sort((a, b) => b.at.getTime() - a.at.getTime());

  const renderItem = (it: Item) =>
    it.kind === "slot" ? (
      <SlotCard key={`s-${it.slot.id}`} slot={it.slot} status={it.status} />
    ) : (
      <MatchCard key={`m-${it.match.id}`} match={it.match} />
    );

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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map(renderItem)}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display mb-3 text-xl text-ink-900">Results & past</h2>
        {results.length === 0 ? (
          <p className="text-sm text-ink-500">No results yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.map(renderItem)}
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
