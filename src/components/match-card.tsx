import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatTime } from "@/lib/format";
import type { Match, Team, Venue } from "@/db/schema";

export type MatchWithRefs = Match & {
  homeTeam: Team | null;
  awayTeam: Team | null;
  venue: Venue;
};

const accent: Record<string, string> = {
  scheduled: "border-l-gold-400",
  completed: "border-l-pitch-600",
  cancelled: "border-l-tvred-500",
};

function TeamRow({
  name,
  tag,
  score,
  winner,
}: {
  name: string;
  tag: "HOME" | "AWAY";
  score: number | null;
  winner: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="w-11 shrink-0 text-[10px] font-bold tracking-wider text-ink-400">
          {tag}
        </span>
        <span className={`truncate text-sm ${winner ? "font-bold" : "font-medium"}`}>
          {name}
        </span>
      </div>
      {score !== null ? (
        <span
          className={`scoreboard shrink-0 text-base font-bold ${
            winner ? "text-ink-900" : "text-ink-400"
          }`}
        >
          {score}
        </span>
      ) : null}
    </div>
  );
}

export function MatchCard({ match }: { match: MatchWithRefs }) {
  const played = match.status === "completed";
  const hasTeams = Boolean(match.homeTeam && match.awayTeam);
  const homeWin = played && (match.homeScore ?? 0) > (match.awayScore ?? 0);
  const awayWin = played && (match.awayScore ?? 0) > (match.homeScore ?? 0);

  return (
    <Link
      href={`/matches/${match.id}`}
      className={`tv-card-sm block border-l-4 p-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-tv)] ${accent[match.status] ?? "border-l-ink-400"}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-ink-500">
          {formatDate(match.kickoffAt)}
          <span className="text-ink-400"> · </span>
          {formatTime(match.kickoffAt)}
        </span>
        <StatusBadge status={match.status} />
      </div>

      {hasTeams ? (
        <div className="space-y-1.5">
          <TeamRow
            name={match.homeTeam!.name}
            tag="HOME"
            score={played ? match.homeScore : null}
            winner={homeWin}
          />
          <TeamRow
            name={match.awayTeam!.name}
            tag="AWAY"
            score={played ? match.awayScore : null}
            winner={awayWin}
          />
        </div>
      ) : (
        <div>
          <p className="truncate text-sm font-bold">{match.title || "Match — teams TBD"}</p>
          <p className="text-xs text-ink-400">Teams not assigned yet</p>
        </div>
      )}

      <p className="mt-3 flex items-center gap-1.5 border-t border-line pt-2.5 text-xs font-medium text-ink-500">
        <span aria-hidden>📍</span>
        <span className="truncate">
          {match.venue.name}
          {match.venue.city ? `, ${match.venue.city}` : ""}
        </span>
      </p>
    </Link>
  );
}
