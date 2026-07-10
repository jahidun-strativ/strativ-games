import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  cancelMatch,
  deleteMatch,
  recordResult,
  rescheduleMatch,
  resendMatchNotification,
} from "@/server/actions/matches";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Scoreboard } from "@/components/ui/scoreboard";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { NotifyButton } from "@/components/notify-button";
import { EditMatchButton } from "@/components/entity-modals";
import { ResultForm } from "@/components/result-form";
import { RescheduleForm } from "@/components/reschedule-form";
import { formatFull, formatBdt, paidByLabel } from "@/lib/format";
import { isAdmin } from "@/server/auth";

export const metadata = { title: "Match" };

export default async function MatchDetailPage({
  params,
}: PageProps<"/matches/[id]">) {
  const { id } = await params;
  const [match, allSports, allTeams, allVenues] = await Promise.all([
    db.query.matches.findFirst({
      where: (m, { eq }) => eq(m.id, id),
      with: {
        homeTeam: { with: { players: { orderBy: (p, { asc }) => asc(p.name) } } },
        awayTeam: { with: { players: { orderBy: (p, { asc }) => asc(p.name) } } },
        venue: true,
        sport: true,
        playerStats: true,
      },
    }),
    db.query.sports.findMany(),
    db.query.teams.findMany(),
    db.query.venues.findMany(),
  ]);
  if (!match) notFound();

  const admin = await isAdmin();
  const hasTeams = Boolean(match.homeTeam && match.awayTeam);
  const heading = hasTeams
    ? `${match.homeTeam!.name} v ${match.awayTeam!.name}`
    : match.title || "Match — teams TBD";
  const kicker = [match.sport?.name, formatFull(match.kickoffAt)]
    .filter(Boolean)
    .join(" · ");

  const editButton = admin ? (
    <EditMatchButton
      sports={allSports}
      teams={allTeams}
      venues={allVenues}
      match={match}
      label={hasTeams ? "Edit match" : "Assign teams"}
    />
  ) : null;

  return (
    <div>
      <PageHeader
        kicker={kicker}
        title={heading}
        actions={
          <>
            {editButton}
            <StatusBadge status={match.status} />
          </>
        }
      />

      {/* Match hero */}
      <section className="tv-card glossy p-6 text-center sm:p-8">
        {match.kind === "competitive" ? (
          <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.3em] text-burnt-400">
            Competitive
          </p>
        ) : null}
        <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <p className="font-display text-2xl leading-tight sm:text-right">
            {match.homeTeam?.name ?? "TBD"}
          </p>
          <Scoreboard home={match.homeScore} away={match.awayScore} size="lg" />
          <p className="font-display text-2xl leading-tight sm:text-left">
            {match.awayTeam?.name ?? "TBD"}
          </p>
        </div>

        {/* Meta chips */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold">
          <Link
            href={`/venues/${match.venue.id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-cream-200 px-3 py-1 uppercase tracking-wide !text-ink-700 transition-colors hover:!text-burnt-400"
          >
            <span aria-hidden>📍</span>
            {match.venue.name}
            {match.venue.city ? `, ${match.venue.city}` : ""}
          </Link>
          {match.cost != null ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-cream-200 px-3 py-1 uppercase tracking-wide text-ink-700">
              {formatBdt(match.cost)}
              <span className="text-ink-400">·</span>
              {paidByLabel(match.paidBy)}
            </span>
          ) : null}
          {match.sessionId ? (
            <Link
              href={`/sessions/${match.sessionId}`}
              className="inline-flex items-center gap-1 rounded-full border border-burnt-500/30 bg-burnt-500/10 px-3 py-1 uppercase tracking-wide !text-burnt-400 transition-colors hover:!bg-burnt-500/20"
            >
              In a slot →
            </Link>
          ) : null}
        </div>
        {match.notes ? (
          <p className="mx-auto mt-4 max-w-prose text-sm text-ink-500">{match.notes}</p>
        ) : null}
      </section>

      {admin && match.status !== "cancelled" ? (
        <section className="mt-8">
          <h2 className="font-display mb-3 text-xl text-ink-900">
            {match.status === "completed" ? "Edit result" : "Record result"}
          </h2>
          {hasTeams ? (
            <ResultForm
              action={recordResult.bind(null, match.id)}
              homeTeamName={match.homeTeam!.name}
              awayTeamName={match.awayTeam!.name}
              homeSquad={match.homeTeam!.players}
              awaySquad={match.awayTeam!.players}
              stats={match.playerStats}
              homeScore={match.homeScore}
              awayScore={match.awayScore}
              completed={match.status === "completed"}
            />
          ) : (
            <div className="tv-card-sm flex flex-col items-start gap-3 p-5">
              <p className="text-sm text-ink-500">
                Assign both teams before recording a result and player stats.
              </p>
              {editButton}
            </div>
          )}
        </section>
      ) : null}

      {admin ? (
        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="tv-card-sm p-5">
            <h2 className="font-display mb-3 text-lg text-ink-900">Reschedule / move venue</h2>
            <RescheduleForm
              action={rescheduleMatch.bind(null, match.id)}
              venues={allVenues}
              currentVenueId={match.venueId}
              currentKickoff={match.kickoffAt}
            />
          </div>

          <div className="tv-card-sm flex flex-col justify-between gap-3 p-5">
            <h2 className="font-display text-lg text-ink-900">Admin</h2>
            <NotifyButton
              action={resendMatchNotification.bind(null, match.id)}
              label="📣 Send notification"
            />
            {match.status !== "cancelled" ? (
              <form action={cancelMatch.bind(null, match.id)}>
                <Button type="submit" variant="secondary">
                  Cancel match
                </Button>
              </form>
            ) : (
              <p className="text-sm text-ink-500">
                Match is cancelled. Reschedule it to put it back on the calendar.
              </p>
            )}
            <div>
              <ConfirmDelete
                action={deleteMatch.bind(null, match.id)}
                label="Delete match"
                confirmMessage="Delete this match and its player stats?"
              />
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
