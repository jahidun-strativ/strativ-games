import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  cancelMatch,
  deleteMatch,
  recordResult,
  rescheduleMatch,
} from "@/server/actions/matches";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Scoreboard } from "@/components/ui/scoreboard";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { EditMatchButton } from "@/components/entity-modals";
import { ResultForm } from "@/components/result-form";
import { RescheduleForm } from "@/components/reschedule-form";
import { formatFull } from "@/lib/format";

export const metadata = { title: "Match" };

export default async function MatchDetailPage({
  params,
}: PageProps<"/matches/[id]">) {
  const { id } = await params;
  const [match, allSports, allTeams, allVenues] = await Promise.all([
    db.query.matches.findFirst({
      where: (m, { eq }) => eq(m.id, id),
      with: {
        homeTeam: { with: { players: { orderBy: (p, { asc }) => asc(p.squadNumber) } } },
        awayTeam: { with: { players: { orderBy: (p, { asc }) => asc(p.squadNumber) } } },
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

  const hasTeams = Boolean(match.homeTeam && match.awayTeam);
  const heading = hasTeams
    ? `${match.homeTeam!.name} v ${match.awayTeam!.name}`
    : match.title || "Match — teams TBD";
  const kicker = [match.sport?.name, formatFull(match.kickoffAt)]
    .filter(Boolean)
    .join(" · ");

  const editButton = (
    <EditMatchButton
      sports={allSports}
      teams={allTeams}
      venues={allVenues}
      match={match}
      label={hasTeams ? "Edit match" : "Assign teams"}
    />
  );

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

      {/* Big scoreboard */}
      <section className="tv-card glossy p-6 text-center">
        <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <p className="font-display text-xl sm:text-right">
            {match.homeTeam?.name ?? "TBD"}
          </p>
          <Scoreboard home={match.homeScore} away={match.awayScore} size="lg" />
          <p className="font-display text-xl sm:text-left">
            {match.awayTeam?.name ?? "TBD"}
          </p>
        </div>
        <p className="mt-4 inline-flex items-center gap-1 rounded-full bg-pitch-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
          📍{" "}
          <Link href={`/venues/${match.venue.id}`} className="hover:underline">
            {match.venue.name}
            {match.venue.city ? `, ${match.venue.city}` : ""}
          </Link>
        </p>
        {match.notes ? <p className="mt-3 text-sm text-ink-500">{match.notes}</p> : null}
      </section>

      {match.status !== "cancelled" ? (
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
    </div>
  );
}
