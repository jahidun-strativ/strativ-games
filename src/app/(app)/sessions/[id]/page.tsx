import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { MatchCard } from "@/components/match-card";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { StatusBadge } from "@/components/ui/status-badge";
import { deleteSession } from "@/server/actions/sessions";
import { isAdmin } from "@/server/auth";
import { formatFull, formatBdt, paidByLabel } from "@/lib/format";

export const metadata = { title: "Session" };

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await db.query.sessions.findFirst({
    where: (s, { eq }) => eq(s.id, id),
    with: {
      venue: true,
      fixtures: {
        orderBy: (f, { asc }) => asc(f.orderIndex),
        with: { homeTeam: true, awayTeam: true, venue: true },
      },
    },
  });
  if (!session) notFound();
  const admin = await isAdmin();

  const external = session.kind === "competitive";
  const gameCount = session.fixtures.length;

  return (
    <div>
      <PageHeader
        kicker="Booked slot"
        title={
          session.title ||
          (external
            ? "Competitive match"
            : gameCount > 1
              ? `${gameCount}-game round-robin`
              : "Internal match")
        }
        actions={
          <>
            <ButtonLink variant="secondary" href={`/venues/${session.venue.id}`}>
              Venue
            </ButtonLink>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        <StatusBadge status={session.status} />
        <span className="tv-card-sm px-3 py-1.5">🕒 {formatFull(session.startAt)}</span>
        <span className="tv-card-sm px-3 py-1.5">
          📍 {session.venue.name}
          {session.venue.city ? `, ${session.venue.city}` : ""}
        </span>
        {session.cost != null ? (
          <span className="tv-card-sm px-3 py-1.5">
            {formatBdt(session.cost)}
            <span className="text-ink-400"> · </span>
            {paidByLabel(session.paidBy)}
          </span>
        ) : null}
      </div>

      {session.notes ? (
        <p className="mb-6 text-sm text-ink-500">{session.notes}</p>
      ) : null}

      <h2 className="font-display mb-3 text-xl text-ink-900">
        {gameCount > 1 ? "Games" : "Game"}{" "}
        <span className="text-sm text-ink-500">({gameCount})</span>
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {session.fixtures.map((f) => (
          <div key={f.id}>
            {f.durationMin ? (
              <p className="mb-1 text-xs font-semibold text-ink-400">
                {f.durationMin} min{f.breakMin ? ` · ${f.breakMin} min break` : ""}
              </p>
            ) : null}
            <MatchCard match={f} />
          </div>
        ))}
      </div>

      {admin ? (
        <div className="mt-8 flex items-center gap-3 border-t border-line pt-4">
          <ConfirmDelete
            action={deleteSession.bind(null, session.id)}
            label="Delete slot"
            confirmMessage="Delete this booking and all its games? This can't be undone."
          />
          <Link href="/matches" className="text-sm font-semibold text-burnt-400 hover:underline">
            ← All matches
          </Link>
        </div>
      ) : null}
    </div>
  );
}
