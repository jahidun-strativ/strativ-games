"use client";

import { useState, useTransition, type DragEvent } from "react";
import { App } from "antd";
import { movePlayerToTeam, swapPlayers } from "@/server/actions/players";

export type BoardPlayer = {
  id: string;
  name: string;
  position: string;
  sportId: string;
  teamId: string | null;
};
export type BoardTeam = { id: string; name: string; sportId: string; captainId: string | null };
export type BoardSport = { id: string; name: string; color: string };

const FREE = "__free__";

export function SquadBoard({
  sports,
  teams,
  players,
}: {
  sports: BoardSport[];
  teams: BoardTeam[];
  players: BoardPlayer[];
}) {
  const { message } = App.useApp();
  // Local roster state so a drop lands instantly; reverted if the server says no.
  const [teamOf, setTeamOf] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(players.map((p) => [p.id, p.teamId])),
  );
  // The player being dragged, or tapped to select (the touch path — native
  // HTML5 drag-and-drop doesn't fire on touchscreens).
  const [held, setHeld] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const byId = new Map(players.map((p) => [p.id, p]));
  const teamById = new Map(teams.map((t) => [t.id, t]));

  function apply(
    success: string,
    optimistic: Record<string, string | null>,
    action: () => Promise<void>,
  ) {
    const before = teamOf;
    setTeamOf({ ...teamOf, ...optimistic });
    setHeld(null);
    setOver(null);
    startTransition(async () => {
      try {
        await action();
        message.success(success);
      } catch (err) {
        setTeamOf(before);
        message.error(err instanceof Error ? err.message : "Couldn't move that player.");
      }
    });
  }

  function moveTo(playerId: string, teamId: string | null) {
    const player = byId.get(playerId);
    if (!player || teamOf[playerId] === teamId) {
      setHeld(null);
      return;
    }
    if (teamId && teamById.get(teamId)?.sportId !== player.sportId) {
      message.error(`${player.name} doesn't play that sport.`);
      setHeld(null);
      return;
    }
    apply(
      teamId ? `${player.name} moved.` : `${player.name} released.`,
      { [playerId]: teamId },
      () => movePlayerToTeam(playerId, teamId),
    );
  }

  // Dropping one player onto another trades their teams. Dropping onto a free
  // agent is really a drop on the free-agents column, so it just releases.
  function swapWith(heldId: string, targetId: string) {
    const a = byId.get(heldId);
    const b = byId.get(targetId);
    const from = teamOf[heldId];
    const to = teamOf[targetId] ?? null;
    if (!a || !b || heldId === targetId || from === to) {
      setHeld(null);
      return;
    }
    if (!from || !to) return moveTo(heldId, to);
    if (a.sportId !== b.sportId) {
      message.error("Players can only be swapped within the same sport.");
      setHeld(null);
      return;
    }
    apply(`${a.name} ⇄ ${b.name}`, { [heldId]: to, [targetId]: from }, () =>
      swapPlayers(heldId, targetId),
    );
  }

  function draggedId(e: DragEvent) {
    return e.dataTransfer.getData("text/plain") || held;
  }

  return (
    <div className="space-y-10">
      {/* Held players survive scrolling, so the drop target can be a column
          you had to scroll to find. Stays put while you look for it. */}
      {held ? (
        <div className="sticky top-2 z-10 flex items-center justify-between gap-3 rounded-lg border border-burnt-400 bg-burnt-500/10 px-3 py-2 text-sm backdrop-blur">
          <span className="min-w-0 truncate">
            Holding <span className="font-bold">{byId.get(held)?.name}</span> — tap a team to move,
            or another player to swap.
          </span>
          <button
            type="button"
            onClick={() => setHeld(null)}
            className="shrink-0 rounded-md px-2 py-0.5 text-xs font-bold text-ink-500 hover:bg-cream-200"
          >
            Cancel
          </button>
        </div>
      ) : null}

      {sports.map((sport) => {
        const sportTeams = teams.filter((t) => t.sportId === sport.id);
        const sportPlayers = players.filter((p) => p.sportId === sport.id);
        if (sportTeams.length === 0 && sportPlayers.length === 0) return null;

        const columns = [
          { id: FREE, teamId: null as string | null, name: "Free agents", captainId: null },
          ...sportTeams.map((t) => ({
            id: t.id,
            teamId: t.id as string | null,
            name: t.name,
            captainId: t.captainId,
          })),
        ];

        return (
          <section key={sport.id}>
            <h2 className="font-display mb-3 flex items-center gap-2 text-xl text-ink-900">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: sport.color }}
              />
              {sport.name}
            </h2>
            {/* One scrolling strip, never a wrapping grid: a team on a second
                row is off-screen from the team you're dragging out of. */}
            <div className="flex gap-3 overflow-x-auto pb-2">
              {columns.map((col) => {
                const roster = sportPlayers.filter((p) => (teamOf[p.id] ?? null) === col.teamId);
                const isOver = over === col.id;
                return (
                  <div
                    key={col.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setOver(col.id);
                    }}
                    onDragLeave={() => setOver((c) => (c === col.id ? null : c))}
                    onDrop={(e) => {
                      e.preventDefault();
                      const id = draggedId(e);
                      if (id) moveTo(id, col.teamId);
                    }}
                    onClick={() => held && moveTo(held, col.teamId)}
                    className={`tv-card-sm flex min-h-40 shrink-0 basis-60 flex-col p-3 transition-colors sm:flex-1 ${
                      isOver ? "bg-burnt-500/10 ring-2 ring-burnt-400" : ""
                    } ${held ? "cursor-copy" : ""}`}
                  >
                    <div className="mb-2 flex items-baseline justify-between gap-2 border-b border-line pb-2">
                      <h3 className="truncate font-bold">
                        {col.teamId ? col.name : "🆓 Free agents"}
                      </h3>
                      <span className="shrink-0 text-xs text-ink-500">{roster.length}</span>
                    </div>
                    {roster.length === 0 ? (
                      <p className="my-auto text-center text-xs text-ink-500">
                        {held ? "Drop here" : "Empty"}
                      </p>
                    ) : (
                      // Capped so a long free-agents list doesn't stretch every
                      // other column past the fold.
                      <ul className="max-h-[55vh] space-y-1.5 overflow-y-auto">
                        {roster.map((p) => {
                          const picked = held === p.id;
                          return (
                            <li
                              key={p.id}
                              draggable={!busy}
                              onDragStart={(e) => {
                                e.dataTransfer.setData("text/plain", p.id);
                                e.dataTransfer.effectAllowed = "move";
                                setHeld(p.id);
                              }}
                              onDragEnd={() => setOver(null)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const id = draggedId(e);
                                if (id) swapWith(id, p.id);
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (held && held !== p.id) swapWith(held, p.id);
                                else setHeld(picked ? null : p.id);
                              }}
                              className={`flex cursor-grab items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-sm active:cursor-grabbing ${
                                picked
                                  ? "border-burnt-400 bg-burnt-500/10 ring-2 ring-burnt-400"
                                  : "border-line bg-cream-50"
                              }`}
                            >
                              <span className="min-w-0 truncate font-semibold">
                                {col.captainId === p.id ? "🧢 " : ""}
                                {p.name}
                              </span>
                              {p.position ? (
                                <span className="shrink-0 text-xs text-ink-500">{p.position}</span>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
