"use client";

import { useTransition } from "react";
import { App } from "antd";
import { useRouter } from "next/navigation";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startSeasonNow } from "@/server/actions/league";
import { AddMatchdayButton } from "./add-matchday-button";
import { EditSeasonForm } from "./edit-season-form";
import { formatDate, formatTime } from "@/lib/format";
import type { Season, Venue } from "@/db/schema";

type PlannedMatchday = {
  id: string;
  title: string | null;
  startAt: Date;
  venueName: string | null;
  games: number;
};
export type UpcomingSeason = { season: Season; matchdays: PlannedMatchday[] };

// Admin planner: the season queued behind the live one. "Start now" makes it
// live (ending the current one); its details and matchdays can be planned ahead.
export function UpcomingSeasons({
  items,
  venues,
}: {
  items: UpcomingSeason[];
  venues: Venue[];
}) {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const [isPending, startTransition] = useTransition();
  if (items.length === 0) return null;

  const start = (s: Season) =>
    modal.confirm({
      title: `Start ${s.name} now?`,
      content: "This ends the season currently running for its sport and makes this one live.",
      okText: "Start now",
      onOk: () =>
        startTransition(async () => {
          try {
            await startSeasonNow(s.id);
            message.success(`${s.name} is now live.`);
            router.refresh();
          } catch (err) {
            message.error(err instanceof Error ? err.message : "Couldn't start the season.");
          }
        }),
    });

  return (
    <div className="space-y-3">
      <h2 className="font-display text-xl text-ink-900">Upcoming season</h2>
      {items.map(({ season: s, matchdays }) => (
        <div key={s.id} className="tv-card-sm p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-block rounded bg-burnt-500/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-burnt-400">
                Upcoming
              </span>
              <h3 className="font-display mt-1 text-lg text-ink-900">{s.name}</h3>
              <p className="text-sm text-ink-500">
                Starts {formatDate(s.startAt)} · {matchdays.length}/{s.plannedMatchdays} matchdays
                planned
              </p>
            </div>
            <Button variant="primary" disabled={isPending} onClick={() => start(s)}>
              <span className="inline-flex items-center gap-1.5">
                <Rocket className="h-4 w-4" />
                Start now
              </span>
            </Button>
          </div>

          {/* Plan its matchdays ahead of time (same round-robin as a live season). */}
          <div className="mb-3 rounded-xl border border-line p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Matchdays
              </p>
              <AddMatchdayButton
                seasonId={s.id}
                venues={venues}
                nextNumber={matchdays.length + 1}
              />
            </div>
            {matchdays.length === 0 ? (
              <p className="text-sm text-ink-500">None yet — add the first matchday.</p>
            ) : (
              <ul className="space-y-1">
                {matchdays.map((md, i) => (
                  <li key={md.id} className="flex items-center gap-2 text-sm">
                    <span className="scoreboard shrink-0 rounded bg-cream-200 px-1.5 py-0.5 text-xs font-bold text-ink-700">
                      MD {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ink-700">
                      {formatDate(md.startAt)} · {formatTime(md.startAt)}
                      {md.venueName ? ` · ${md.venueName}` : ""}
                    </span>
                    <span className="shrink-0 text-xs text-ink-500">{md.games} games</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <details className="group">
            <summary className="cursor-pointer text-sm font-semibold text-burnt-400">
              Edit details
            </summary>
            <div className="mt-3">
              <EditSeasonForm season={s} />
            </div>
          </details>
        </div>
      ))}
    </div>
  );
}
