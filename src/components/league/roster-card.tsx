"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { App, Select } from "antd";
import { setPlayerRole } from "@/server/actions/players";
import { POSITION_OPTIONS, POSITIONS } from "@/lib/positions";

type Player = { id: string; name: string; position: string; status: string };

const CARD =
  "group flex items-center gap-2.5 rounded-lg border border-line bg-cream-200 px-3 py-2 transition-colors hover:border-burnt-500/40";

const CBadge = () => (
  <span className="shrink-0 rounded bg-burnt-500/15 px-1 py-0.5 text-[11px] font-bold uppercase text-burnt-400">
    C
  </span>
);

// The role/position line: read-only text, or (for a captain/manager/admin) an
// inline position picker that saves on change. Football positions only — a
// legacy free-text value is kept as an extra option so it still shows.
function RoleField({ playerId, role }: { playerId: string; role: string }) {
  const { message } = App.useApp();
  const [value, setValue] = useState(role || undefined);
  const [pending, start] = useTransition();

  const options =
    role && !POSITIONS.includes(role)
      ? [{ label: role, options: [{ value: role, label: `${role} (legacy)` }] }, ...POSITION_OPTIONS]
      : POSITION_OPTIONS;

  function change(next: string | undefined) {
    setValue(next);
    start(async () => {
      try {
        await setPlayerRole(playerId, next ?? "");
        message.success("Role updated.");
      } catch (err) {
        setValue(role || undefined);
        message.error(err instanceof Error ? err.message : "Couldn't update role.");
      }
    });
  }

  return (
    <Select<string>
      size="small"
      allowClear
      showSearch
      optionFilterProp="label"
      variant="borderless"
      className="-ml-1 w-full text-ink-500"
      popupMatchSelectWidth={220}
      value={value}
      disabled={pending}
      placeholder="Set position"
      options={options}
      onChange={change}
    />
  );
}

// One roster entry. Read-only viewers get a link card; a captain/manager/admin
// gets the same card with an editable role field (so the card is a div, with the
// name as the link — no interactive controls nested inside an anchor).
export function RosterCard({
  player,
  isCaptain,
  canManage,
  initials,
  statusDot,
}: {
  player: Player;
  isCaptain: boolean;
  canManage: boolean;
  initials: string;
  statusDot: string;
}) {
  const avatar = (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-cream-50 font-display text-xs text-ink-700">
      {initials}
    </span>
  );
  const dot = (
    <span title={player.status} className={`h-2 w-2 shrink-0 rounded-full ${statusDot}`} />
  );

  if (!canManage) {
    return (
      <Link href={`/players/${player.id}`} className={CARD}>
        {avatar}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-ink-900 group-hover:text-burnt-400">
              {player.name}
            </span>
            {isCaptain ? <CBadge /> : null}
          </span>
          <span className="block truncate text-xs text-ink-500">{player.position || "—"}</span>
        </span>
        {dot}
      </Link>
    );
  }

  return (
    <div className={CARD}>
      {avatar}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <Link
            href={`/players/${player.id}`}
            className="truncate text-sm font-semibold text-ink-900 hover:text-burnt-400"
          >
            {player.name}
          </Link>
          {isCaptain ? <CBadge /> : null}
        </span>
        <RoleField playerId={player.id} role={player.position} />
      </span>
      {dot}
    </div>
  );
}
