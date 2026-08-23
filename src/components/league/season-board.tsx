import Link from "next/link";
import { Trophy, Medal, ShieldCheck, Star, Hand, Goal, Handshake } from "lucide-react";
import { StandingsTable } from "@/components/tables/standings-table";
import { formatDate, formatTime } from "@/lib/format";
import type { SeasonView } from "@/server/queries/season";

// Futsal tracks fouls, not cards — a small flag marks the discipline columns.
function FoulFlag() {
  return (
    <span aria-label="fouls" className="align-middle">
      🚩
    </span>
  );
}

function Panel({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="tv-card overflow-hidden">
      <p className="flex items-center gap-2 bg-black/60 px-4 py-2.5 font-display text-gold-300">
        {title}
      </p>
      {children}
    </div>
  );
}

// A compact "rank · name · value" list, reused for scorers / assists / cards.
function RankedList<T>({
  rows,
  keyOf,
  href,
  primary,
  secondary,
  value,
  empty,
}: {
  rows: T[];
  keyOf: (r: T) => string;
  href: (r: T) => string;
  primary: (r: T) => string;
  secondary: (r: T) => string;
  value: (r: T) => React.ReactNode;
  empty: string;
}) {
  if (rows.length === 0) return <p className="p-4 text-sm text-ink-500">{empty}</p>;
  return (
    <ul>
      {rows.map((row, i) => (
        <li
          key={keyOf(row)}
          className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0"
        >
          <span
            className={`scoreboard flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              i === 0 ? "bg-gold-300 text-black" : i < 3 ? "bg-cream-200" : "bg-cream-50"
            }`}
          >
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <Link href={href(row)} className="block truncate text-sm font-bold hover:text-burnt-400">
              {primary(row)}
            </Link>
            <p className="truncate text-xs text-ink-500">{secondary(row)}</p>
          </div>
          <span className="scoreboard text-base font-bold text-burnt-400">{value(row)}</span>
        </li>
      ))}
    </ul>
  );
}

function AwardCard({
  icon,
  label,
  winner,
  sub,
  auto,
}: {
  icon: React.ReactNode;
  label: string;
  winner: string | null;
  sub?: string | null;
  auto?: boolean;
}) {
  return (
    <div className="tv-card-sm flex items-center gap-3 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
          {label}
          {auto ? <span className="ml-1 text-ink-400">· auto</span> : null}
        </p>
        {winner ? (
          <>
            <p className="truncate font-display text-ink-900">{winner}</p>
            {sub ? <p className="truncate text-xs text-ink-500">{sub}</p> : null}
          </>
        ) : (
          <p className="font-display text-ink-400">TBD</p>
        )}
      </div>
    </div>
  );
}

// The champion banner (only once a season has ended with results).
export function LeagueChampion({ view }: { view: SeasonView }) {
  if (!view.champion) return null;
  return (
    <div className="tv-card flex items-center gap-4 bg-gold-400/15 px-5 py-4">
      <Trophy className="h-8 w-8 shrink-0 text-gold-300" strokeWidth={2} />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Champions</p>
        <p className="font-display text-2xl text-ink-900">{view.champion.teamName}</p>
      </div>
    </div>
  );
}

export function LeagueStandings({ view }: { view: SeasonView }) {
  const { season, standings, playedMatchdays } = view;
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl text-ink-900">Standings</h2>
        <p className="text-sm text-ink-500">
          Matchday {playedMatchdays} of {season.plannedMatchdays}
        </p>
      </div>
      {standings.some((r) => r.played > 0) ? (
        <StandingsTable rows={standings} />
      ) : (
        <p className="tv-card px-4 py-6 text-sm text-ink-500">
          No results yet — the table fills in as matchdays are played.
        </p>
      )}
    </section>
  );
}

export function LeagueAwards({ view }: { view: SeasonView }) {
  const { awards } = view;
  return (
    <section>
      <h2 className="font-display mb-3 text-xl text-ink-900">Awards</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AwardCard
          icon={<Medal className="h-5 w-5 text-gold-300" />}
          label="Top scorer"
          winner={awards.topScorer?.player.name ?? null}
          sub={awards.topScorer ? `${awards.topScorer.goals} goals · ${awards.topScorer.player.teamName ?? ""}` : null}
          auto={awards.topScorer?.auto}
        />
        <AwardCard
          icon={<ShieldCheck className="h-5 w-5 text-pitch-500" />}
          label="Fair play"
          winner={awards.fairplay?.teamName ?? null}
          sub={awards.fairplay ? `${awards.fairplay.points} fouls` : null}
          auto={awards.fairplay?.auto}
        />
        <AwardCard
          icon={<Star className="h-5 w-5 text-burnt-400" />}
          label="Player of the season"
          winner={awards.playerOfSeason?.name ?? null}
          sub={awards.playerOfSeason?.teamName ?? null}
        />
        <AwardCard
          icon={<Hand className="h-5 w-5 text-sky-400" />}
          label="Best goalkeeper"
          winner={awards.bestGk?.player.name ?? null}
          sub={
            awards.bestGk
              ? `${awards.bestGk.cleanSheets} clean sheet${awards.bestGk.cleanSheets === 1 ? "" : "s"} · ${awards.bestGk.conceded} conceded${awards.bestGk.player.teamName ? ` · ${awards.bestGk.player.teamName}` : ""}`
              : null
          }
          auto={awards.bestGk?.auto}
        />
      </div>
    </section>
  );
}

export function LeagueStats({ view }: { view: SeasonView }) {
  const { scorers, fairplay, keepers } = view;
  const scorersWithGoals = scorers.filter((s) => s.goals > 0).slice(0, 8);
  const assisters = [...scorers].filter((s) => s.assists > 0).sort((a, b) => b.assists - a.assists).slice(0, 8);
  const booked = [...scorers]
    .filter((s) => s.fouls > 0)
    .sort((a, b) => b.fouls - a.fouls)
    .slice(0, 8);
  // Keepers ranked by defensive solidity (already sorted: fewest goals/game).
  const topKeepers = keepers.filter((k) => k.matches > 0).slice(0, 8);

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Panel title={<><Goal className="h-4 w-4" /> Top scorers</>}>
          <RankedList
            rows={scorersWithGoals}
            keyOf={(r) => r.playerId}
            href={(r) => `/players/${r.playerId}`}
            primary={(r) => r.name}
            secondary={(r) => r.teamName ?? "Free agent"}
            value={(r) => `${r.goals} G`}
            empty="No goals yet."
          />
        </Panel>
        <Panel title={<><Handshake className="h-4 w-4" /> Top assists</>}>
          <RankedList
            rows={assisters}
            keyOf={(r) => r.playerId}
            href={(r) => `/players/${r.playerId}`}
            primary={(r) => r.name}
            secondary={(r) => r.teamName ?? "Free agent"}
            value={(r) => `${r.assists} A`}
            empty="No assists yet."
          />
        </Panel>
        <Panel title={<><FoulFlag /> Most fouls</>}>
          <RankedList
            rows={booked}
            keyOf={(r) => r.playerId}
            href={(r) => `/players/${r.playerId}`}
            primary={(r) => r.name}
            secondary={(r) => r.teamName ?? "Free agent"}
            value={(r) => `${r.fouls} fouls`}
            empty="Clean so far."
          />
        </Panel>
        <Panel title={<><Hand className="h-4 w-4" /> Goalkeepers</>}>
          <RankedList
            rows={topKeepers}
            keyOf={(r) => r.playerId}
            href={(r) => `/players/${r.playerId}`}
            primary={(r) => r.name}
            secondary={(r) => r.teamName ?? "Free agent"}
            value={(r) => `${r.cleanSheets} CS · ${r.conceded} GA`}
            empty="No goalkeeper data yet."
          />
        </Panel>
      </section>

      {fairplay.length > 0 ? (
        <section>
          <h2 className="font-display mb-3 text-xl text-ink-900">Fair-play table</h2>
          <div className="tv-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-black/60 text-left font-display text-gold-300">
                  <th className="px-4 py-2">Team</th>
                  <th className="px-4 py-2 text-center"><FoulFlag /> Fouls</th>
                </tr>
              </thead>
              <tbody>
                {fairplay.map((f, i) => (
                  <tr key={f.teamId} className={`border-b border-line last:border-b-0 ${i === 0 ? "bg-gold-400/10" : ""}`}>
                    <td className="px-4 py-2 font-bold">{f.teamName}</td>
                    <td className="scoreboard px-4 py-2 text-center font-bold">{f.fouls}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function LeagueMatchdays({ matchdays }: { matchdays: SeasonView["matchdays"] }) {
  return (
    <section>
      <h2 className="font-display mb-3 text-xl text-ink-900">Fixtures</h2>
      {matchdays.length === 0 ? (
        <p className="tv-card px-4 py-6 text-sm text-ink-500">No matchdays scheduled yet.</p>
      ) : (
        <div className="tv-card-sm divide-y divide-line overflow-hidden">
          {matchdays.map((md, i) => (
            <div key={md.id}>
              {/* Slim matchday divider */}
              <div className="flex items-baseline justify-between gap-x-3 bg-cream-100 px-3 py-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-700">
                  {md.title ?? `Matchday ${i + 1}`}
                </span>
                <span className="truncate text-[11px] text-ink-500">
                  {formatDate(md.startAt)}
                  {md.venue ? ` · ${md.venue.name}` : ""}
                </span>
              </div>
              {md.fixtures.map((g) => {
                const done = g.status === "completed" && g.homeScore !== null;
                const cancelled = g.status === "cancelled";
                const homeWin = done && g.homeScore! > g.awayScore!;
                const awayWin = done && g.awayScore! > g.homeScore!;
                return (
                  <Link
                    key={g.id}
                    href={`/matches/${g.id}`}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-cream-100/70 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-line/60"
                  >
                    <span
                      className={`flex-1 truncate text-right ${
                        cancelled ? "text-ink-400 line-through" : homeWin ? "font-bold text-ink-900" : "text-ink-700"
                      }`}
                    >
                      {g.homeTeam?.name ?? "TBD"}
                    </span>
                    <span
                      className={`scoreboard w-12 shrink-0 rounded text-center text-sm font-bold ${
                        done ? "bg-cream-200 text-ink-900" : "text-ink-400"
                      }`}
                    >
                      {done ? `${g.homeScore}–${g.awayScore}` : cancelled ? "—" : "vs"}
                    </span>
                    <span
                      className={`flex-1 truncate ${
                        cancelled ? "text-ink-400 line-through" : awayWin ? "font-bold text-ink-900" : "text-ink-700"
                      }`}
                    >
                      {g.awayTeam?.name ?? "TBD"}
                    </span>
                    {/* Status indicator */}
                    <span className="w-16 shrink-0 text-right text-[11px] font-semibold">
                      {done ? (
                        <span className="rounded bg-pitch-500/15 px-1.5 py-0.5 uppercase text-pitch-500">FT</span>
                      ) : cancelled ? (
                        <span className="uppercase text-tvred-500">Canc.</span>
                      ) : (
                        <span className="text-ink-500">{formatTime(g.kickoffAt)}</span>
                      )}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// The full board on one page — used by the PUBLIC league page.
export function SeasonBoard({ view }: { view: SeasonView }) {
  return (
    <div className="space-y-8">
      <LeagueChampion view={view} />
      <LeagueStandings view={view} />
      <LeagueAwards view={view} />
      <LeagueStats view={view} />
      <LeagueMatchdays matchdays={view.matchdays} />
    </div>
  );
}
