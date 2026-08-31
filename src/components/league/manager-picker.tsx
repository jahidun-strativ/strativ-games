"use client";

import { useTransition } from "react";
import { App, Select } from "antd";
import { setTeamManager } from "@/server/actions/teams";

// Admin control to set/clear a team's manager (any app user). The manager gets
// captain-level powers over the team: roster, line-ups, staff and details.
export function ManagerPicker({
  teamId,
  managerUserId,
  users,
}: {
  teamId: string;
  managerUserId: string | null;
  users: { userId: string; label: string }[];
}) {
  const { message } = App.useApp();
  const [isPending, startTransition] = useTransition();

  function change(value: string | undefined) {
    startTransition(async () => {
      try {
        await setTeamManager(teamId, value ?? null);
        message.success(value ? "Manager updated." : "Manager cleared.");
      } catch (err) {
        message.error(err instanceof Error ? err.message : "Couldn't update manager.");
      }
    });
  }

  return (
    <Select<string>
      allowClear
      showSearch
      optionFilterProp="label"
      value={managerUserId ?? undefined}
      onChange={change}
      loading={isPending}
      placeholder="Set manager"
      className="!w-full sm:!w-56"
      options={users.map((u) => ({ value: u.userId, label: u.label }))}
      notFoundContent="No app users found"
    />
  );
}
