"use client";

import Link from "next/link";
import { Table } from "antd";
import type { StandingsRow } from "@/server/queries/standings";

export function StandingsTable({ rows }: { rows: StandingsRow[] }) {
  const center = { align: "center" as const, width: 48 };
  return (
    <div className="tv-card overflow-hidden">
      <Table<StandingsRow>
        rowKey="teamId"
        dataSource={rows}
        pagination={false}
        size="small"
        // max-content: the table keeps its natural width and scrolls sideways on
        // narrow screens rather than squeezing team names into 3 wrapped lines.
        scroll={{ x: "max-content" }}
        rowClassName={(_, i) => (i === 0 ? "bg-gold-400/10" : "")}
        columns={[
          {
            title: "#",
            width: 40,
            render: (_, __, i) => <span className="scoreboard font-bold">{i + 1}</span>,
          },
          {
            title: "Team",
            dataIndex: "teamName",
            render: (name: string, row) => (
              <Link
                href={`/teams/${row.teamId}`}
                className="whitespace-nowrap font-bold hover:text-burnt-400"
              >
                {name}
              </Link>
            ),
          },
          { title: "P", dataIndex: "played", ...center },
          { title: "W", dataIndex: "won", ...center },
          { title: "D", dataIndex: "drawn", ...center },
          { title: "L", dataIndex: "lost", ...center },
          { title: "GF", dataIndex: "goalsFor", ...center, responsive: ["sm"] },
          { title: "GA", dataIndex: "goalsAgainst", ...center, responsive: ["sm"] },
          {
            title: "GD",
            dataIndex: "goalDiff",
            ...center,
            render: (gd: number) => (gd > 0 ? `+${gd}` : gd),
          },
          {
            title: "Pts",
            dataIndex: "points",
            ...center,
            render: (pts: number) => (
              <span className="scoreboard font-bold text-burnt-400">{pts}</span>
            ),
          },
        ]}
      />
    </div>
  );
}
