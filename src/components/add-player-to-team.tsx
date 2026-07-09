"use client";

import { useState, useTransition } from "react";
import { App } from "antd";
import { FormModal } from "@/components/form-modal";
import { PlayerForm } from "@/components/player-form";
import { assignPlayerToTeam, createPlayer } from "@/server/actions/players";
import type { Sport, Team } from "@/db/schema";

export type AssignablePlayer = {
  id: string;
  name: string;
  position: string;
  squadNumber: number | null;
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
    <FormModal title={`Add player to ${teamName}`} triggerLabel="+ Add player" width={560}>
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

  // Only players of this team's sport can join it.
  const candidates = players.filter((p) => p.sportId === teamSportId);

  function add(playerId: string) {
    setPendingId(playerId);
    startTransition(async () => {
      try {
        await assignPlayerToTeam(playerId, teamId);
        message.success("Player added to the team.");
        onDone();
      } catch (err) {
        message.error(err instanceof Error ? err.message : "Couldn't add player.");
        setPendingId(null);
      }
    });
  }

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-ink-700">Existing players</p>
      {candidates.length === 0 ? (
        <p className="text-sm text-ink-500">
          No players for this sport yet — create one below.
        </p>
      ) : (
        <ul className="max-h-72 space-y-1.5 overflow-y-auto">
          {candidates.map((p) => {
            const onThisTeam = p.teamId === teamId;
            const onOtherTeam = !!p.teamId && !onThisTeam;
            const disabled = onThisTeam || onOtherTeam || pendingId !== null;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => add(p.id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-left text-sm ${
                    disabled
                      ? "cursor-not-allowed bg-cream-200 text-ink-400"
                      : "bg-cream-50 font-semibold hover:bg-cream-200"
                  }`}
                >
                  <span className="min-w-0 truncate">
                    <span className="scoreboard mr-2 text-burnt-400">
                      {p.squadNumber ?? "–"}
                    </span>
                    {p.name}
                    <span className="ml-2 text-xs text-ink-500">{p.position}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold">
                    {onThisTeam ? (
                      <span className="text-pitch-500">On this team</span>
                    ) : onOtherTeam ? (
                      <span className="text-ink-500">{p.teamName}</span>
                    ) : pendingId === p.id ? (
                      "Adding…"
                    ) : (
                      <span className="text-burnt-400">+ Add</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <details className="mt-5 border-t border-line pt-4">
        <summary className="cursor-pointer text-sm font-semibold text-burnt-400">
          Or sign a brand-new player
        </summary>
        <div className="mt-3">
          <PlayerForm
            action={createPlayer}
            sports={sports}
            teams={teams}
            submitLabel="Sign player"
            onSuccess={onDone}
            defaultSportId={teamSportId}
            defaultTeamId={teamId}
          />
        </div>
      </details>
    </div>
  );
}
