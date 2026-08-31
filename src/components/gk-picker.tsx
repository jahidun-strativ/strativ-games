"use client";

import { useTransition } from "react";
import { App, Select } from "antd";
import { setTeamGoalkeepers } from "@/server/actions/teams";

type Option = { id: string; name: string };

// Admin control to set/clear a team's goalkeepers (one or more). The Best GK
// award credits these players with goals conceded, and the live scorecard's save
// picker is limited to them.
export function GkPicker({
  teamId,
  goalkeeperIds,
  players,
}: {
  teamId: string;
  goalkeeperIds: string[];
  players: Option[];
}) {
  const { message } = App.useApp();
  const [isPending, startTransition] = useTransition();

  function change(values: string[]) {
    startTransition(async () => {
      try {
        await setTeamGoalkeepers(teamId, values);
        message.success(values.length ? "Goalkeepers updated." : "Goalkeepers cleared.");
      } catch (err) {
        message.error(err instanceof Error ? err.message : "Couldn't update goalkeepers.");
      }
    });
  }

  return (
    <Select<string[]>
      mode="multiple"
      allowClear
      value={goalkeeperIds}
      onChange={change}
      loading={isPending}
      placeholder="Set goalkeepers"
      className="!w-full sm:!w-56"
      options={players.map((p) => ({ value: p.id, label: `🧤 ${p.name}` }))}
      notFoundContent="Add players to the team first"
    />
  );
}
