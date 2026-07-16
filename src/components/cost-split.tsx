"use client";

import { useState, useTransition } from "react";
import { App } from "antd";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { remindUnpaidPayers, setPaymentPaid } from "@/server/actions/payments";
import { formatBdt } from "@/lib/format";

type Payer = { id: string; name: string; paid: boolean };

// Splits a slot's cost equally among the players who PLAYED its games and tracks
// who has settled. The payer list is derived from the match results, not managed
// here — editing a squad / result updates it automatically.
export function CostSplit({
  sessionId,
  cost,
  payers,
  currentPlayerId,
  canManage,
}: {
  sessionId: string;
  cost: number;
  payers: Payer[];
  currentPlayerId: string | null;
  canManage: boolean;
}) {
  const { message } = App.useApp();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const n = payers.length;
  const perHead = n ? Math.round(cost / n) : 0;
  const paidCount = payers.filter((p) => p.paid).length;
  const collected = n ? Math.round((cost * paidCount) / n) : 0;
  const outstanding = Math.max(cost - collected, 0);

  const me = currentPlayerId ? payers.find((p) => p.id === currentPlayerId) : undefined;
  const unpaidCount = payers.filter((p) => !p.paid).length;

  function remind() {
    setPendingId("remind");
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
      } catch (err) {
        message.error(err instanceof Error ? err.message : "Couldn't send reminders.");
      } finally {
        setPendingId(null);
      }
    });
  }

  function run(key: string, fn: () => Promise<unknown>, ok?: string) {
    setPendingId(key);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
        if (ok) message.success(ok);
      } catch (err) {
        message.error(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="tv-card-sm p-5">
      {/* Summary */}
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-ink-500">Total</p>
          <p className="font-score text-2xl font-bold text-ink-900">{formatBdt(cost)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-ink-500">Per head</p>
          <p className="font-score text-2xl font-bold text-burnt-400">
            {n ? formatBdt(perHead) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-ink-500">
            Collected ({paidCount}/{n})
          </p>
          <p className="font-score text-2xl font-bold text-pitch-500">{formatBdt(collected)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-ink-500">Outstanding</p>
          <p className="font-score text-2xl font-bold text-gold-400">{formatBdt(outstanding)}</p>
        </div>
      </div>

      {/* Your share */}
      {me ? (
        <p
          className={`mt-4 rounded-lg px-3 py-2 text-sm font-semibold ${
            me.paid
              ? "bg-pitch-600/15 text-pitch-500"
              : "bg-gold-400/15 text-gold-400"
          }`}
        >
          {me.paid ? "✓ You're settled up." : `You owe ${formatBdt(perHead)}.`}
        </p>
      ) : null}

      {/* Payers */}
      <ul className="mt-4 space-y-1.5">
        {payers.length === 0 ? (
          <li className="text-sm text-ink-500">
            No players recorded as played yet — record the match result and the split fills in
            automatically.
          </li>
        ) : (
          payers.map((p) => {
            const busy = pendingId === p.id;
            return (
              <li
                key={p.id}
                className={`flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm ${
                  p.paid ? "bg-pitch-600/10" : "bg-cream-50"
                }`}
              >
                <span className="min-w-0 truncate font-semibold text-ink-900">
                  {p.name}
                  {p.id === currentPlayerId ? (
                    <span className="ml-2 text-xs font-normal text-ink-500">(you)</span>
                  ) : null}
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-ink-500">{formatBdt(perHead)}</span>
                  {canManage ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        run(p.id, () => setPaymentPaid(sessionId, p.id, !p.paid))
                      }
                      className={`rounded-md px-2 py-0.5 text-xs font-bold disabled:opacity-50 ${
                        p.paid
                          ? "text-pitch-500 hover:bg-pitch-600/15"
                          : "text-ink-500 hover:bg-cream-200"
                      }`}
                    >
                      {p.paid ? "✓ Paid" : "Mark paid"}
                    </button>
                  ) : (
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                        p.paid ? "text-pitch-500" : "text-gold-400"
                      }`}
                    >
                      {p.paid ? "Paid" : "Owes"}
                    </span>
                  )}
                </span>
              </li>
            );
          })
        )}
      </ul>

      {canManage ? (
        <div className="mt-5 border-t border-line pt-4">
          <Button
            variant="secondary"
            disabled={pendingId === "remind" || unpaidCount === 0}
            onClick={remind}
          >
            {unpaidCount > 0
              ? `💸 Remind ${unpaidCount} unpaid player${unpaidCount === 1 ? "" : "s"}`
              : "💸 Everyone has paid"}
          </Button>
          <p className="mt-3 text-xs text-ink-500">
            Sends a payment reminder (push + in-app) only to players who played but haven&apos;t
            paid. The split is everyone who played this slot&apos;s games — to change who&apos;s in
            it, edit the match squad or the “Played” ticks on the result.
          </p>
        </div>
      ) : null}
    </div>
  );
}
