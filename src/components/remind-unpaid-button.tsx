"use client";

import { useState, useTransition } from "react";
import { App } from "antd";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { remindUnpaidPayers } from "@/server/actions/payments";

// Chase the players who played this slot but haven't paid — push + in-app.
// Used on the Costs page's "to settle" cards and the slot's cost split.
export function RemindUnpaidButton({
  sessionId,
  count,
}: {
  sessionId: string;
  count: number;
}) {
  const { message } = App.useApp();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  function remind() {
    setBusy(true);
    startTransition(async () => {
      try {
        const res = await remindUnpaidPayers(sessionId);
        if (res.reminded > 0) {
          message.success(
            `Reminder sent to ${res.reminded} unpaid player${res.reminded === 1 ? "" : "s"}.`,
          );
        } else if (res.alreadySettled) {
          message.info("Everyone has paid — no reminders sent.");
        } else {
          message.info("No one to remind yet.");
        }
        router.refresh();
      } catch (err) {
        message.error(err instanceof Error ? err.message : "Couldn't send reminders.");
      } finally {
        setBusy(false);
      }
    });
  }

  return (
    <Button variant="secondary" disabled={busy || pending || count === 0} onClick={remind}>
      {count > 0 ? `💸 Remind ${count} unpaid` : "💸 All paid"}
    </Button>
  );
}
