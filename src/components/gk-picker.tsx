"use client";

import { useTransition } from "react";
import { App, Select } from "antd";
import { setTeamGoalkeeper } from "@/server/actions/teams";

type Option = { id: string; name: string };

// Admin control to set/clear a team's goalkeeper. The Best GK award credits this
// player with the goals the team concedes in matches they play.
export function GkPicker({
  teamId,
  goalkeeperId,
  players,
}: {
  teamId: string;
  goalkeeperId: string | null;
  players: Option[];
}) {
  const { message } = App.useApp();
  const [isPending, startTransition] = useTransition();

  function change(value: string | undefined) {
    startTransition(async () => {
      try {
        await setTeamGoalkeeper(teamId, value ?? null);
        message.success(value ? "Goalkeeper updated." : "Goalkeeper cleared.");
      } catch (err) {
        message.error(err instanceof Error ? err.message : "Couldn't update goalkeeper.");
      }
    });
  }

  return (
    <Select<string>
      allowClear
      value={goalkeeperId ?? undefined}
      onChange={change}
      loading={isPending}
      placeholder="Set goalkeeper"
      className="!w-full sm:!w-56"
      options={players.map((p) => ({ value: p.id, label: `🧤 ${p.name}` }))}
      notFoundContent="Add players to the team first"
    />
  );
}
