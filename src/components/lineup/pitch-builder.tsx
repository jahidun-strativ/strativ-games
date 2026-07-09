"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { App, Drawer } from "antd";
import {
  DEFAULT_SUBS,
  MAX_SUBS,
  MIN_SUBS,
  SQUAD_SIZES,
  buildFormationSlots,
  formationsForSize,
  squadSizeOf,
} from "@/lib/formations";
import { saveLineup, type LineupSlotInput } from "@/server/actions/lineups";
import type { Player } from "@/db/schema";

type Active = { kind: "starter"; index: number } | { kind: "sub"; index: number } | null;

export function PitchBuilder({
  teamId,
  roster,
  initialFormation,
  initialStarters,
  initialSubs,
  canEdit = true,
}: {
  teamId: string;
  roster: Player[];
  initialFormation: string;
  // playerId keyed by starter slot index
  initialStarters: Record<number, string | null>;
  // ordered bench playerIds
  initialSubs: (string | null)[];
  canEdit?: boolean;
}) {
  const { message } = App.useApp();
  const [formation, setFormation] = useState(initialFormation);
  const [starters, setStarters] = useState<Record<number, string | null>>(initialStarters);
  const [subs, setSubs] = useState<(string | null)[]>(
    initialSubs.length >= MIN_SUBS ? initialSubs : Array(DEFAULT_SUBS).fill(null),
  );
  const [active, setActive] = useState<Active>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Desktop shows the picker inline in the sidebar; mobile opens it as a
  // bottom-sheet Drawer instead so it never overlaps the pitch/bench.
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const size = squadSizeOf(formation);
  const slots = useMemo(() => buildFormationSlots(formation), [formation]);
  const playerById = useMemo(() => new Map(roster.map((p) => [p.id, p])), [roster]);

  const usedIds = new Set<string>(
    [...Object.values(starters), ...subs].filter(Boolean) as string[],
  );

  function changeSquadSize(nextSize: number) {
    const nextFormation = formationsForSize(nextSize)[0];
    applyFormation(nextFormation);
  }

  function applyFormation(next: string) {
    setStarters((prev) => {
      // Keep assignments by slot index that still exist in the new shape.
      const nextCount = buildFormationSlots(next).length;
      const kept: Record<number, string | null> = {};
      for (let i = 0; i < nextCount; i++) if (prev[i]) kept[i] = prev[i];
      return kept;
    });
    setFormation(next);
    setActive(null);
    setSaved(false);
  }

  function clearFrom(playerId: string) {
    setStarters((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) if (next[Number(k)] === playerId) next[Number(k)] = null;
      return next;
    });
    setSubs((prev) => prev.map((id) => (id === playerId ? null : id)));
  }

  function assign(playerId: string | null) {
    if (!active) return;
    if (playerId) clearFrom(playerId);
    if (active.kind === "starter") {
      setStarters((prev) => ({ ...prev, [active.index]: playerId }));
    } else {
      setSubs((prev) => prev.map((id, i) => (i === active.index ? playerId : id)));
    }
    setActive(null);
    setSaved(false);
  }

  function setBenchSize(n: number) {
    setSubs((prev) => {
      const next = prev.slice(0, n);
      while (next.length < n) next.push(null);
      return next;
    });
    setSaved(false);
  }

  function handleSave() {
    const payload: LineupSlotInput[] = [
      ...slots.map((slot, i) => ({
        role: "starter" as const,
        slotIndex: i,
        positionLabel: slot.position,
        playerId: starters[i] ?? null,
      })),
      ...subs.map((playerId, i) => ({
        role: "sub" as const,
        slotIndex: i,
        positionLabel: "SUB",
        playerId,
      })),
    ];
    startTransition(async () => {
      try {
        await saveLineup(teamId, formation, size, payload);
        setSaved(true);
        message.success("Lineup saved.");
      } catch (err) {
        message.error(err instanceof Error ? err.message : "Couldn't save lineup.");
      }
    });
  }

  const surname = (name: string) => name.split(" ").at(-1) ?? name;
  const startersFilled = Object.values(starters).filter(Boolean).length;
  const subsFilled = subs.filter(Boolean).length;

  // Roster available to assign into the currently open slot.
  const currentPlayerId =
    active?.kind === "starter"
      ? starters[active.index]
      : active?.kind === "sub"
        ? subs[active.index]
        : null;

  const pickTitle =
    active === null
      ? ""
      : active.kind === "starter"
        ? `Pick ${slots[active.index].position}`
        : `Pick substitute ${active.index + 1}`;

  // The clear-slot action + roster list, shared by the desktop sidebar and the
  // mobile bottom sheet.
  const rosterPicker = active !== null && (
    <>
      {currentPlayerId ? (
        <button
          onClick={() => assign(null)}
          className="mb-2 w-full rounded-lg bg-tvred-500/10 px-3 py-2 text-left text-sm font-semibold text-tvred-500 hover:bg-tvred-500/15"
        >
          ✕ Clear this slot
        </button>
      ) : null}
      <ul className="space-y-1.5">
        {roster
          .filter((p) => p.status === "active")
          .map((p) => {
            const taken = usedIds.has(p.id) && p.id !== currentPlayerId;
            return (
              <li key={p.id}>
                <button
                  onClick={() => assign(p.id)}
                  className={`w-full rounded-lg border border-line px-3 py-2 text-left text-sm font-semibold ${
                    p.id === currentPlayerId
                      ? "bg-gold-300/20"
                      : taken
                        ? "bg-cream-200 text-ink-400"
                        : "bg-cream-50 hover:bg-cream-200"
                  }`}
                >
                  <span className="scoreboard mr-2 text-burnt-400">
                    {p.squadNumber ?? "–"}
                  </span>
                  {p.name}
                  <span className="float-right text-xs text-ink-500">
                    {p.position}
                    {taken ? " · picked" : ""}
                  </span>
                </button>
              </li>
            );
          })}
      </ul>
    </>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div>
        {/* Controls */}
        {!canEdit ? (
          <div className="tv-card-sm mb-4 px-4 py-3 text-sm text-ink-500">
            Viewing {formation} ({size}-a-side). Only admins can edit the lineup.
          </div>
        ) : null}
        <div className={`mb-4 flex flex-wrap items-end gap-3 ${canEdit ? "" : "hidden"}`}>
          <label className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            Squad size
            <select
              value={size}
              onChange={(e) => changeSquadSize(Number(e.target.value))}
              className="mt-1 block rounded-lg border border-line bg-cream-50 px-3 py-2 text-sm font-semibold text-ink-900 shadow-sm"
            >
              {SQUAD_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}-a-side
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            Formation
            <select
              value={formation}
              onChange={(e) => applyFormation(e.target.value)}
              className="mt-1 block rounded-lg border border-line bg-cream-50 px-3 py-2 text-sm font-semibold text-ink-900 shadow-sm"
            >
              {formationsForSize(size).map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            Subs
            <select
              value={subs.length}
              onChange={(e) => setBenchSize(Number(e.target.value))}
              className="mt-1 block rounded-lg border border-line bg-cream-50 px-3 py-2 text-sm font-semibold text-ink-900 shadow-sm"
            >
              {Array.from({ length: MAX_SUBS - MIN_SUBS + 1 }, (_, i) => MIN_SUBS + i).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="rounded-lg bg-burnt-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-burnt-600 disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save lineup"}
          </button>
          {saved ? <span className="text-sm font-semibold text-pitch-500">✓ Saved</span> : null}
        </div>

        <p className="mb-3 text-xs text-ink-500">
          {startersFilled}/{size} starters · {subsFilled}/{subs.length} subs picked
        </p>

        {/* Pitch */}
        <div
          className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-tv border border-pitch-800/40 shadow-[var(--shadow-tv-lg)]"
          style={{
            background: "repeating-linear-gradient(0deg, #16401f 0 12.5%, #1c5228 12.5% 25%)",
          }}
        >
          <div className="pointer-events-none absolute inset-x-[10%] top-0 h-[16%] rounded-b-lg border-2 border-t-0 border-white/60" />
          <div className="pointer-events-none absolute inset-x-[10%] bottom-0 h-[16%] rounded-t-lg border-2 border-b-0 border-white/60" />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t-2 border-white/60" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/60" />

          {slots.map((slot, i) => {
            const player = starters[i] ? playerById.get(starters[i]!) : null;
            const isActive = active?.kind === "starter" && active.index === i;
            return (
              <button
                key={i}
                disabled={!canEdit}
                onClick={() => setActive(isActive ? null : { kind: "starter", index: i })}
                className="absolute -translate-x-1/2 -translate-y-1/2 disabled:cursor-default"
                style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
              >
                <span
                  className={`flex h-12 w-12 flex-col items-center justify-center rounded-full border-2 text-[10px] font-bold leading-tight transition-transform sm:h-14 sm:w-14 ${
                    isActive
                      ? "scale-110 border-gold-300 bg-gold-300 text-black"
                      : player
                        ? "border-white/70 bg-cream-50 text-ink-900 shadow-lg"
                        : "border-dashed border-white/70 bg-black/30 text-white"
                  }`}
                >
                  {player ? (
                    <>
                      <span className="scoreboard text-xs">{player.squadNumber ?? ""}</span>
                      <span className="max-w-full truncate px-1">{surname(player.name)}</span>
                    </>
                  ) : (
                    <span>{slot.position}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bench */}
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">
            Bench
          </p>
          <div className="flex flex-wrap gap-2">
            {subs.map((playerId, i) => {
              const player = playerId ? playerById.get(playerId) : null;
              const isActive = active?.kind === "sub" && active.index === i;
              return (
                <button
                  key={i}
                  disabled={!canEdit}
                  onClick={() => setActive(isActive ? null : { kind: "sub", index: i })}
                  className={`flex min-w-28 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:cursor-default ${
                    isActive
                      ? "border-gold-300 bg-gold-300/15"
                      : "border-line bg-cream-50 hover:bg-cream-200"
                  }`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cream-200 text-xs font-bold">
                    {player?.squadNumber ?? i + 1}
                  </span>
                  <span className="truncate font-semibold">
                    {player ? player.name : "Empty"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Desktop: picker inline in the sidebar */}
      <aside className={`tv-card h-fit p-4 ${canEdit ? "hidden lg:block" : "hidden"}`}>
        {active !== null ? (
          <>
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-lg text-ink-900">{pickTitle}</p>
              <button
                onClick={() => setActive(null)}
                className="rounded-md bg-cream-200 px-2.5 py-1 text-xs font-semibold"
              >
                Close
              </button>
            </div>
            {rosterPicker}
          </>
        ) : (
          <div>
            <p className="font-display text-lg text-ink-900">Lineup builder</p>
            <p className="mt-2 text-sm text-ink-500">
              Choose squad size (5–11), a formation, and up to {MAX_SUBS} subs. Tap a
              position on the pitch or a bench slot, then pick a player. Each player can
              only hold one spot.
            </p>
          </div>
        )}
      </aside>

      {/* Mobile: picker as an opaque bottom sheet so it never overlaps the bench */}
      <Drawer
        placement="bottom"
        height="auto"
        open={canEdit && !isDesktop && active !== null}
        onClose={() => setActive(null)}
        title={pickTitle}
        styles={{ body: { maxHeight: "60vh", overflowY: "auto" } }}
      >
        {rosterPicker}
      </Drawer>
    </div>
  );
}
