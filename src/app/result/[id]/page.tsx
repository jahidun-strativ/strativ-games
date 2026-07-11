import { notFound } from "next/navigation";
import { db } from "@/db";
import { getEffectiveSquad } from "@/server/queries/match-squad";
import { formatFull } from "@/lib/format";

export const metadata = { title: "Match result" };

type Line = { name: string; goals: number; assists: number; home: boolean };

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "") || name[0] || "?").toUpperCase();
}

// Team crest: initials in a circle, tinted with the side's accent.
function Crest({ name, side }: { name: string; side: "home" | "away" }) {
  const ring = side === "home" ? "border-burnt-500/50 text-burnt-400" : "border-sky-400/50 text-sky-300";
  return (
    <span
      className={`flex h-16 w-16 items-center justify-center rounded-full border-2 bg-cream-50 font-display text-2xl ${ring}`}
    >
      {initials(name)}
    </span>
  );
}

function ScorerRow({ line, side }: { line: Line; side: "home" | "away" }) {
  const dot = side === "home" ? "bg-burnt-500" : "bg-sky-400";
  return (
    <li className="flex items-center gap-2 py-1">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900">{line.name}</span>
      <span className="flex shrink-0 items-center gap-1 text-xs">
        {line.goals > 0 ? (
          <span className="rounded bg-cream-200 px-1.5 py-0.5 font-bold text-ink-700">
            {line.goals}
            <span className="ml-0.5">⚽</span>
          </span>
        ) : null}
        {line.assists > 0 ? (
          <span className="rounded bg-cream-200 px-1.5 py-0.5 font-bold text-ink-500">
            {line.assists}
            <span className="ml-0.5 text-[10px]">A</span>
          </span>
        ) : null}
      </span>
    </li>
  );
}

// PUBLIC result page — no sign-in required (see proxy.ts). Deep-linked from the
// full-time push notification so anyone can see the score and scorers.
export default async function PublicResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const match = await db.query.matches.findFirst({
    where: (m, { eq }) => eq(m.id, id),
    with: {
      homeTeam: true,
      awayTeam: true,
      venue: true,
      sport: true,
      playerStats: { with: { player: { columns: { id: true, name: true } } } },
    },
  });
  if (!match) notFound();

  const home = match.homeTeam;
  const away = match.awayTeam;
  const completed = match.status === "completed";
  const cancelled = match.status === "cancelled";
  const hs = match.homeScore;
  const as = match.awayScore;
  const homeWon = completed && hs != null && as != null && hs > as;
  const awayWon = completed && hs != null && as != null && as > hs;

  // Group scorers by side using the home team's per-match squad (anyone not in
  // it is credited to the away side).
  const homeSquad = home && away ? await getEffectiveSquad(id, home.id) : { players: [] };
  const homeIds = new Set(homeSquad.players.map((p) => p.id));

  const lines: Line[] = match.playerStats
    .filter((s) => s.goals > 0 || s.assists > 0)
    .map((s) => ({
      name: s.player?.name ?? "Unknown",
      goals: s.goals,
      assists: s.assists,
      home: homeIds.has(s.playerId),
    }))
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists);
  const homeScorers = lines.filter((l) => l.home);
  const awayScorers = lines.filter((l) => !l.home);

  const statusLabel = completed ? "Full-time" : cancelled ? "Cancelled" : "Upcoming";
  const statusTone = completed
    ? "text-pitch-500"
    : cancelled
      ? "text-tvred-500"
      : "text-gold-400";

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-burnt-500/15 blur-3xl" />

      <div className="relative mx-auto w-full max-w-xl px-4 py-10 sm:px-6">
        {/* Brand */}
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-cream-50 font-display text-base">
            <span className="text-burnt-500">S</span>
            <span className="text-ink-900">G</span>
          </span>
          <p className="font-display text-lg tracking-widest text-ink-900">STRATIV GAME</p>
        </div>

        {/* Result card */}
        <section className="tv-card glossy overflow-hidden">
          {/* Accent bar */}
          <div className="stripes h-1 w-full" />

          <div className="p-6 sm:p-8">
            <p
              className={`mb-6 text-center text-[11px] font-bold uppercase tracking-[0.35em] ${statusTone}`}
            >
              ● {statusLabel}
            </p>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
              {/* Home */}
              <div className="flex flex-col items-center gap-3">
                <Crest name={home?.name ?? "TBD"} side="home" />
                <p
                  className={`text-center font-display text-lg leading-tight sm:text-xl ${homeWon ? "text-ink-900" : "text-ink-700"}`}
                >
                  {home?.name ?? "TBD"}
                </p>
              </div>

              {/* Score */}
              <div className="flex flex-col items-center px-1">
                <div className="scoreboard flex items-center gap-2">
                  <span
                    className={`score-glow min-w-12 rounded-lg border border-line bg-black/50 px-2 py-1 text-center font-score text-4xl font-bold sm:text-5xl ${homeWon ? "text-gold-300" : "text-ink-700"}`}
                  >
                    {hs ?? "–"}
                  </span>
                  <span
                    className={`score-glow min-w-12 rounded-lg border border-line bg-black/50 px-2 py-1 text-center font-score text-4xl font-bold sm:text-5xl ${awayWon ? "text-gold-300" : "text-ink-700"}`}
                  >
                    {as ?? "–"}
                  </span>
                </div>
                {completed && hs === as ? (
                  <span className="mt-2 text-[10px] font-bold uppercase tracking-widest text-ink-500">
                    Draw
                  </span>
                ) : null}
              </div>

              {/* Away */}
              <div className="flex flex-col items-center gap-3">
                <Crest name={away?.name ?? "TBD"} side="away" />
                <p
                  className={`text-center font-display text-lg leading-tight sm:text-xl ${awayWon ? "text-ink-900" : "text-ink-700"}`}
                >
                  {away?.name ?? "TBD"}
                </p>
              </div>
            </div>

            {/* Meta */}
            <div className="mt-7 flex flex-col items-center gap-2 border-t border-line pt-5 text-sm text-ink-500">
              <p className="font-semibold text-ink-700">🗓 {formatFull(match.kickoffAt)}</p>
              <p>
                📍 {match.venue.name}
                {match.venue.city ? `, ${match.venue.city}` : ""}
                {match.sport ? ` · ${match.sport.name}` : ""}
              </p>
            </div>
          </div>
        </section>

        {/* Scorers */}
        {completed && lines.length > 0 ? (
          <section className="tv-card-sm mt-5 p-5 sm:p-6">
            <h2 className="mb-4 text-center text-[11px] font-bold uppercase tracking-[0.3em] text-ink-500">
              Goals &amp; assists
            </h2>
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-burnt-400">
                  <span className="h-2 w-2 rounded-full bg-burnt-500" />
                  {home?.name}
                </p>
                <ul>
                  {homeScorers.length === 0 ? (
                    <li className="py-1 text-sm text-ink-500">—</li>
                  ) : (
                    homeScorers.map((l, i) => <ScorerRow key={i} line={l} side="home" />)
                  )}
                </ul>
              </div>
              <div>
                <p className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-300">
                  <span className="h-2 w-2 rounded-full bg-sky-400" />
                  {away?.name}
                </p>
                <ul>
                  {awayScorers.length === 0 ? (
                    <li className="py-1 text-sm text-ink-500">—</li>
                  ) : (
                    awayScorers.map((l, i) => <ScorerRow key={i} line={l} side="away" />)
                  )}
                </ul>
              </div>
            </div>
          </section>
        ) : completed ? (
          <p className="mt-5 text-center text-sm text-ink-500">No goals recorded.</p>
        ) : cancelled ? (
          <p className="mt-5 text-center text-sm text-ink-500">This match was cancelled.</p>
        ) : (
          <p className="mt-5 text-center text-sm text-ink-500">
            This match hasn&apos;t been played yet — check back after kick-off.
          </p>
        )}

        <p className="mt-10 text-center text-xs tracking-wide text-ink-500">
          Strativ Sports Manager · <span className="text-burnt-400">strativ.se</span>
        </p>
      </div>
    </div>
  );
}
