import Link from "next/link";
import { Suspense } from "react";
import { asc, gte, and, eq } from "drizzle-orm";
import { db } from "@/db";
import { matches, venues } from "@/db/schema";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { CardGridSkeleton } from "@/components/ui/skeleton";
import { NewVenueButton } from "@/components/entity-modals";
import { isAdmin } from "@/server/auth";

export const metadata = { title: "Venues" };

async function VenuesActions() {
  const admin = await isAdmin();
  return admin ? <NewVenueButton /> : null;
}

async function VenuesContent() {
  const now = new Date();
  const [admin, allVenues, upcoming] = await Promise.all([
    isAdmin(),
    db.query.venues.findMany({ orderBy: asc(venues.name) }),
    db.query.matches.findMany({
      where: and(eq(matches.status, "scheduled"), gte(matches.kickoffAt, now)),
      columns: { venueId: true },
    }),
  ]);

  const bookingCount = new Map<string, number>();
  for (const m of upcoming) {
    bookingCount.set(m.venueId, (bookingCount.get(m.venueId) ?? 0) + 1);
  }

  if (allVenues.length === 0) {
    return (
      <EmptyState
        title="No venues yet"
        hint="Add the grounds and halls you book for matches."
        action={admin ? <NewVenueButton label="New venue" /> : undefined}
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {allVenues.map((venue) => {
        const bookings = bookingCount.get(venue.id) ?? 0;
        return (
          <Link
            key={venue.id}
            href={`/venues/${venue.id}`}
            className="tv-card p-5 transition-transform hover:-translate-y-0.5"
          >
            <h2 className="font-display text-xl leading-tight">📍 {venue.name}</h2>
            <p className="mt-1 text-sm text-ink-500">
              {[venue.address, venue.city].filter(Boolean).join(", ") || "No address"}
            </p>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
                  bookings > 0 ? "bg-gold-400/20 text-gold-500" : "bg-cream-200 text-ink-500"
                }`}
              >
                {bookings} upcoming
              </span>
              {venue.capacity ? (
                <span className="scoreboard text-ink-500">cap. {venue.capacity}</span>
              ) : null}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default function VenuesPage() {
  return (
    <div>
      <PageHeader
        kicker="Grounds & bookings"
        title="Venues"
        actions={
          <Suspense fallback={null}>
            <VenuesActions />
          </Suspense>
        }
      />

      <Suspense fallback={<CardGridSkeleton count={6} />}>
        <VenuesContent />
      </Suspense>
    </div>
  );
}
