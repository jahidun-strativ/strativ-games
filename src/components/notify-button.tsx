"use client";

import { useTransition } from "react";
import { App } from "antd";
import { Button } from "@/components/ui/button";
import type { NotifyResult } from "@/server/actions/matches";

// Force-sends a match/slot notification: a PWA push to subscribed devices AND an
// in-app inbox notification to every user. Reports both counts.
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
        const parts: string[] = [];
        if (res.configured && res.sent > 0) {
          parts.push(`${res.sent} device${res.sent === 1 ? "" : "s"} (push)`);
        }
        if (res.inApp > 0) {
          parts.push(`${res.inApp} user${res.inApp === 1 ? "" : "s"} in-app`);
        }
        if (parts.length > 0) {
          message.success(`Notification sent — ${parts.join(" · ")}.`);
        } else if (!res.configured) {
          message.warning("Push isn't configured (missing VAPID keys) and no users to notify.");
        } else {
          message.warning("No one to notify yet.");
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
