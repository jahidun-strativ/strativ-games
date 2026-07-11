"use client";

import { useState, useTransition } from "react";
import { App, Input } from "antd";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  addSessionPayer,
  fillSessionPayersFromTeams,
  removeSessionPayer,
  setPaymentPaid,
} from "@/server/actions/payments";
import { formatBdt } from "@/lib/format";

type Payer = { id: string; name: string; paid: boolean };
type Candidate = { id: string; name: string; teamName: string | null };

// Splits a slot's cost equally among the payers and tracks who has settled.
export function CostSplit({
  sessionId,
  cost,
  payers,
  candidates,
  currentPlayerId,
  canManage,
}: {
  sessionId: string;
  cost: number;
  payers: Payer[];
  candidates: Candidate[];
  currentPlayerId: string | null;
  canManage: boolean;
}) {
  const { message } = App.useApp();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [q, setQ] = useState("");

  const n = payers.length;
  const perHead = n ? Math.round(cost / n) : 0;
  const paidCount = payers.filter((p) => p.paid).length;
  const collected = n ? Math.round((cost * paidCount) / n) : 0;
  const outstanding = Math.max(cost - collected, 0);

  const me = currentPlayerId ? payers.find((p) => p.id === currentPlayerId) : undefined;

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

  const payerIds = new Set(payers.map((p) => p.id));
  const available = candidates
    .filter((c) => !payerIds.has(c.id))
    .filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()));

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
          <li className="text-sm text-ink-500">No one added yet.</li>
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
                    <>
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
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => run(p.id, () => removeSessionPayer(sessionId, p.id))}
                        className="rounded-md px-1.5 py-0.5 text-xs font-bold text-tvred-500 hover:bg-tvred-500/10 disabled:opacity-50"
                      >
                        ✕
                      </button>
                    </>
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

      {/* Add players */}
      {canManage ? (
        <div className="mt-5 border-t border-line pt-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              disabled={pendingId === "fill"}
              onClick={() =>
                run(
                  "fill",
                  async () => {
                    await fillSessionPayersFromTeams(sessionId);
                  },
                  "Added players from the teams.",
                )
              }
            >
              ➕ Add everyone from the teams
            </Button>
          </div>
          <Input
            allowClear
            placeholder="Search a player to add…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="mb-2"
          />
          {available.length === 0 ? (
            <p className="text-sm text-ink-500">No other players to add.</p>
          ) : (
            <ul className="max-h-56 space-y-1.5 overflow-y-auto">
              {available.map((c) => {
                const busy = pendingId === c.id;
                return (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line bg-cream-50 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate font-semibold">
                      {c.name}
                      <span className="ml-2 text-xs font-normal text-ink-500">
                        {c.teamName ?? "Free agent"}
                      </span>
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(c.id, () => addSessionPayer(sessionId, c.id))}
                      className="shrink-0 rounded-md px-2 py-0.5 text-xs font-bold text-burnt-400 hover:bg-burnt-500/10 disabled:opacity-50"
                    >
                      + Add
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
