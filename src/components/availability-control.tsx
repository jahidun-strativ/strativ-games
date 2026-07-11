"use client";

import { useState, useTransition } from "react";
import { App } from "antd";
import { setMyAvailability } from "@/server/actions/availability";
import type { AvailabilityStatus } from "@/db/schema";

const OPTIONS: { value: AvailabilityStatus; label: string; active: string }[] = [
  { value: "in", label: "✅ I'm in", active: "border-pitch-600 bg-pitch-600/20 text-pitch-500" },
  { value: "maybe", label: "🤔 Maybe", active: "border-gold-400 bg-gold-400/15 text-gold-400" },
  { value: "out", label: "❌ Out", active: "border-tvred-500 bg-tvred-500/15 text-tvred-500" },
];

// One-tap RSVP for the signed-in user. Optimistic; reverts on error.
export function AvailabilityControl({
  matchId,
  initial,
}: {
  matchId: string;
  initial: AvailabilityStatus | null;
}) {
  const { message } = App.useApp();
  const [status, setStatus] = useState<AvailabilityStatus | null>(initial);
  const [isPending, startTransition] = useTransition();

  function choose(next: AvailabilityStatus) {
    if (next === status) return;
    const prev = status;
    setStatus(next);
    startTransition(async () => {
      try {
        await setMyAvailability(matchId, next);
      } catch (err) {
        setStatus(prev);
        message.error(err instanceof Error ? err.message : "Couldn't save your response.");
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((o) => {
        const on = status === o.value;
        return (
          <button
            key={o.value}
            type="button"
            disabled={isPending}
            onClick={() => choose(o.value)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
              on ? o.active : "border-line text-ink-500 hover:bg-cream-200 hover:text-ink-900"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
