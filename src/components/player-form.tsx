"use client";

import { Button, Form, Input, Select } from "antd";
import { useActionSubmit } from "@/components/forms/form-utils";
import { PLAYER_STATUSES } from "@/db/schema";
import type { Player, Sport, Team } from "@/db/schema";

export function PlayerForm({
  action,
  sports,
  teams,
  player,
  submitLabel,
  onSuccess,
  defaultSportId,
  defaultTeamId,
}: {
  action: (formData: FormData) => Promise<void>;
  sports: Sport[];
  teams: Team[];
  player?: Player;
  submitLabel: string;
  onSuccess?: () => void;
  // Pre-select sport/team when adding a player straight from a team page.
  defaultSportId?: string;
  defaultTeamId?: string;
}) {
  const { onFinish, isPending } = useActionSubmit(action, onSuccess);
  const [form] = Form.useForm();
  const sportId = Form.useWatch("sportId", form);

  const teamOptions = teams
    .filter((t) => t.kind !== "external" && (!sportId || t.sportId === sportId))
    .map((t) => ({ value: t.id, label: t.name }));

  return (
    <Form
      form={form}
      layout="vertical"
      className="max-w-xl"
      onFinish={onFinish}
      initialValues={{
        name: player?.name,
        sportId: player?.sportId ?? defaultSportId ?? sports[0]?.id,
        teamId: player?.teamId ?? defaultTeamId ?? undefined,
        position: player?.position,
        status: player?.status ?? "active",
      }}
    >
      <Form.Item label="Name" name="name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Form.Item label="Sport" name="sportId" rules={[{ required: true }]}>
          <Select
            options={sports.map((s) => ({ value: s.id, label: s.name }))}
            onChange={() => form.setFieldValue("teamId", undefined)}
          />
        </Form.Item>
        <Form.Item label="Team" name="teamId">
          <Select allowClear placeholder="Free agent (no team)" options={teamOptions} />
        </Form.Item>
        <Form.Item label="Preferred position (optional)" name="position">
          <Input placeholder="e.g. Striker — leave blank if any" />
        </Form.Item>
        <Form.Item label="Status" name="status">
          <Select options={PLAYER_STATUSES.map((s) => ({ value: s, label: s }))} />
        </Form.Item>
      </div>
      <Button type="primary" htmlType="submit" loading={isPending}>
        {submitLabel}
      </Button>
    </Form>
  );
}
