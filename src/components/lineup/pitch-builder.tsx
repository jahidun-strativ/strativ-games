"use client";

import { useMemo, useState, useTransition } from "react";
import { FORMATIONS, FORMATION_KEYS } from "@/lib/formations";
import { saveLineup, type LineupSlotInput } from "@/server/actions/lineups";
import type { Player } from "@/db/schema";

type Assignments = Record<number, string | null>; // slotIndex -> playerId

export function PitchBuilder({
  teamId,
  roster,
  initialFormation,
  initialSlots,
}: {
  teamId: string;
  roster: Player[];
  initialFormation: string;
  initialSlots: LineupSlotInput[];
}) {
  const startFormation = FORMATIONS[initialFormation] ? initialFormation : "4-4-2";
  const [formation, setFormation] = useState(startFormation);
  const [assignments, setAssignments] = useState<Assignments>(() => {
    const map: Assignments = {};
    for (const slot of initialSlots) map[slot.slotIndex] = slot.playerId;
    return map;
  });
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const slots = FORMATIONS[formation].slots;
  const playerById = useMemo(() => new Map(roster.map((p) => [p.id, p])), [roster]);
  const assignedIds = new Set(Object.values(assignments).filter(Boolean));

  function changeFormation(next: string) {
    setFormation(next);
    // Keep assignments by slot index; drop indices beyond the new slot count.
    setAssignments((prev) => {
      const kept: Assignments = {};
      FORMATIONS[next].slots.forEach((_, i) => {
        if (prev[i]) kept[i] = prev[i];
      });
      return kept;
    });
    setActiveSlot(null);
    setSaved(false);
  }

  function assign(slotIndex: number, playerId: string | null) {
    setAssignments((prev) => {
      const next = { ...prev };
      if (playerId) {
        // Remove the player from any other slot first.
        for (const key of Object.keys(next)) {
          if (next[Number(key)] === playerId) next[Number(key)] = null;
        }
      }
      next[slotIndex] = playerId;
      return next;
    });
    setActiveSlot(null);
    setSaved(false);
  }

  function handleSave() {
    const payload: LineupSlotInput[] = slots.map((slot, i) => ({
      slotIndex: i,
      positionLabel: slot.position,
      playerId: assignments[i] ?? null,
    }));
    startTransition(async () => {
      await saveLineup(teamId, formation, payload);
      setSaved(true);
    });
  }

  const surname = (name: string) => name.split(" ").at(-1) ?? name;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <select
            value={formation}
            onChange={(e) => changeFormation(e.target.value)}
            className="rounded-lg border border-line bg-cream-50 px-3 py-2 text-sm font-semibold shadow-sm"
          >
            {FORMATION_KEYS.map((f) => (
              <option key={f} value={f}>
                {f} — {FORMATIONS[f].label}
              </option>
            ))}
          </select>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="rounded-lg bg-burnt-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-burnt-600 disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save lineup"}
          </button>
          {saved ? (
            <span className="text-sm font-bold text-pitch-600">✓ Saved</span>
          ) : null}
        </div>

        {/* The pitch */}
        <div
          className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-tv border border-pitch-800/40 shadow-[var(--shadow-tv-lg)]"
          style={{
            background:
              "repeating-linear-gradient(0deg, #2e6b34 0 12.5%, #3d8a45 12.5% 25%)",
          }}
        >
          {/* Pitch markings */}
          <div className="pointer-events-none absolute inset-x-[10%] top-0 h-[18%] rounded-b-lg border-2 border-t-0 border-white/70" />
          <div className="pointer-events-none absolute inset-x-[30%] top-0 h-[8%] rounded-b-md border-2 border-t-0 border-white/70" />
          <div className="pointer-events-none absolute inset-x-[10%] bottom-0 h-[18%] rounded-t-lg border-2 border-b-0 border-white/70" />
          <div className="pointer-events-none absolute inset-x-[30%] bottom-0 h-[8%] rounded-t-md border-2 border-b-0 border-white/70" />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t-2 border-white/70" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/70" />

          {slots.map((slot, i) => {
            const player = assignments[i] ? playerById.get(assignments[i]!) : null;
            const active = activeSlot === i;
            return (
              <button
                key={i}
                onClick={() => setActiveSlot(active ? null : i)}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
              >
                <span
                  className={`flex h-12 w-12 flex-col items-center justify-center rounded-full border-2 text-[10px] font-bold leading-tight transition-transform sm:h-14 sm:w-14 ${
                    active
                      ? "scale-110 border-gold-300 bg-gold-300 text-black"
                      : player
                        ? "border-white/70 bg-cream-50 text-ink-900 shadow-lg"
                        : "border-dashed border-white/70 bg-pitch-800/60 text-white"
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
      </div>

      {/* Player picker */}
      <aside
        className={`tv-card h-fit p-4 ${
          activeSlot !== null
            ? "fixed inset-x-3 bottom-20 z-50 max-h-[50vh] overflow-y-auto lg:static lg:max-h-none"
            : "hidden lg:block"
        }`}
      >
        {activeSlot !== null ? (
          <>
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-lg text-ink-900">
                Pick {slots[activeSlot].position}
              </p>
              <button
                onClick={() => setActiveSlot(null)}
                className="rounded-md bg-cream-200 px-2.5 py-1 text-xs font-semibold"
              >
                Close
              </button>
            </div>
            {assignments[activeSlot] ? (
              <button
                onClick={() => assign(activeSlot, null)}
                className="mb-2 w-full rounded-lg bg-tvred-500/10 px-3 py-2 text-left text-sm font-semibold text-tvred-500 hover:bg-tvred-500/15"
              >
                ✕ Clear slot
              </button>
            ) : null}
            <ul className="space-y-1.5">
              {roster
                .filter((p) => p.status === "active")
                .map((p) => {
                  const taken = assignedIds.has(p.id) && assignments[activeSlot] !== p.id;
                  return (
                    <li key={p.id}>
                      <button
                        onClick={() => assign(activeSlot, p.id)}
                        className={`w-full rounded-lg border border-line px-3 py-2 text-left text-sm font-semibold ${
                          assignments[activeSlot] === p.id
                            ? "bg-gold-300 text-black"
                            : taken
                              ? "bg-cream-200 text-ink-500"
                              : "bg-cream-50 hover:bg-cream-200"
                        }`}
                      >
                        <span className="scoreboard mr-2 text-burnt-400">
                          {p.squadNumber ?? "–"}
                        </span>
                        {p.name}
                        <span className="float-right text-xs text-ink-500">
                          {p.position}
                          {taken ? " · in XI" : ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
            </ul>
          </>
        ) : (
          <div>
            <p className="font-display text-lg text-ink-900">Lineup builder</p>
            <p className="mt-2 text-sm text-ink-500">
              Tap a position disc on the pitch, then pick a player. Players already in the
              XI are moved, not duplicated. Injured or suspended players are hidden.
            </p>
            <p className="mt-3 text-sm">
              <span className="scoreboard font-bold text-burnt-400">
                {Object.values(assignments).filter(Boolean).length}
              </span>{" "}
              / {slots.length} positions filled
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
