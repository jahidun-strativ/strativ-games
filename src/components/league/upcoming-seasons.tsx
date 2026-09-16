"use client";

import { useTransition } from "react";
import { App } from "antd";
import { useRouter } from "next/navigation";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startSeasonNow } from "@/server/actions/league";
import { EditSeasonForm } from "./edit-season-form";
import { formatDate } from "@/lib/format";
import type { Season } from "@/db/schema";

// Admin planner: the seasons queued behind the live one. "Start now" makes a
// queued season live (ending the current one); each can be edited before it runs.
export function UpcomingSeasons({ seasons }: { seasons: Season[] }) {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const [isPending, startTransition] = useTransition();
  if (seasons.length === 0) return null;

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
      <h2 className="font-display text-xl text-ink-900">Upcoming seasons</h2>
      {seasons.map((s) => (
        <div key={s.id} className="tv-card-sm p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-block rounded bg-burnt-500/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-burnt-400">
                Upcoming
              </span>
              <h3 className="font-display mt-1 text-lg text-ink-900">{s.name}</h3>
              <p className="text-sm text-ink-500">
                Starts {formatDate(s.startAt)} · {s.plannedMatchdays} matchdays
              </p>
            </div>
            <Button variant="primary" disabled={isPending} onClick={() => start(s)}>
              <span className="inline-flex items-center gap-1.5">
                <Rocket className="h-4 w-4" />
                Start now
              </span>
            </Button>
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
