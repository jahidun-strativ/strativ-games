"use client";

import Link from "next/link";
import { Table } from "antd";
import { StatusBadge } from "@/components/ui/status-badge";

export type RosterRow = {
  id: string;
  name: string;
  position: string;
  status: string;
};

export function RosterTable({
  players,
  captainId,
}: {
  players: RosterRow[];
  captainId?: string | null;
}) {
  return (
    <div className="tv-card overflow-hidden">
      <Table<RosterRow>
        rowKey="id"
        dataSource={players}
        pagination={false}
        size="middle"
        locale={{ emptyText: "No players yet" }}
        columns={[
          {
            title: "Player",
            dataIndex: "name",
            render: (name: string, p) => (
              <Link
                href={`/players/${p.id}`}
                className="inline-flex items-center gap-2 font-semibold !text-ink-900 hover:!text-burnt-400"
              >
                {name}
                {captainId && p.id === captainId ? (
                  <span
                    title="Captain"
                    className="rounded bg-burnt-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-burnt-400"
                  >
                    🧢 C
                  </span>
                ) : null}
              </Link>
            ),
          },
          {
            title: "Pos",
            dataIndex: "position",
            width: 80,
            render: (pos: string) => pos || "—",
          },
          {
            title: "Status",
            dataIndex: "status",
            width: 110,
            render: (status: string) => <StatusBadge status={status} />,
          },
        ]}
      />
    </div>
  );
}
