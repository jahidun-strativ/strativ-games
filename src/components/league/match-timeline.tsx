"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { eventLabel } from "@/lib/match-event-labels";
import type { TimelineEvent } from "@/server/queries/match-events";

// Read-only match timeline. When `live`, it polls so spectators see goals and
// saves appear as the assigned scorer logs them.
// ponytail: 10s poll, swap for SSE only if load demands.
export function MatchTimeline({
  events,
  homeTeamId,
  homeTeamName,
  awayTeamName,
  live = false,
}: {
  events: TimelineEvent[];
  homeTeamId: string | null;
  homeTeamName: string;
  awayTeamName: string;
  live?: boolean;
}) {
  const router = useRouter();
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(t);
  }, [live, router]);

  if (events.length === 0) return null;
  const teamName = (id: string | null) => (id === homeTeamId ? homeTeamName : awayTeamName);

  return (
    <ul>
      {[...events].reverse().map((e) => (
        <li
          key={e.id}
          className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0"
        >
          <span className="scoreboard w-9 shrink-0 text-right text-sm font-bold text-ink-500">
            {e.minute != null ? `${e.minute}'` : "—"}
          </span>
          <span className="shrink-0 text-lg">{eventLabel(e.kind).icon}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">
              {e.playerName}
              {e.assistName ? (
                <span className="font-normal text-ink-500"> — assist {e.assistName}</span>
              ) : null}
            </p>
            <p className="truncate text-xs text-ink-500">
              {eventLabel(e.kind).text} · {teamName(e.teamId)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
