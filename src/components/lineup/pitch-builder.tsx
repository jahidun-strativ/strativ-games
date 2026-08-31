"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { App, Drawer } from "antd";
import {
  SQUAD_SIZES,
  buildFormationSlots,
  formationsForSize,
  squadSizeOf,
} from "@/lib/formations";
import { type LineupSlotInput } from "@/server/actions/lineups";
import type { Player } from "@/db/schema";

type Active = { kind: "starter"; index: number } | { kind: "sub"; index: number } | null;

// Two initials for the small sub chip.
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "") || name[0] || "?").toUpperCase();
}

export function PitchBuilder({
  roster,
  initialFormation,
  initialStarters,
  initialSubs,
  onSave,
  canEdit = true,
  editorLabel = "an admin",
}: {
  roster: Player[];
  initialFormation: string;
  // playerId keyed by starter slot index
  initialStarters: Record<number, string | null>;
  // each starting position's designated substitute, keyed by the SAME starter
  // slot index (so a sub sits beside the position it backs up)
  initialSubs: Record<number, string | null>;
  // Persists the built lineup. Provided by the caller (team-default vs per-match).
  onSave: (formation: string, squadSize: number, slots: LineupSlotInput[]) => Promise<void>;
  canEdit?: boolean;
  // Who may edit, shown in the read-only banner (team default = admin,
  // per-match = captain).
  editorLabel?: string;
}) {
  const { message } = App.useApp();
  const [formation, setFormation] = useState(initialFormation);
  const [starters, setStarters] = useState<Record<number, string | null>>(initialStarters);
  const [subs, setSubs] = useState<Record<number, string | null>>(initialSubs);
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
    [...Object.values(starters), ...Object.values(subs)].filter(Boolean) as string[],
  );

  function changeSquadSize(nextSize: number) {
    const nextFormation = formationsForSize(nextSize)[0];
    applyFormation(nextFormation);
  }

  function applyFormation(next: string) {
    // Keep both starters and their subs by slot index that still exist in the
    // new shape.
    const nextCount = buildFormationSlots(next).length;
    const prune = (prev: Record<number, string | null>) => {
      const kept: Record<number, string | null> = {};
      for (let i = 0; i < nextCount; i++) if (prev[i]) kept[i] = prev[i];
      return kept;
    };
    setStarters(prune);
    setSubs(prune);
    setFormation(next);
    setActive(null);
    setSaved(false);
  }

  function clearFrom(playerId: string) {
    const drop = (prev: Record<number, string | null>) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) if (next[Number(k)] === playerId) next[Number(k)] = null;
      return next;
    };
    setStarters(drop);
    setSubs(drop);
  }

  function assign(playerId: string | null) {
    if (!active) return;
    if (playerId) clearFrom(playerId);
    const setter = active.kind === "starter" ? setStarters : setSubs;
    setter((prev) => ({ ...prev, [active.index]: playerId }));
    setActive(null);
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
      // One sub per starting position that has a backup assigned, tagged with
      // the position it covers and stored under that starter's slot index.
      ...slots
        .map((slot, i) => ({
          role: "sub" as const,
          slotIndex: i,
          positionLabel: slot.position,
          playerId: subs[i] ?? null,
        }))
        .filter((s) => s.playerId),
    ];
    startTransition(async () => {
      try {
        await onSave(formation, size, payload);
        setSaved(true);
        message.success("Lineup saved.");
      } catch (err) {
        message.error(err instanceof Error ? err.message : "Couldn't save lineup.");
      }
    });
  }

  const startersFilled = Object.values(starters).filter(Boolean).length;
  const subsFilled = Object.values(subs).filter(Boolean).length;

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
        : `Pick sub for ${slots[active.index].position}`;

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
            Viewing {formation} ({size}-a-side). Only {editorLabel} can edit it.
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
          {startersFilled}/{size} starters · {subsFilled} position sub{subsFilled === 1 ? "" : "s"}
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
            const subPlayer = subs[i] ? playerById.get(subs[i]!) : null;
            const starterActive = active?.kind === "starter" && active.index === i;
            const subActive = active?.kind === "sub" && active.index === i;
            return (
              <div
                key={i}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
              >
                <div className="relative">
                  {/* Starter token — shows the position; the name sits on a
                      readable label below, not crammed inside the circle. */}
                  <button
                    disabled={!canEdit}
                    onClick={() => setActive(starterActive ? null : { kind: "starter", index: i })}
                    title={player?.name}
                    className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-transform disabled:cursor-default sm:h-12 sm:w-12 ${
                      starterActive
                        ? "scale-110 border-gold-300 bg-gold-300 text-black"
                        : player
                          ? "border-white/70 bg-cream-50 text-ink-900 shadow-lg"
                          : "border-dashed border-white/70 bg-black/30 text-white"
                    }`}
                  >
                    {slot.position}
                  </button>

                  {/* Per-position sub chip, tucked at the token's shoulder. */}
                  <button
                    disabled={!canEdit}
                    onClick={() => setActive(subActive ? null : { kind: "sub", index: i })}
                    title={subPlayer ? `Sub for ${slot.position}: ${subPlayer.name}` : `Add a sub for ${slot.position}`}
                    className={`absolute -right-2 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border px-1 text-[9px] font-bold leading-none transition-transform disabled:cursor-default ${
                      subActive
                        ? "scale-110 border-gold-300 bg-gold-300 text-black"
                        : subPlayer
                          ? "border-sky-300 bg-sky-500 text-white shadow"
                          : "border-white/50 bg-black/50 text-white/80"
                    }`}
                  >
                    {subPlayer ? initials(subPlayer.name) : "+"}
                  </button>
                </div>

                {/* Name label — full name, truncated with a tooltip, always legible. */}
                {player ? (
                  <span
                    title={player.name}
                    className="mt-1 max-w-[76px] truncate rounded bg-black/70 px-1.5 py-0.5 text-center text-[10px] font-semibold text-white sm:max-w-[92px]"
                  >
                    {player.name}
                  </span>
                ) : (
                  <span className="mt-1 text-[10px] font-semibold text-white/70">Tap to fill</span>
                )}
              </div>
            );
          })}
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
              Choose squad size (5–11) and a formation. Tap a position to pick its starter,
              or tap the small <span className="font-bold text-sky-500">+</span> chip beside
              it to name that position&apos;s substitute. Each player can only hold one spot.
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
