"use client";

import { useTransition } from "react";
import { App } from "antd";
import { Button } from "@/components/ui/button";
import type { NotifyResult } from "@/server/actions/matches";

// Force-sends a match/slot notification to all subscribers and reports how many
// devices it reached. Use when a push didn't arrive or you want to re-nudge.
export function NotifyButton({
  action,
  label = "Send notification now",
}: {
  action: () => Promise<NotifyResult>;
  label?: string;
}) {
  const { message } = App.useApp();
  const [isPending, startTransition] = useTransition();

  function send() {
    startTransition(async () => {
      try {
        const res = await action();
        if (!res.configured) {
          message.error("Push isn't configured on the server (missing VAPID keys).");
        } else if (res.sent === 0) {
          message.warning("No devices are subscribed to notifications yet.");
        } else {
          message.success(`Notification sent to ${res.sent} device${res.sent === 1 ? "" : "s"}.`);
        }
      } catch {
        message.error("Couldn't send the notification.");
      }
    });
  }

  return (
    <Button variant="secondary" onClick={send} disabled={isPending}>
      {isPending ? "Sending…" : label}
    </Button>
  );
}
