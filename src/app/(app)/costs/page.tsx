import { Suspense } from "react";
import Link from "next/link";
import { isNotNull, and, isNull } from "drizzle-orm";
import { db } from "@/db";
import { matches, sessions } from "@/db/schema";
import { PageHeader } from "@/components/ui/page-header";
import { TableSkeleton } from "@/components/ui/skeleton";
import { formatBdt, formatDate } from "@/lib/format";
import { APP_TIMEZONE } from "@/lib/timezone";
import { deriveSessionPayers } from "@/server/queries/session-costs";
import { isAdmin } from "@/server/auth";
import { RemindUnpaidButton } from "@/components/remind-unpaid-button";

export const metadata = { title: "Costs" };

// Month bucket key in Bangladesh time (bookings near midnight land correctly).
const monthFmt = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: APP_TIMEZONE,
});
const monthKey = (d: Date) => monthFmt.format(d);

function Tile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="tv-card-sm p-4">
      <p className={`scoreboard text-xl font-bold ${tone ?? "text-ink-900"}`}>{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-500">
        {label}
      </p>
    </div>
  );
}

async function CostsContent() {
  // Slots own the cost for their fixtures; legacy standalone matches (no
  // session) carry their own. Same split the venue page uses, app-wide.
  const [slots, legacy] = await Promise.all([
    db.query.sessions.findMany({
      where: isNotNull(sessions.cost),
      orderBy: (s, { desc }) => desc(s.startAt),
      with: {
        venue: { columns: { name: true } },
        payments: { columns: { playerId: true, paid: true } },
        fixtures: {
          columns: { id: true },
          with: {
            homeTeam: true,
            awayTeam: true,
            // Who actually played each game — the split is built from these.
            playerStats: {
              columns: { playerId: true, played: true },
              with: { player: { columns: { name: true } } },
            },
          },
        },
      },
    }),
    db.query.matches.findMany({
      where: and(isNull(matches.sessionId), isNotNull(matches.cost)),
      columns: { cost: true, paidBy: true, kickoffAt: true },
    }),
  ]);

  const admin = await isAdmin();

  const rows = [
    ...slots.map((s) => ({ cost: s.cost ?? 0, paidBy: s.paidBy, at: s.startAt })),
    ...legacy.map((m) => ({ cost: m.cost ?? 0, paidBy: m.paidBy, at: m.kickoffAt })),
  ];

  const total = rows.reduce((sum, r) => sum + r.cost, 0);
  const office = rows.filter((r) => r.paidBy !== "self").reduce((s, r) => s + r.cost, 0);
  const self = total - office;
  const thisMonth = monthKey(new Date());
  const monthTotal = rows
    .filter((r) => monthKey(r.at) === thisMonth)
    .reduce((s, r) => s + r.cost, 0);

  // Settle-up state per self-paid slot with a cost split.
  const settle = slots
    .filter((s) => s.paidBy === "self" && (s.cost ?? 0) > 0)
    .map((s) => {
      // Split members = players who actually played this slot's games.
      const payers = deriveSessionPayers(s.fixtures, s.payments);
      const n = payers.length;
      const perHead = n ? Math.round((s.cost ?? 0) / n) : 0;
      const unpaid = payers.filter((p) => !p.paid);
      const collected = n ? Math.round(((s.cost ?? 0) * (n - unpaid.length)) / n) : 0;
      const label =
        s.title ||
        s.fixtures
          .map((f) => [f.homeTeam?.name, f.awayTeam?.name].filter(Boolean).join(" v "))
          .filter(Boolean)[0] ||
        "Booked slot";
      return {
        id: s.id,
        label,
        at: s.startAt,
        venue: s.venue.name,
        cost: s.cost ?? 0,
        n,
        perHead,
        collected,
        outstanding: Math.max((s.cost ?? 0) - collected, 0),
        unpaidNames: unpaid.map((p) => p.name),
      };
    });
  const toSettle = settle.filter((s) => s.outstanding > 0);
  const outstandingTotal = toSettle.reduce((s, r) => s + r.outstanding, 0);

  // Who owes overall: per-head share summed across every unpaid split row.
  const owes = new Map<string, number>();
  for (const s of settle) {
    for (const name of s.unpaidNames) owes.set(name, (owes.get(name) ?? 0) + s.perHead);
  }
  const debtors = [...owes.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Total spend" value={formatBdt(total)} />
        <Tile label="Office paid" value={formatBdt(office)} tone="text-pitch-500" />
        <Tile label="We paid" value={formatBdt(self)} tone="text-burnt-400" />
        <Tile label="Outstanding" value={formatBdt(outstandingTotal)} tone="text-gold-400" />
      </div>
      <p className="mt-3 text-sm text-ink-500">
        {thisMonth}: <span className="font-semibold text-ink-700">{formatBdt(monthTotal)}</span>{" "}
        booked · {rows.length} costed booking{rows.length === 1 ? "" : "s"} all-time
      </p>

      <h2 className="font-display mb-3 mt-8 text-xl text-ink-900">
        To settle <span className="text-sm text-ink-500">({toSettle.length})</span>
      </h2>
      {toSettle.length === 0 ? (
        <p className="text-sm text-ink-500">
          Nothing outstanding — every self-paid slot is settled (or has no split yet).
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {toSettle.map((s) => (
            <div key={s.id} className="tv-card-sm p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate font-display text-base text-ink-900">{s.label}</p>
                <p className="scoreboard shrink-0 font-bold text-gold-400">
                  {formatBdt(s.outstanding)}
                </p>
              </div>
              <p className="mt-0.5 text-xs text-ink-500">
                {formatDate(s.at)} · {s.venue} · {formatBdt(s.cost)} total
                {s.n ? ` · ${formatBdt(s.perHead)}/head` : ""}
              </p>
              <p className="mt-2 text-xs text-ink-500">
                {s.n === 0 ? (
                  "No players recorded as played yet — record the result to build the split."
                ) : (
                  <>
                    <span className="font-semibold text-tvred-500">
                      {s.unpaidNames.length} unpaid:
                    </span>{" "}
                    {s.unpaidNames.join(", ")}
                  </>
                )}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {admin ? (
                  <RemindUnpaidButton sessionId={s.id} count={s.unpaidNames.length} />
                ) : null}
                <Link
                  href={`/sessions/${s.id}`}
                  className="text-xs font-semibold text-burnt-400 hover:underline"
                >
                  Open slot →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {debtors.length > 0 ? (
        <>
          <h2 className="font-display mb-3 mt-8 text-xl text-ink-900">Who owes</h2>
          <div className="tv-card-sm divide-y divide-line">
            {debtors.map(([name, amount]) => (
              <div key={name} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="font-semibold text-ink-900">{name}</span>
                <span className="scoreboard font-bold text-gold-400">{formatBdt(amount)}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}

export default function CostsPage() {
  return (
    <div>
      <PageHeader kicker="The books" title="Costs" />
      <Suspense fallback={<TableSkeleton rows={6} />}>
        <CostsContent />
      </Suspense>
    </div>
  );
}
