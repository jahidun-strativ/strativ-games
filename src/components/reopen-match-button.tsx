"use client";

import { useTransition } from "react";
import { App, Dropdown } from "antd";
import { Button } from "@/components/ui/button";
import { reopenMatch } from "@/server/actions/matches";

// Admin: flip a completed match back to "scheduled" to fix its data — silent
// (no push). Choose whether to keep or wipe the recorded score & player stats.
export function ReopenMatchButton({ matchId }: { matchId: string }) {
  const { message } = App.useApp();
  const [isPending, startTransition] = useTransition();

  function run(clearResult: boolean) {
    startTransition(async () => {
      try {
        await reopenMatch(matchId, clearResult);
        message.success(
          clearResult
            ? "Match reopened — score and stats cleared."
            : "Match reopened — score and stats kept for editing.",
        );
      } catch (err) {
        message.error(err instanceof Error ? err.message : "Couldn't reopen the match.");
      }
    });
  }

  return (
    <Dropdown
      trigger={["click"]}
      menu={{
        items: [
          {
            key: "keep",
            label: (
              <div className="flex flex-col py-0.5">
                <span className="font-semibold">Keep score & stats</span>
                <span className="text-xs text-ink-500">Edit them, then complete again</span>
              </div>
            ),
            onClick: () => run(false),
          },
          {
            key: "clear",
            label: (
              <div className="flex flex-col py-0.5">
                <span className="font-semibold text-tvred-500">Clear score & stats</span>
                <span className="text-xs text-ink-500">Fresh do-over for this match</span>
              </div>
            ),
            onClick: () => run(true),
          },
        ],
      }}
    >
      <span>
        <Button variant="secondary" disabled={isPending}>
          {isPending ? "Reopening…" : "↩️ Reopen match"}
        </Button>
      </span>
    </Dropdown>
  );
}
