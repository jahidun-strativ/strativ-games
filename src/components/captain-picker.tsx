"use client";

import { useTransition } from "react";
import { App, Select } from "antd";
import { setTeamCaptain } from "@/server/actions/teams";

type Option = { id: string; name: string };

// Admin control to set/clear a team's captain. The captain gets to edit
// per-match lineups and manage the roster for their team.
export function CaptainPicker({
  teamId,
  captainId,
  players,
}: {
  teamId: string;
  captainId: string | null;
  players: Option[];
}) {
  const { message } = App.useApp();
  const [isPending, startTransition] = useTransition();

  function change(value: string | undefined) {
    startTransition(async () => {
      try {
        await setTeamCaptain(teamId, value ?? null);
        message.success(value ? "Captain updated." : "Captain cleared.");
      } catch (err) {
        message.error(err instanceof Error ? err.message : "Couldn't update captain.");
      }
    });
  }

  return (
    <Select<string>
      allowClear
      value={captainId ?? undefined}
      onChange={change}
      loading={isPending}
      placeholder="Set captain"
      className="!w-full sm:!w-56"
      options={players.map((p) => ({ value: p.id, label: `🧢 ${p.name}` }))}
      notFoundContent="Add players to the team first"
    />
  );
}
