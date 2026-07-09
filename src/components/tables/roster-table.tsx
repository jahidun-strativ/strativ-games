"use client";

import Link from "next/link";
import { Table } from "antd";
import { StatusBadge } from "@/components/ui/status-badge";

export type RosterRow = {
  id: string;
  name: string;
  position: string;
  squadNumber: number | null;
  status: string;
};

export function RosterTable({ players }: { players: RosterRow[] }) {
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
            title: "#",
            dataIndex: "squadNumber",
            width: 56,
            render: (n: number | null) => (
              <span className="scoreboard font-bold text-burnt-400">{n ?? "–"}</span>
            ),
          },
          {
            title: "Player",
            dataIndex: "name",
            render: (name: string, p) => (
              <Link href={`/players/${p.id}`} className="font-bold hover:text-burnt-400">
                {name}
              </Link>
            ),
          },
          { title: "Pos", dataIndex: "position", width: 80 },
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
