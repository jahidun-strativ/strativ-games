"use client";

import { useTransition } from "react";
import { App } from "antd";
import { Button } from "@/components/ui/button";
import { fillSquadFromAvailability } from "@/server/actions/squads";

// Captain shortcut: add everyone on the team who RSVP'd "in" to the match squad.
export function FillSquadButton({ matchId, teamId }: { matchId: string; teamId: string }) {
  const { message } = App.useApp();
  const [isPending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      try {
        const n = await fillSquadFromAvailability(matchId, teamId);
        message.success(
          n > 0
            ? `Added ${n} confirmed player${n === 1 ? "" : "s"} to the squad.`
            : "No new confirmed players to add.",
        );
      } catch (err) {
        message.error(err instanceof Error ? err.message : "Couldn't update the squad.");
      }
    });
  }

  return (
    <Button variant="secondary" disabled={isPending} onClick={run}>
      {isPending ? "Adding…" : "➕ Add players who are in"}
    </Button>
  );
}
