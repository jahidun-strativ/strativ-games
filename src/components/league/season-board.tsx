import Link from "next/link";
import { Trophy, Medal, ShieldCheck, Star, Hand, Goal, Handshake } from "lucide-react";
import { StandingsTable } from "@/components/tables/standings-table";
import { formatDate, formatTime } from "@/lib/format";
import type { SeasonView } from "@/server/queries/season";

// Small football-card chip — a rounded rectangle in the yellow/red tone.
function CardChip({ tone }: { tone: "yellow" | "red" }) {
  return (
    <span
      aria-label={tone === "yellow" ? "yellow card" : "red card"}
      className={`inline-block h-3.5 w-2.5 shrink-0 rounded-[2px] align-middle ${
        tone === "yellow" ? "bg-gold-400" : "bg-tvred-500"
      }`}
    />
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

export function SeasonBoard({ view }: { view: SeasonView }) {
  const { season, standings, scorers, fairplay, awards, matchdays, playedMatchdays, champion } = view;
  const scorersWithGoals = scorers.filter((s) => s.goals > 0).slice(0, 8);
  const assisters = [...scorers].filter((s) => s.assists > 0).sort((a, b) => b.assists - a.assists).slice(0, 8);
  const booked = [...scorers]
    .filter((s) => s.yellow + s.red > 0)
    .sort((a, b) => b.red * 3 + b.yellow - (a.red * 3 + a.yellow))
    .slice(0, 8);

  return (
    <div className="space-y-8">
      {champion ? (
        <div className="tv-card flex items-center gap-4 bg-gold-400/15 px-5 py-4">
          <Trophy className="h-8 w-8 shrink-0 text-gold-300" strokeWidth={2} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Champions</p>
            <p className="font-display text-2xl text-ink-900">{champion.teamName}</p>
          </div>
        </div>
      ) : null}

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
            sub={awards.fairplay ? `${awards.fairplay.points} disciplinary pts` : null}
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
            winner={awards.bestGk?.name ?? null}
            sub={awards.bestGk?.teamName ?? null}
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Panel title="⚽ Top scorers">
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
        <Panel title="🅰️ Top assists">
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
        <Panel title="🟨 Discipline">
          <RankedList
            rows={booked}
            keyOf={(r) => r.playerId}
            href={(r) => `/players/${r.playerId}`}
            primary={(r) => r.name}
            secondary={(r) => r.teamName ?? "Free agent"}
            value={(r) => (
              <span className="text-sm">
                {r.yellow}🟨 {r.red}🟥
              </span>
            )}
            empty="Clean so far."
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
                  <th className="px-4 py-2 text-center">🟨</th>
                  <th className="px-4 py-2 text-center">🟥</th>
                  <th className="px-4 py-2 text-center">Pts</th>
                </tr>
              </thead>
              <tbody>
                {fairplay.map((f, i) => (
                  <tr key={f.teamId} className={`border-b border-line last:border-b-0 ${i === 0 ? "bg-gold-400/10" : ""}`}>
                    <td className="px-4 py-2 font-bold">{f.teamName}</td>
                    <td className="px-4 py-2 text-center">{f.yellow}</td>
                    <td className="px-4 py-2 text-center">{f.red}</td>
                    <td className="scoreboard px-4 py-2 text-center font-bold">{f.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="font-display mb-3 text-xl text-ink-900">Matchdays</h2>
        {matchdays.length === 0 ? (
          <p className="tv-card px-4 py-6 text-sm text-ink-500">No matchdays scheduled yet.</p>
        ) : (
          <div className="space-y-3">
            {matchdays.map((md, i) => (
              <div key={md.id} className="tv-card-sm overflow-hidden">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-line bg-cream-100 px-4 py-2">
                  <p className="font-display text-ink-900">{md.title ?? `Matchday ${i + 1}`}</p>
                  <p className="text-xs text-ink-500">
                    {formatDate(md.startAt)} · {formatTime(md.startAt)}
                    {md.venue ? ` · 📍 ${md.venue.name}` : ""}
                  </p>
                </div>
                <ul>
                  {md.fixtures.map((g) => (
                    <li
                      key={g.id}
                      className="flex items-center gap-2 px-4 py-2 text-sm last:border-b-0 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-line"
                    >
                      <Link href={`/matches/${g.id}`} className="flex-1 truncate text-right hover:text-burnt-400">
                        {g.homeTeam?.name ?? "TBD"}
                      </Link>
                      <span className="scoreboard w-16 shrink-0 text-center font-bold">
                        {g.status === "completed" && g.homeScore !== null
                          ? `${g.homeScore}–${g.awayScore}`
                          : g.status === "cancelled"
                            ? "—"
                            : "vs"}
                      </span>
                      <Link href={`/matches/${g.id}`} className="flex-1 truncate hover:text-burnt-400">
                        {g.awayTeam?.name ?? "TBD"}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
