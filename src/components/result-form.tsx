"use client";

import { Button, Checkbox, Form, InputNumber, Table } from "antd";
import { useActionSubmit } from "@/components/forms/form-utils";
import type { Player, PlayerMatchStat } from "@/db/schema";

function squadColumns() {
  return [
    {
      title: "Player",
      dataIndex: "name",
      render: (_: unknown, p: Player) => (
        <span>
          <span className="scoreboard mr-2 text-xs text-burnt-400">
            {p.squadNumber ?? "–"}
          </span>
          {p.name}
        </span>
      ),
    },
    {
      title: "Played",
      width: 80,
      align: "center" as const,
      render: (_: unknown, p: Player) => (
        <Form.Item name={`stat-${p.id}-played`} valuePropName="checked" noStyle>
          <Checkbox />
        </Form.Item>
      ),
    },
    {
      title: "Goals",
      width: 90,
      align: "center" as const,
      render: (_: unknown, p: Player) => (
        <Form.Item name={`stat-${p.id}-goals`} noStyle>
          <InputNumber min={0} size="small" className="!w-16" />
        </Form.Item>
      ),
    },
    {
      title: "Assists",
      width: 90,
      align: "center" as const,
      render: (_: unknown, p: Player) => (
        <Form.Item name={`stat-${p.id}-assists`} noStyle>
          <InputNumber min={0} size="small" className="!w-16" />
        </Form.Item>
      ),
    },
  ];
}

export function ResultForm({
  action,
  homeTeamName,
  awayTeamName,
  homeSquad,
  awaySquad,
  stats,
  homeScore,
  awayScore,
  completed,
}: {
  action: (formData: FormData) => Promise<void>;
  homeTeamName: string;
  awayTeamName: string;
  homeSquad: Player[];
  awaySquad: Player[];
  stats: PlayerMatchStat[];
  homeScore: number | null;
  awayScore: number | null;
  completed: boolean;
}) {
  const { onFinish, isPending } = useActionSubmit(action);

  const initialValues: Record<string, unknown> = {
    homeScore: homeScore ?? undefined,
    awayScore: awayScore ?? undefined,
  };
  for (const p of [...homeSquad, ...awaySquad]) {
    const s = stats.find((row) => row.playerId === p.id);
    initialValues[`stat-${p.id}-played`] = !!s?.played;
    initialValues[`stat-${p.id}-goals`] = s?.goals ?? 0;
    initialValues[`stat-${p.id}-assists`] = s?.assists ?? 0;
  }

  return (
    <Form layout="vertical" onFinish={onFinish} initialValues={initialValues}>
      <div className="mb-2 flex flex-wrap items-end gap-4">
        <Form.Item label={`${homeTeamName} score`} name="homeScore" rules={[{ required: true }]}>
          <InputNumber min={0} className="!w-24" />
        </Form.Item>
        <Form.Item label={`${awayTeamName} score`} name="awayScore" rules={[{ required: true }]}>
          <InputNumber min={0} className="!w-24" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={isPending}>
            {completed ? "Update result" : "Save result"}
          </Button>
        </Form.Item>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[
          { title: homeTeamName, squad: homeSquad },
          { title: awayTeamName, squad: awaySquad },
        ].map(({ title, squad }) => (
          <div key={title} className="tv-card-sm overflow-hidden">
            <p className="border-b border-line bg-cream-100 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ink-500">
              {title}
            </p>
            <Table
              rowKey="id"
              columns={squadColumns()}
              dataSource={squad}
              pagination={false}
              size="small"
            />
          </div>
        ))}
      </div>
    </Form>
  );
}
