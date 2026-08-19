"use client";

import { useTransition } from "react";
import { App, Select } from "antd";
import { Button } from "@/components/ui/button";
import { setAward, setSeasonStatus } from "@/server/actions/league";
import type { Season } from "@/db/schema";

type PlayerOpt = { id: string; name: string; teamName: string | null };
type TeamOpt = { id: string; name: string };

type AwardField = "topScorerId" | "fairplayTeamId" | "playerOfSeasonId" | "bestGkId";

export function AwardEditor({
  season,
  players,
  teams,
}: {
  season: Season;
  players: PlayerOpt[];
  teams: TeamOpt[];
}) {
  const { message } = App.useApp();
  const [isPending, startTransition] = useTransition();

  const save = (field: AwardField, winnerId: string | undefined) => {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("field", field);
        if (winnerId) fd.set("winnerId", winnerId);
        await setAward(season.id, fd);
      } catch (err) {
        message.error(err instanceof Error ? err.message : "Couldn't save award.");
      }
    });
  };

  const playerOpts = [...players]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => ({ value: p.id, label: p.teamName ? `${p.name} — ${p.teamName}` : p.name }));
  const teamOpts = teams.map((t) => ({ value: t.id, label: t.name }));

  const row = (label: string, hint: string, field: AwardField, value: string | null, opts: { value: string; label: string }[]) => (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mb-1 text-xs text-ink-400">{hint}</p>
      <Select
        allowClear
        showSearch
        optionFilterProp="label"
        className="w-full"
        placeholder="Not set"
        disabled={isPending}
        value={value ?? undefined}
        options={opts}
        onChange={(v) => save(field, v)}
      />
    </div>
  );

  return (
    <div className="tv-card-sm grid gap-4 p-4 sm:grid-cols-2">
      {row("🥇 Top scorer", "Blank = auto (most goals)", "topScorerId", season.topScorerId, playerOpts)}
      {row("🤝 Fair play", "Blank = auto (fewest cards)", "fairplayTeamId", season.fairplayTeamId, teamOpts)}
      {row("⭐ Player of the season", "Admin pick", "playerOfSeasonId", season.playerOfSeasonId, playerOpts)}
      {row("🧤 Best goalkeeper", "Admin pick", "bestGkId", season.bestGkId, playerOpts)}
    </div>
  );
}

export function SeasonStatusButton({ season }: { season: Season }) {
  const { message, modal } = App.useApp();
  const [isPending, startTransition] = useTransition();
  const ended = season.status === "ended";

  const toggle = () => {
    const next = ended ? "active" : "ended";
    const run = () =>
      startTransition(async () => {
        try {
          await setSeasonStatus(season.id, next);
        } catch (err) {
          message.error(err instanceof Error ? err.message : "Couldn't update the season.");
        }
      });
    if (ended) return run();
    modal.confirm({
      title: "End this season?",
      content: "The top of the table is crowned champion. You can reopen it later.",
      okText: "End season",
      onOk: run,
    });
  };

  return (
    <Button variant={ended ? "secondary" : "primary"} onClick={toggle} disabled={isPending}>
      {ended ? "Reopen season" : "🏁 End season"}
    </Button>
  );
}
