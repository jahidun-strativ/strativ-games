import Link from "next/link";
import { notFound } from "next/navigation";
import { isNotNull } from "drizzle-orm";
import { Trophy } from "lucide-react";
import { db } from "@/db";
import { appUsers, players } from "@/db/schema";
import { recordResult, rescheduleMatch, cancelMatch } from "@/server/actions/matches";
import { getSession, isAdmin, canSetLineup } from "@/server/auth";
import { getEffectiveSquad } from "@/server/queries/match-squad";
import { getMatchEvents } from "@/server/queries/match-events";
import { ResultForm } from "@/components/result-form";
import { RescheduleForm } from "@/components/reschedule-form";
import { LiveScorecard } from "@/components/league/live-scorecard";
import { MatchTimeline } from "@/components/league/match-timeline";
import { ScorerPicker } from "@/components/league/scorer-picker";
import { Button } from "@/components/ui/button";
import { Scoreboard } from "@/components/ui/scoreboard";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatFull } from "@/lib/format";

export const metadata = { title: "Manage match" };
export const dynamic = "force-dynamic";

export default async function LeagueMatchManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [match, allVenues] = await Promise.all([
    db.query.matches.findFirst({
      where: (m, { eq }) => eq(m.id, id),
      with: {
        homeTeam: true,
        awayTeam: true,
        venue: true,
        playerStats: true,
        session: { columns: { title: true }, with: { season: { columns: { id: true, name: true } } } },
      },
    }),
    db.query.venues.findMany(),
  ]);
  if (!match) notFound();
  const league = match.session?.season ?? null;
  if (!league) notFound(); // this manager is league-matches only

  const [admin, session, events] = await Promise.all([isAdmin(), getSession(), getMatchEvents(id)]);
  const hasTeams = Boolean(match.homeTeam && match.awayTeam);
  const editorSides = await Promise.all(
    [match.homeTeam, match.awayTeam].map((t) =>
      t && t.kind !== "external" ? canSetLineup(t.id) : Promise.resolve(false),
    ),
  );
  const isAssignedScorer = Boolean(match.scorerUserId && session?.user?.id === match.scorerUserId);
  const canScore = admin || isAssignedScorer || editorSides.some(Boolean);

  const [homeSquad, awaySquad] =
    hasTeams && match.homeTeamId && match.awayTeamId
      ? await Promise.all([
          getEffectiveSquad(id, match.homeTeamId),
          getEffectiveSquad(id, match.awayTeamId),
        ])
      : [{ players: [] }, { players: [] }];

  // Admin's assign-scorer picker: every app user, labelled by their player name.
  const scorerOptions = admin
    ? await (async () => {
        const [users, named] = await Promise.all([
          db.select({ userId: appUsers.userId, email: appUsers.email }).from(appUsers),
          db
            .select({ userId: players.userId, name: players.name })
            .from(players)
            .where(isNotNull(players.userId)),
        ]);
        const nameByUser = new Map(named.map((n) => [n.userId, n.name] as const));
        return users.map((u) => ({ userId: u.userId, label: nameByUser.get(u.userId) ?? u.email }));
      })()
    : [];

  return (
    <div className="space-y-8">
      <Link
        href="/league/matches"
        className="inline-flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-burnt-400"
      >
        ← Matches
      </Link>

      {/* League match hero */}
      <section className="tv-card glossy overflow-hidden p-6 text-center ring-1 ring-gold-400/40 sm:p-8">
        <div className="-mx-6 -mt-6 mb-6 flex flex-wrap items-center justify-center gap-2 border-b border-gold-400/30 bg-gradient-to-r from-gold-400/25 via-burnt-500/15 to-gold-400/25 px-6 py-3 sm:-mx-8 sm:-mt-8 sm:px-8">
          <Trophy className="h-4 w-4 text-gold-300" />
          <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-gold-300">
            {league.name}
          </span>
          {match.session?.title ? (
            <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-ink-500">
              · {match.session.title}
            </span>
          ) : null}
        </div>
        <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <p className="font-display text-2xl leading-tight sm:text-right">
            {match.homeTeam?.name ?? "TBD"}
          </p>
          <Scoreboard home={match.homeScore} away={match.awayScore} size="lg" />
          <p className="font-display text-2xl leading-tight sm:text-left">
            {match.awayTeam?.name ?? "TBD"}
          </p>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-ink-500">
          <span>{formatFull(match.kickoffAt)}</span>
          <span className="text-ink-400">·</span>
          <span>
            {match.venue.name}
            {match.venue.city ? `, ${match.venue.city}` : ""}
          </span>
          <StatusBadge status={match.status} />
        </div>
      </section>

      {/* Live scorecard while the match is in progress */}
      {hasTeams && match.status === "scheduled" ? (
        canScore ? (
          <section>
            <h2 className="font-display mb-3 text-xl text-ink-900">Live scorecard</h2>
            <LiveScorecard
              matchId={match.id}
              home={{
                teamId: match.homeTeamId!,
                teamName: match.homeTeam!.name,
                players: homeSquad.players.map((p) => ({ id: p.id, name: p.name, position: p.position })),
                goalkeeperIds: match.homeTeam!.goalkeeperIds,
              }}
              away={{
                teamId: match.awayTeamId!,
                teamName: match.awayTeam!.name,
                players: awaySquad.players.map((p) => ({ id: p.id, name: p.name, position: p.position })),
                goalkeeperIds: match.awayTeam!.goalkeeperIds,
              }}
              events={events}
            />
          </section>
        ) : events.length > 0 ? (
          <section className="tv-card-sm overflow-hidden">
            <div className="border-b border-line px-4 py-2.5">
              <h2 className="font-display text-lg text-ink-900">Live timeline</h2>
            </div>
            <MatchTimeline
              events={events}
              homeTeamId={match.homeTeamId}
              homeTeamName={match.homeTeam!.name}
              awayTeamName={match.awayTeam!.name}
              live
            />
          </section>
        ) : null
      ) : null}

      {/* Completed: show the timeline, plus the aggregate editor for scorers */}
      {hasTeams && match.status === "completed" ? (
        <section className="space-y-6">
          {events.length > 0 ? (
            <div className="tv-card-sm overflow-hidden">
              <div className="border-b border-line px-4 py-2.5">
                <h2 className="font-display text-lg text-ink-900">Timeline</h2>
              </div>
              <MatchTimeline
                events={events}
                homeTeamId={match.homeTeamId}
                homeTeamName={match.homeTeam!.name}
                awayTeamName={match.awayTeam!.name}
              />
            </div>
          ) : null}
          {canScore ? (
            <div>
              <h2 className="font-display mb-3 text-xl text-ink-900">Edit result</h2>
              <ResultForm
                action={recordResult.bind(null, match.id)}
                homeTeamName={match.homeTeam!.name}
                awayTeamName={match.awayTeam!.name}
                homeSquad={homeSquad.players}
                awaySquad={awaySquad.players}
                stats={match.playerStats}
                homeScore={match.homeScore}
                awayScore={match.awayScore}
                completed
              />
            </div>
          ) : null}
        </section>
      ) : null}

      {admin ? (
        <section className="space-y-6">
          {hasTeams && match.status !== "cancelled" ? (
            <div className="tv-card-sm p-5">
              <h2 className="font-display mb-1 text-lg text-ink-900">Scorekeeper</h2>
              <p className="mb-3 text-sm text-ink-500">
                Assign anyone to run this match&apos;s live scorecard — they get scoring access to
                just this match.
              </p>
              <ScorerPicker
                matchId={match.id}
                users={scorerOptions}
                currentUserId={match.scorerUserId}
              />
            </div>
          ) : null}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="tv-card-sm p-5">
              <h2 className="font-display mb-3 text-lg text-ink-900">Reschedule / move venue</h2>
              <RescheduleForm
                action={rescheduleMatch.bind(null, match.id)}
                venues={allVenues}
                currentVenueId={match.venueId}
                currentKickoff={match.kickoffAt}
              />
            </div>
            {match.status !== "cancelled" ? (
              <div className="tv-card-sm flex flex-col justify-between gap-3 p-5">
                <h2 className="font-display text-lg text-ink-900">Cancel</h2>
                <p className="text-sm text-ink-500">
                  Cancel this game if it won&apos;t be played. You can reschedule it later.
                </p>
                <form action={cancelMatch.bind(null, match.id)}>
                  <Button type="submit" variant="secondary">
                    Cancel match
                  </Button>
                </form>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {!canScore && !admin ? (
        <p className="tv-card px-4 py-6 text-sm text-ink-500">
          Only an admin, a team captain, or the assigned scorer can manage this match.
        </p>
      ) : null}
    </div>
  );
}
