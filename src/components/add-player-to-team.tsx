"use client";

import { useState, useTransition } from "react";
import { App } from "antd";
import { FormModal } from "@/components/form-modal";
import { PlayerForm } from "@/components/player-form";
import {
  assignPlayerToTeam,
  createPlayer,
  removePlayerFromTeam,
} from "@/server/actions/players";
import type { Sport, Team } from "@/db/schema";

export type AssignablePlayer = {
  id: string;
  name: string;
  position: string;
  sportId: string;
  teamId: string | null;
  teamName: string | null;
};

export function AddPlayerButton({
  teamId,
  teamName,
  teamSportId,
  players,
  sports,
  teams,
}: {
  teamId: string;
  teamName: string;
  teamSportId: string;
  players: AssignablePlayer[];
  sports: Sport[];
  teams: Team[];
}) {
  return (
    <FormModal title={`${teamName} — roster`} triggerLabel="+ Add / remove players" width={560}>
      {(close) => (
        <AddPlayerBody
          teamId={teamId}
          teamSportId={teamSportId}
          players={players}
          sports={sports}
          teams={teams}
          onDone={close}
        />
      )}
    </FormModal>
  );
}

function AddPlayerBody({
  teamId,
  teamSportId,
  players,
  sports,
  teams,
  onDone,
}: {
  teamId: string;
  teamSportId: string;
  players: AssignablePlayer[];
  sports: Sport[];
  teams: Team[];
  onDone: () => void;
}) {
  const { message } = App.useApp();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  // Track changes made in this modal so the list updates live without closing
  // (the server also revalidates the underlying page in the background).
  const [onTeam, setOnTeam] = useState<Set<string>>(
    () => new Set(players.filter((p) => p.teamId === teamId).map((p) => p.id)),
  );

  // Only players of this team's sport can join it.
  const candidates = players.filter((p) => p.sportId === teamSportId);

  function add(playerId: string) {
    setPendingId(playerId);
    startTransition(async () => {
      try {
        await assignPlayerToTeam(playerId, teamId);
        setOnTeam((s) => new Set(s).add(playerId));
        message.success("Player added.");
      } catch (err) {
        message.error(err instanceof Error ? err.message : "Couldn't add player.");
      } finally {
        setPendingId(null);
      }
    });
  }

  function remove(playerId: string) {
    setPendingId(playerId);
    startTransition(async () => {
      try {
        await removePlayerFromTeam(playerId, teamId);
        setOnTeam((s) => {
          const next = new Set(s);
          next.delete(playerId);
          return next;
        });
        message.success("Player removed.");
      } catch (err) {
        message.error(err instanceof Error ? err.message : "Couldn't remove player.");
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-ink-700">
        Players — add or remove for this team
      </p>
      {candidates.length === 0 ? (
        <p className="text-sm text-ink-500">
          No players for this sport yet — create one below.
        </p>
      ) : (
        <ul className="max-h-72 space-y-1.5 overflow-y-auto">
          {candidates.map((p) => {
            const here = onTeam.has(p.id);
            // "On another team" only if it wasn't changed in this modal.
            const onOtherTeam = !here && !!p.teamId && p.teamId !== teamId;
            const busy = pendingId === p.id;
            return (
              <li
                key={p.id}
                className={`flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm ${
                  here ? "bg-pitch-600/10" : "bg-cream-50"
                }`}
              >
                <span className="min-w-0 truncate font-semibold">
                  {p.name}
                  {p.position ? (
                    <span className="ml-2 text-xs font-normal text-ink-500">{p.position}</span>
                  ) : null}
                </span>
                {onOtherTeam ? (
                  <span className="shrink-0 text-xs font-semibold text-ink-500">{p.teamName}</span>
                ) : here ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => remove(p.id)}
                    className="shrink-0 rounded-md px-2 py-0.5 text-xs font-bold text-tvred-500 hover:bg-tvred-500/10 disabled:opacity-50"
                  >
                    {busy ? "Removing…" : "Remove"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => add(p.id)}
                    className="shrink-0 rounded-md px-2 py-0.5 text-xs font-bold text-burnt-400 hover:bg-burnt-500/10 disabled:opacity-50"
                  >
                    {busy ? "Adding…" : "+ Add"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <details className="mt-5 border-t border-line pt-4">
        <summary className="cursor-pointer text-sm font-semibold text-burnt-400">
          Or add a brand-new player
        </summary>
        <div className="mt-3">
          <PlayerForm
            action={createPlayer}
            sports={sports}
            teams={teams}
            submitLabel="Add player"
            onSuccess={onDone}
            defaultSportId={teamSportId}
            defaultTeamId={teamId}
          />
        </div>
      </details>
    </div>
  );
}
