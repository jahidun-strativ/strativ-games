import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatTime, formatBdt, paidByLabel } from "@/lib/format";
import type { MatchWithRefs } from "@/components/match-card";

export type SlotWithFixtures = {
  id: string;
  kind: string;
  title: string | null;
  cost: number | null;
  paidBy: string;
  startAt: Date;
  venue: { name: string; city: string | null };
  fixtures: MatchWithRefs[];
};

const accent: Record<string, string> = {
  scheduled: "border-l-gold-400",
  completed: "border-l-pitch-600",
  cancelled: "border-l-tvred-500",
};

// A slot groups every game booked in one hire. Each game links to its match;
// the header links to the slot itself (venue, cost split, all games).
export function SlotCard({ slot, status }: { slot: SlotWithFixtures; status: string }) {
  const count = slot.fixtures.length;

  return (
    <div className={`tv-card-sm border-l-4 p-4 ${accent[status] ?? "border-l-ink-400"}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-ink-500">
          {formatDate(slot.startAt)}
          <span className="text-ink-400"> · </span>
          {formatTime(slot.startAt)}
        </span>
        <div className="flex items-center gap-1.5">
          {slot.kind === "competitive" ? (
            <span className="rounded-full bg-burnt-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-burnt-400">
              Competitive
            </span>
          ) : null}
          <span className="rounded-full bg-ink-900/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-500">
            {count} game{count === 1 ? "" : "s"}
          </span>
          <StatusBadge status={status} />
        </div>
      </div>

      <div className="space-y-1.5">
        {count === 0 ? (
          <p className="text-sm text-ink-400">No games in this slot yet.</p>
        ) : (
          slot.fixtures.map((f) => <FixtureRow key={f.id} match={f} />)
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5 text-xs font-medium text-ink-500">
        <span className="flex min-w-0 items-center gap-1.5">
          <span aria-hidden>📍</span>
          <span className="truncate">
            {slot.venue.name}
            {slot.venue.city ? `, ${slot.venue.city}` : ""}
          </span>
        </span>
        {slot.cost != null ? (
          <span className="shrink-0 whitespace-nowrap">
            {formatBdt(slot.cost)}
            <span className="text-ink-400"> · </span>
            {paidByLabel(slot.paidBy)}
          </span>
        ) : null}
      </div>

      <Link
        href={`/sessions/${slot.id}`}
        className="mt-3 inline-flex items-center gap-1 text-xs font-bold !text-burnt-400 hover:underline"
      >
        Open slot →
      </Link>
    </div>
  );
}

// One game inside the slot — links to the match. Compact "A v B" with scores.
function FixtureRow({ match }: { match: MatchWithRefs }) {
  const played = match.status === "completed";
  const hasTeams = Boolean(match.homeTeam && match.awayTeam);
  const homeWin = played && (match.homeScore ?? 0) > (match.awayScore ?? 0);
  const awayWin = played && (match.awayScore ?? 0) > (match.homeScore ?? 0);

  return (
    <Link
      href={`/matches/${match.id}`}
      className="flex items-center justify-between gap-2 rounded-lg border border-line bg-cream-50 px-3 py-2 transition-colors hover:border-burnt-500/40"
    >
      {hasTeams ? (
        <span className="flex min-w-0 items-center gap-2 text-sm">
          <span className={`truncate ${homeWin ? "font-bold text-ink-900" : "text-ink-700"}`}>
            {match.homeTeam!.name}
          </span>
          {played ? (
            <span className="scoreboard shrink-0 font-bold text-ink-900">
              {match.homeScore}–{match.awayScore}
            </span>
          ) : (
            <span className="shrink-0 text-ink-400">v</span>
          )}
          <span className={`truncate ${awayWin ? "font-bold text-ink-900" : "text-ink-700"}`}>
            {match.awayTeam!.name}
          </span>
        </span>
      ) : (
        <span className="min-w-0 truncate text-sm font-medium text-ink-700">
          {match.title || "Teams TBD"}
        </span>
      )}
      <span aria-hidden className="shrink-0 text-xs text-ink-400">
        →
      </span>
    </Link>
  );
}
