import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { MatchCard } from "@/components/match-card";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { StatusBadge } from "@/components/ui/status-badge";
import { deleteSession, resendSessionNotification } from "@/server/actions/sessions";
import { NotifyButton } from "@/components/notify-button";
import { PosterButton, type PosterVariant } from "@/components/poster-button";
import { CostSplit } from "@/components/cost-split";
import { isAdmin, getCurrentPlayer } from "@/server/auth";
import { deriveSessionPayers } from "@/server/queries/session-costs";
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
        with: {
          homeTeam: true,
          awayTeam: true,
          venue: true,
          // Who played each game — the cost split is derived from these.
          playerStats: {
            columns: { playerId: true, played: true },
            with: { player: { columns: { name: true } } },
          },
        },
      },
    },
  });
  if (!session) notFound();
  const admin = await isAdmin();

  // Cost-split members are exactly the players who played this slot's games;
  // sessionPayments only carries paid/unpaid status.
  const [payments, myPlayer] = await Promise.all([
    db.query.sessionPayments.findMany({
      where: (p, { eq }) => eq(p.sessionId, id),
      columns: { playerId: true, paid: true },
    }),
    getCurrentPlayer(),
  ]);
  const payers = deriveSessionPayers(session.fixtures, payments);

  const external = session.kind === "competitive";
  const gameCount = session.fixtures.length;
  const hasTeams = session.fixtures.some((f) => f.homeTeamId && f.awayTeamId);
  const posterVariants: PosterVariant[] = external
    ? [
        { label: "Match poster", variant: "vs", hint: "Strativ vs opponent" },
        { label: "Team sheet", variant: "squad", hint: "Strativ line-up" },
      ]
    : [{ label: "Match day poster", variant: "full", hint: "All teams + players" }];

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

      {session.cost != null ? (
        <section className="mt-8">
          <h2 className="font-display mb-3 text-xl text-ink-900">Cost split</h2>
          {session.paidBy === "office" ? (
            <div className="tv-card-sm p-5 text-sm text-ink-500">
              Covered by the office ({formatBdt(session.cost)}) — nothing to split.
            </div>
          ) : (
            <CostSplit
              sessionId={session.id}
              cost={session.cost}
              payers={payers}
              currentPlayerId={myPlayer?.id ?? null}
              canManage={admin}
            />
          )}
        </section>
      ) : null}

      {admin && hasTeams ? (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <PosterButton basePath={`/sessions/${session.id}/poster`} variants={posterVariants} />
          <span className="text-xs text-ink-500">
            Shareable match-day picture with {external ? "the teams" : "all teams"} and player list.
          </span>
        </div>
      ) : null}

      {admin ? (
        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <NotifyButton
            action={resendSessionNotification.bind(null, session.id)}
            label="📣 Send notification"
          />
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
