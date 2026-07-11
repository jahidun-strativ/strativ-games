"use client";

import { useMemo, useState, useTransition } from "react";
import { App, Input } from "antd";
import { FormModal } from "@/components/form-modal";
import { addMatchSquadPlayer, removeMatchSquadPlayer } from "@/server/actions/squads";

export type SquadCandidate = {
  id: string;
  name: string;
  position: string;
  teamName: string | null; // null = free agent
};

// Manage who's in a team's squad for ONE match — independent of the roster.
// Add guests (free agents or borrowed players), drop regulars; none of it
// changes the team roster or the team's default lineup.
export function MatchSquadManager({
  matchId,
  teamId,
  teamName,
  initialSquadIds,
  candidates,
}: {
  matchId: string;
  teamId: string;
  teamName: string;
  initialSquadIds: string[];
  candidates: SquadCandidate[]; // all players of this sport
}) {
  return (
    <FormModal title={`${teamName} — match squad`} triggerLabel="👥 Manage match squad" width={560}>
      {() => (
        <Body
          matchId={matchId}
          teamId={teamId}
          initialSquadIds={initialSquadIds}
          candidates={candidates}
        />
      )}
    </FormModal>
  );
}

function Body({
  matchId,
  teamId,
  initialSquadIds,
  candidates,
}: {
  matchId: string;
  teamId: string;
  initialSquadIds: string[];
  candidates: SquadCandidate[];
}) {
  const { message } = App.useApp();
  const [squad, setSquad] = useState<Set<string>>(() => new Set(initialSquadIds));
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [q, setQ] = useState("");

  const byId = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);
  const inSquad = [...squad].map((id) => byId.get(id)).filter(Boolean) as SquadCandidate[];
  inSquad.sort((a, b) => a.name.localeCompare(b.name));

  const available = candidates
    .filter((c) => !squad.has(c.id))
    .filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()));

  function add(id: string) {
    setPendingId(id);
    startTransition(async () => {
      try {
        await addMatchSquadPlayer(matchId, teamId, id);
        setSquad((s) => new Set(s).add(id));
        message.success("Added to match squad.");
      } catch (err) {
        message.error(err instanceof Error ? err.message : "Couldn't add player.");
      } finally {
        setPendingId(null);
      }
    });
  }

  function remove(id: string) {
    setPendingId(id);
    startTransition(async () => {
      try {
        await removeMatchSquadPlayer(matchId, teamId, id);
        setSquad((s) => {
          const next = new Set(s);
          next.delete(id);
          return next;
        });
        message.success("Removed from match squad.");
      } catch (err) {
        message.error(err instanceof Error ? err.message : "Couldn't remove player.");
      } finally {
        setPendingId(null);
      }
    });
  }

  const guestNote = (c: SquadCandidate) =>
    c.teamName === null ? "Free agent" : c.teamName;

  return (
    <div>
      <p className="mb-3 text-sm text-ink-500">
        Just for this match. Adding a guest here doesn&apos;t change the team roster or its
        default lineup.
      </p>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">
        In the squad ({inSquad.length})
      </p>
      {inSquad.length === 0 ? (
        <p className="text-sm text-ink-500">No one in the squad yet — add players below.</p>
      ) : (
        <ul className="space-y-1.5">
          {inSquad.map((c) => {
            const busy = pendingId === c.id;
            return (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-line bg-pitch-600/10 px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate font-semibold">
                  {c.name}
                  <span className="ml-2 text-xs font-normal text-ink-500">{guestNote(c)}</span>
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove(c.id)}
                  className="shrink-0 rounded-md px-2 py-0.5 text-xs font-bold text-tvred-500 hover:bg-tvred-500/10 disabled:opacity-50"
                >
                  {busy ? "…" : "Remove"}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-5 border-t border-line pt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">
          Add a player
        </p>
        <Input
          allowClear
          placeholder="Search players…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="mb-2"
        />
        {available.length === 0 ? (
          <p className="text-sm text-ink-500">No matching players.</p>
        ) : (
          <ul className="max-h-64 space-y-1.5 overflow-y-auto">
            {available.map((c) => {
              const busy = pendingId === c.id;
              return (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line bg-cream-50 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate font-semibold">
                    {c.name}
                    <span className="ml-2 text-xs font-normal text-ink-500">{guestNote(c)}</span>
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => add(c.id)}
                    className="shrink-0 rounded-md px-2 py-0.5 text-xs font-bold text-burnt-400 hover:bg-burnt-500/10 disabled:opacity-50"
                  >
                    {busy ? "…" : "+ Add"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
