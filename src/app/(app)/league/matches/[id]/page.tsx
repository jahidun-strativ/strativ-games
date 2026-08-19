import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy } from "lucide-react";
import { db } from "@/db";
import { recordResult, rescheduleMatch, cancelMatch } from "@/server/actions/matches";
import { isAdmin, isCaptainOf } from "@/server/auth";
import { getEffectiveSquad } from "@/server/queries/match-squad";
import { ResultForm } from "@/components/result-form";
import { RescheduleForm } from "@/components/reschedule-form";
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

  const admin = await isAdmin();
  const hasTeams = Boolean(match.homeTeam && match.awayTeam);
  const captainSides = await Promise.all(
    [match.homeTeam, match.awayTeam].map((t) =>
      t && t.kind !== "external" ? isCaptainOf(t.id) : Promise.resolve(false),
    ),
  );
  const canScore = admin || captainSides.some(Boolean);

  const [homeSquad, awaySquad] =
    hasTeams && match.homeTeamId && match.awayTeamId
      ? await Promise.all([
          getEffectiveSquad(id, match.homeTeamId),
          getEffectiveSquad(id, match.awayTeamId),
        ])
      : [{ players: [] }, { players: [] }];

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

      {canScore && match.status !== "cancelled" && hasTeams ? (
        <section>
          <h2 className="font-display mb-3 text-xl text-ink-900">
            {match.status === "completed" ? "Edit result" : "Record result"}
          </h2>
          <ResultForm
            action={recordResult.bind(null, match.id)}
            homeTeamName={match.homeTeam!.name}
            awayTeamName={match.awayTeam!.name}
            homeSquad={homeSquad.players}
            awaySquad={awaySquad.players}
            stats={match.playerStats}
            homeScore={match.homeScore}
            awayScore={match.awayScore}
            completed={match.status === "completed"}
          />
        </section>
      ) : null}

      {admin ? (
        <section className="grid gap-6 lg:grid-cols-2">
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
        </section>
      ) : null}

      {!canScore && !admin ? (
        <p className="tv-card px-4 py-6 text-sm text-ink-500">
          Only an admin or a team captain can manage this match.
        </p>
      ) : null}
    </div>
  );
}
