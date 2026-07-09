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

export function PlayersTable({ players }: { players: PlayerRow[] }) {
  return (
    <div className="tv-card overflow-hidden">
      <Table<PlayerRow>
        rowKey="id"
        dataSource={players}
        pagination={players.length > 15 ? { pageSize: 15 } : false}
        scroll={{ x: true }}
        columns={[
          {
            title: "Player",
            dataIndex: "name",
            render: (name: string, p) => (
              <Link href={`/players/${p.id}`} className="font-bold hover:text-burnt-400">
                {name}
              </Link>
            ),
          },
          {
            title: "Team",
            dataIndex: "teamName",
            render: (teamName: string | null, p) =>
              teamName && p.teamId ? (
                <Link href={`/teams/${p.teamId}`} className="hover:text-burnt-400">
                  {teamName}
                </Link>
              ) : (
                <span className="text-ink-500">Free agent</span>
              ),
          },
          {
            title: "Pos",
            dataIndex: "position",
            width: 80,
            render: (pos: string) => pos || "—",
          },
          {
            title: "Sport",
            dataIndex: "sportName",
            responsive: ["sm"],
            render: (s: string) => <span className="text-ink-500">{s}</span>,
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
