"use client";

import { useState, useTransition } from "react";
import { App, Input, InputNumber } from "antd";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setSessionExtraCost } from "@/server/actions/payments";
import { formatBdt } from "@/lib/format";

// Admin control to add/edit a slot's additional cost (water, extra time, a
// ball…). The amount is added to the slot's total bill and the per-head split.
export function ExtraCostControl({
  sessionId,
  extraCost,
  extraNote,
}: {
  sessionId: string;
  extraCost: number;
  extraNote: string | null;
}) {
  const { message } = App.useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number | null>(extraCost || null);
  const [note, setNote] = useState(extraNote ?? "");
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  function save(nextAmount: number | null, nextNote: string) {
    setBusy(true);
    startTransition(async () => {
      try {
        await setSessionExtraCost(sessionId, nextAmount, nextNote);
        message.success(nextAmount ? "Additional cost saved." : "Additional cost removed.");
        setOpen(false);
        router.refresh();
      } catch (err) {
        message.error(err instanceof Error ? err.message : "Couldn't save the cost.");
      } finally {
        setBusy(false);
      }
    });
  }

  if (!open) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={() => setOpen(true)}>
          {extraCost > 0 ? "✏️ Edit additional cost" : "➕ Add additional cost"}
        </Button>
        {extraCost > 0 ? (
          <span className="text-xs text-ink-500">
            {formatBdt(extraCost)}
            {extraNote ? ` · ${extraNote}` : ""}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="tv-card-sm mt-3 flex flex-col gap-3 p-4">
      <p className="text-sm font-semibold text-ink-900">Additional cost</p>
      <div className="flex flex-wrap items-center gap-3">
        <InputNumber
          min={0}
          value={amount}
          onChange={(v) => setAmount(typeof v === "number" ? v : null)}
          addonBefore="৳"
          placeholder="Amount"
          style={{ width: 160 }}
        />
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What for? (e.g. water, extra 30 min)"
          style={{ maxWidth: 280 }}
          maxLength={80}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" disabled={busy} onClick={() => save(amount, note)}>
          Save
        </Button>
        {extraCost > 0 ? (
          <Button variant="secondary" disabled={busy} onClick={() => save(null, "")}>
            Remove
          </Button>
        ) : null}
        <Button variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      <p className="text-xs text-ink-500">
        Added to the slot&apos;s total bill and split per head among players who played.
      </p>
    </div>
  );
}
