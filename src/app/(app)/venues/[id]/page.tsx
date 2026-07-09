import { notFound } from "next/navigation";
import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { deleteVenue } from "@/server/actions/venues";
import { MatchCard } from "@/components/match-card";
import { PageHeader } from "@/components/ui/page-header";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { EmptyState } from "@/components/ui/empty-state";
import { EditVenueButton, NewMatchButton } from "@/components/entity-modals";

export const metadata = { title: "Venue" };

export default async function VenueDetailPage({
  params,
}: PageProps<"/venues/[id]">) {
  const { id } = await params;
  const venue = await db.query.venues.findFirst({ where: (v, { eq }) => eq(v.id, id) });
  if (!venue) notFound();

  const now = new Date();
  const [upcoming, past, allSports, allTeams, allVenues] = await Promise.all([
    db.query.matches.findMany({
      where: and(eq(matches.venueId, id), gte(matches.kickoffAt, now)),
      orderBy: asc(matches.kickoffAt),
      with: { homeTeam: true, awayTeam: true, venue: true },
    }),
    db.query.matches.findMany({
      where: and(eq(matches.venueId, id), lt(matches.kickoffAt, now)),
      orderBy: desc(matches.kickoffAt),
      limit: 6,
      with: { homeTeam: true, awayTeam: true, venue: true },
    }),
    db.query.sports.findMany(),
    db.query.teams.findMany(),
    db.query.venues.findMany(),
  ]);

  const canSchedule = allVenues.length >= 1;

  return (
    <div>
      <PageHeader
        kicker={[venue.address, venue.city].filter(Boolean).join(", ") || "Venue"}
        title={venue.name}
        actions={<EditVenueButton venue={venue} />}
      />

      <div className="mb-6 flex flex-wrap gap-3 text-sm">
        {venue.capacity ? (
          <span className="tv-card-sm px-3 py-1.5">
            Capacity: <span className="scoreboard font-bold">{venue.capacity}</span>
          </span>
        ) : null}
        {venue.notes ? (
          <span className="tv-card-sm bg-gold-400/15 px-3 py-1.5 text-ink-700">📝 {venue.notes}</span>
        ) : null}
      </div>

      <section>
        <h2 className="font-display mb-3 text-xl text-ink-900">
          Upcoming bookings <span className="text-sm text-ink-500">({upcoming.length})</span>
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState
            title="No upcoming bookings"
            hint="Schedule a match to book this venue."
            action={
              canSchedule ? (
                <NewMatchButton sports={allSports} teams={allTeams} venues={allVenues} />
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-display mb-3 text-xl text-ink-900">Past matches here</h2>
        {past.length === 0 ? (
          <p className="text-sm text-ink-500">No matches played here yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        )}
      </section>

      <div className="mt-8 border-t border-line pt-4">
        <ConfirmDelete
          action={deleteVenue.bind(null, venue.id)}
          label="Delete venue"
          confirmMessage={`Delete ${venue.name}? Venues with matches cannot be deleted.`}
        />
      </div>
    </div>
  );
}
