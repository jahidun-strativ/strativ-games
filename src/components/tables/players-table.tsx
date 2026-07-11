"use client";

import Link from "next/link";
import { Table } from "antd";
import { StatusBadge } from "@/components/ui/status-badge";

export type PlayerRow = {
  id: string;
  name: string;
  position: string;
  status: string;
  teamId: string | null;
  teamName: string | null;
  sportName: string;
};

// Two initials from a name (or email local-part), for the avatar chip.
function initials(name: string) {
  const base = name.includes("@") ? name.split("@")[0] : name;
  const parts = base.trim().split(/[\s._-]+/).filter(Boolean);
  const chars = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return (chars || base[0] || "?").toUpperCase();
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-burnt-500/15 text-xs font-bold text-burnt-400 ring-1 ring-burnt-500/25">
      {initials(name)}
    </span>
  );
}

function PosChip({ position }: { position: string }) {
  if (!position || position === "TBD") return <span className="text-ink-400">—</span>;
  return (
    <span className="rounded-md bg-cream-200 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-ink-700">
      {position}
    </span>
  );
}

export function PlayersTable({ players }: { players: PlayerRow[] }) {
  return (
    <>
      {/* Desktop / tablet: table */}
      <div className="tv-card hidden overflow-hidden md:block">
        <Table<PlayerRow>
          rowKey="id"
          dataSource={players}
          pagination={players.length > 15 ? { pageSize: 15, hideOnSinglePage: true } : false}
          columns={[
            {
              title: "Player",
              dataIndex: "name",
              render: (name: string, p) => (
                <Link
                  href={`/players/${p.id}`}
                  className="flex items-center gap-3 font-semibold !text-ink-900 transition-colors hover:!text-burnt-400"
                >
                  <Avatar name={name} />
                  <span className="truncate">{name}</span>
                </Link>
              ),
            },
            {
              title: "Team",
              dataIndex: "teamName",
              render: (teamName: string | null, p) =>
                teamName && p.teamId ? (
                  <Link
                    href={`/teams/${p.teamId}`}
                    className="!text-ink-500 transition-colors hover:!text-burnt-400"
                  >
                    {teamName}
                  </Link>
                ) : (
                  <span className="text-ink-400">Free agent</span>
                ),
            },
            {
              title: "Pos",
              dataIndex: "position",
              width: 90,
              render: (pos: string) => <PosChip position={pos} />,
            },
            {
              title: "Sport",
              dataIndex: "sportName",
              responsive: ["lg"],
              render: (s: string) => <span className="text-ink-500">{s}</span>,
            },
            {
              title: "Status",
              dataIndex: "status",
              width: 110,
              align: "right",
              render: (status: string) => <StatusBadge status={status} />,
            },
          ]}
        />
      </div>

      {/* Mobile: stacked cards — no horizontal scrolling */}
      <ul className="flex flex-col gap-2 md:hidden">
        {players.map((p) => (
          <li key={p.id}>
            <Link
              href={`/players/${p.id}`}
              className="tv-card-sm flex items-center gap-3 p-3 transition-colors hover:border-burnt-500/40"
            >
              <Avatar name={p.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold !text-ink-900">{p.name}</p>
                <p className="truncate text-xs text-ink-500">
                  {p.teamName ?? "Free agent"}
                  {p.position && p.position !== "TBD" ? ` · ${p.position}` : ""}
                  {` · ${p.sportName}`}
                </p>
              </div>
              <StatusBadge status={p.status} />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
