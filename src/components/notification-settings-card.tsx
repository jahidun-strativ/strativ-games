"use client";

import { useState, useTransition } from "react";
import { App, Switch } from "antd";
import { updateNotificationSettings } from "@/server/actions/notification-settings";

type Settings = {
  notifyOnCreate: boolean;
  notifyDayBefore: boolean;
  notifyHourBefore: boolean;
};

const ROWS: { key: keyof Settings; label: string; hint: string }[] = [
  { key: "notifyOnCreate", label: "When a match is scheduled", hint: "Notify everyone as soon as a match is created." },
  { key: "notifyDayBefore", label: "1 day before kickoff", hint: "A reminder the day before the match." },
  { key: "notifyHourBefore", label: "1 hour before kickoff", hint: "A final reminder an hour before kickoff." },
];

export function NotificationSettingsCard({
  initial,
  canEdit = true,
}: {
  initial: Settings;
  canEdit?: boolean;
}) {
  const { message } = App.useApp();
  const [settings, setSettings] = useState<Settings>(initial);
  const [isPending, startTransition] = useTransition();

  function toggle(key: keyof Settings, value: boolean) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    startTransition(async () => {
      try {
        await updateNotificationSettings(next);
      } catch {
        setSettings(settings); // revert
        message.error("Couldn't save notification settings.");
      }
    });
  }

  return (
    <div className="tv-card p-5">
      <h2 className="font-display text-lg text-ink-900">Match notifications</h2>
      <p className="mt-1 text-sm text-ink-500">
        {canEdit
          ? "Choose when push notifications go out to everyone who has enabled them."
          : "When reminders go out is set by your admin. Turn notifications on or off for this device above."}
      </p>
      <div className="mt-4 divide-y divide-line">
        {ROWS.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink-900">{row.label}</p>
              <p className="text-xs text-ink-500">{row.hint}</p>
            </div>
            <Switch
              checked={settings[row.key]}
              disabled={isPending || !canEdit}
              onChange={(v) => toggle(row.key, v)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
