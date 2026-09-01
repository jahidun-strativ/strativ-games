"use client";

import { useMemo, useState, useTransition } from "react";
import { App, Button, Select } from "antd";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, ArrowRight } from "lucide-react";
import { movePlayerToTeam, swapPlayers } from "@/server/actions/players";

export type TransferPlayer = {
  id: string;
  name: string;
  teamId: string | null;
  teamName: string | null;
};

// Admin transfer window: sign a single player to a team, or swap two players
// between their teams. Both call the existing admin-only roster actions; each
// move is logged and gets a shareable card in the feed below.
export function TransferWindow({
  players,
  teams,
}: {
  players: TransferPlayer[];
  teams: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [isPending, startTransition] = useTransition();

  const [player, setPlayer] = useState<string>();
  const [toTeam, setToTeam] = useState<string>();
  const [swapA, setSwapA] = useState<string>();
  const [swapB, setSwapB] = useState<string>();

  // Player options grouped by their current team (free agents last).
  const playerOptions = useMemo(() => {
    const byTeam = new Map<string, { label: string; options: { value: string; label: string }[] }>();
    const free: { value: string; label: string }[] = [];
    for (const p of players) {
      if (p.teamId && p.teamName) {
        const g = byTeam.get(p.teamId) ?? { label: p.teamName, options: [] };
        g.options.push({ value: p.id, label: p.name });
        byTeam.set(p.teamId, g);
      } else {
        free.push({ value: p.id, label: p.name });
      }
    }
    const groups = [...byTeam.values()];
    if (free.length) groups.push({ label: "Free agents", options: free });
    return groups;
  }, [players]);

  // Swaps need two players who are both ON a team.
  const teamedOptions = useMemo(
    () =>
      playerOptions
        .filter((g) => g.label !== "Free agents")
        .map((g) => ({ ...g })),
    [playerOptions],
  );

  function run(fn: () => Promise<void>, onOk: () => void) {
    startTransition(async () => {
      try {
        await fn();
        onOk();
        message.success("Done — the transfer card is ready below.");
        router.refresh();
      } catch (err) {
        message.error(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  const teamOptions = teams.map((t) => ({ value: t.id, label: t.name }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Single transfer */}
      <div className="tv-card-sm space-y-3 p-5">
        <div className="flex items-center gap-2">
          <ArrowRight className="h-4 w-4 text-burnt-400" />
          <h3 className="font-display text-lg text-ink-900">Transfer a player</h3>
        </div>
        <p className="text-sm text-ink-500">Move one player to a team (poaching allowed).</p>
        <Select
          showSearch
          optionFilterProp="label"
          placeholder="Player"
          className="w-full"
          value={player}
          onChange={setPlayer}
          options={playerOptions}
        />
        <Select
          showSearch
          optionFilterProp="label"
          placeholder="Destination team"
          className="w-full"
          value={toTeam}
          onChange={setToTeam}
          options={teamOptions}
        />
        <Button
          type="primary"
          loading={isPending}
          disabled={!player || !toTeam}
          onClick={() =>
            run(() => movePlayerToTeam(player!, toTeam!), () => {
              setPlayer(undefined);
              setToTeam(undefined);
            })
          }
        >
          Transfer
        </Button>
      </div>

      {/* Swap */}
      <div className="tv-card-sm space-y-3 p-5">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4 text-burnt-400" />
          <h3 className="font-display text-lg text-ink-900">Swap two players</h3>
        </div>
        <p className="text-sm text-ink-500">Trade two players between their teams.</p>
        <Select
          showSearch
          optionFilterProp="label"
          placeholder="Player A"
          className="w-full"
          value={swapA}
          onChange={setSwapA}
          options={teamedOptions}
        />
        <Select
          showSearch
          optionFilterProp="label"
          placeholder="Player B"
          className="w-full"
          value={swapB}
          onChange={setSwapB}
          options={teamedOptions}
        />
        <Button
          type="primary"
          loading={isPending}
          disabled={!swapA || !swapB || swapA === swapB}
          onClick={() =>
            run(() => swapPlayers(swapA!, swapB!), () => {
              setSwapA(undefined);
              setSwapB(undefined);
            })
          }
        >
          Swap
        </Button>
      </div>
    </div>
  );
}
