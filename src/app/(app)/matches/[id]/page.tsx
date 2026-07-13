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
import { Button, ButtonLink } from "@/components/ui/button";
import { Scoreboard } from "@/components/ui/scoreboard";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { NotifyButton } from "@/components/notify-button";
import { PosterButton, type PosterVariant } from "@/components/poster-button";
import { ReopenMatchButton } from "@/components/reopen-match-button";
import { AvailabilityControl } from "@/components/availability-control";
import { EditMatchButton } from "@/components/entity-modals";
import { ResultForm } from "@/components/result-form";
import { RescheduleForm } from "@/components/reschedule-form";
import { formatFull, formatBdt, paidByLabel } from "@/lib/format";
import { isAdmin, isCaptainOf, getCurrentPlayer } from "@/server/auth";
import { getEffectiveSquad } from "@/server/queries/match-squad";
import type { AvailabilityStatus } from "@/db/schema";

export const metadata = { title: "Match" };

// Group a team's roster by each player's RSVP for this match.
function groupAvailability(
  players: { id: string; name: string }[],
  statusByPlayer: Map<string, string>,
) {
  const g: Record<"in" | "maybe" | "out" | "none", string[]> = {
    in: [],
    maybe: [],
    out: [],
    none: [],
  };
  for (const p of players) {
    const s = (statusByPlayer.get(p.id) ?? "none") as keyof typeof g;
    g[s].push(p.name);
  }
  return g;
}

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

  // Team(s) the viewer can open the lineup page for: their own side as captain,
  // or ANY internal side as admin (admins manage match squads for both teams,
  // even though the starting XI itself stays captain-only on that page).
  const lineupTeams = (
    await Promise.all(
      [match.homeTeam, match.awayTeam].map(async (t) => {
        if (!t || t.kind === "external") return null;
        const captain = await isCaptainOf(t.id);
        if (!captain && !admin) return null;
        return { id: t.id, name: t.name, captain };
      }),
    )
  ).filter((t): t is { id: string; name: string; captain: boolean } => t !== null);

  // RSVPs for this match + the viewer's own player (to prefill their control).
  const [availabilityRows, myPlayer] = await Promise.all([
    db.query.matchAvailability.findMany({
      where: (a, { eq }) => eq(a.matchId, id),
      with: { player: { columns: { id: true, name: true, teamId: true } } },
    }),
    getCurrentPlayer(),
  ]);
  const statusByPlayer = new Map(availabilityRows.map((r) => [r.playerId, r.status]));
  const myStatus = (myPlayer ? statusByPlayer.get(myPlayer.id) ?? null : null) as
    | AvailabilityStatus
    | null;
  const internalTeams = [match.homeTeam, match.awayTeam].filter(
    (t): t is NonNullable<typeof match.homeTeam> => Boolean(t) && t!.kind !== "external",
  );
  const teamIds = new Set(internalTeams.map((t) => t.id));
  const guestsIn = availabilityRows
    .filter((r) => r.status === "in" && (!r.player?.teamId || !teamIds.has(r.player.teamId)))
    .map((r) => r.player?.name ?? "Unknown");

  // Stats are recorded against each side's per-match squad (so a guest who
  // played can be scored), falling back to the roster when not customised.
  const [homeSquad, awaySquad] =
    hasTeams && match.homeTeamId && match.awayTeamId
      ? await Promise.all([
          getEffectiveSquad(id, match.homeTeamId),
          getEffectiveSquad(id, match.awayTeamId),
        ])
      : [{ players: [] }, { players: [] }];
  const posterVariants: PosterVariant[] =
    match.kind === "competitive"
      ? [
          { label: "Match poster", variant: "vs", hint: "Strativ vs opponent" },
          { label: "Team sheet", variant: "squad", hint: "Strativ line-up" },
        ]
      : [{ label: "Match day poster", variant: "full", hint: "Both teams + players" }];
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

      {hasTeams && match.status !== "cancelled" ? (
        <section className="mt-8">
          <h2 className="font-display mb-3 text-xl text-ink-900">Availability</h2>

          {myPlayer ? (
            <div className="tv-card-sm mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-ink-700">Are you playing?</p>
              <AvailabilityControl matchId={match.id} initial={myStatus} />
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {internalTeams.map((team) => {
              const g = groupAvailability(team.players, statusByPlayer);
              const line = (label: string, names: string[], cls: string) =>
                names.length > 0 ? (
                  <p className="text-sm">
                    <span className={`font-semibold ${cls}`}>{label} ({names.length}):</span>{" "}
                    <span className="text-ink-500">{names.join(", ")}</span>
                  </p>
                ) : null;
              return (
                <div key={team.id} className="tv-card-sm space-y-1.5 p-4">
                  <p className="mb-1 font-display text-base text-ink-900">
                    {team.name}
                    <span className="ml-2 text-xs font-semibold text-pitch-500">
                      {g.in.length} in
                    </span>
                  </p>
                  {line("In", g.in, "text-pitch-500")}
                  {line("Maybe", g.maybe, "text-gold-400")}
                  {line("Out", g.out, "text-tvred-500")}
                  {g.none.length > 0 ? (
                    <p className="text-xs text-ink-400">No reply: {g.none.length}</p>
                  ) : null}
                </div>
              );
            })}
          </div>

          {guestsIn.length > 0 ? (
            <p className="mt-3 text-sm">
              <span className="font-semibold text-sky-300">Guests available:</span>{" "}
              <span className="text-ink-500">{guestsIn.join(", ")}</span>
            </p>
          ) : null}
        </section>
      ) : null}

      {admin && hasTeams ? (
        <section className="mt-6 flex flex-wrap items-center gap-3">
          <PosterButton basePath={`/matches/${match.id}/poster`} variants={posterVariants} />
          {match.status === "completed" ? (
            <ButtonLink variant="secondary" href={`/result/${match.id}`}>
              🔗 Public result page
            </ButtonLink>
          ) : null}
          <span className="text-xs text-ink-500">
            Shareable match-day picture with the team{match.kind === "competitive" ? "" : "s"} and player list.
          </span>
        </section>
      ) : null}

      {hasTeams && lineupTeams.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-display mb-3 text-xl text-ink-900">
            {admin ? "Match line-ups & squads" : "Your match line-up"}
          </h2>
          <div className="flex flex-wrap gap-3">
            {lineupTeams.map((t) => (
              <ButtonLink
                key={t.id}
                variant="secondary"
                href={`/matches/${match.id}/lineup/${t.id}`}
              >
                {t.captain ? `🧢 Set ${t.name} lineup` : `👥 Manage ${t.name} squad`}
              </ButtonLink>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-500">
            {admin
              ? "Manage each team's match squad (who's available to field). The starting XI stays captain-only."
              : "Set your team's formation and starting XI for this match."}
          </p>
        </section>
      ) : null}

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
              homeSquad={homeSquad.players}
              awaySquad={awaySquad.players}
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
            {match.status === "completed" ? (
              <div className="flex flex-col gap-1">
                <ReopenMatchButton matchId={match.id} />
                <p className="text-xs text-ink-500">
                  Put the match back to scheduled to fix its data — silent, no notification.
                </p>
              </div>
            ) : null}
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
