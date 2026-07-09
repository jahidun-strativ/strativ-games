"use client";

import { Button, Form, Input, Select } from "antd";
import { useActionSubmit } from "@/components/forms/form-utils";
import { FORMATION_KEYS } from "@/lib/formations";
import type { Sport, Team } from "@/db/schema";

export function TeamForm({
  action,
  sports,
  team,
  submitLabel,
  onSuccess,
}: {
  action: (formData: FormData) => Promise<void>;
  sports: Sport[];
  team?: Team;
  submitLabel: string;
  onSuccess?: () => void;
}) {
  const { onFinish, isPending } = useActionSubmit(action, onSuccess);

  return (
    <Form
      layout="vertical"
      className="max-w-xl"
      onFinish={onFinish}
      initialValues={{
        name: team?.name,
        sportId: team?.sportId ?? sports[0]?.id,
        league: team?.league ?? undefined,
        formation: team?.formation ?? "4-4-2",
        stadium: team?.stadium ?? undefined,
      }}
    >
      <Form.Item label="Team name" name="name" rules={[{ required: true }]}>
        <Input placeholder="Aurora FC" />
      </Form.Item>
      <Form.Item label="Sport" name="sportId" rules={[{ required: true }]}>
        <Select options={sports.map((s) => ({ value: s.id, label: s.name }))} />
      </Form.Item>
      <Form.Item label="League" name="league">
        <Input placeholder="Division 2 Norra" />
      </Form.Item>
      <Form.Item label="Default formation" name="formation">
        <Select options={FORMATION_KEYS.map((f) => ({ value: f, label: f }))} />
      </Form.Item>
      <Form.Item label="Home ground" name="stadium">
        <Input placeholder="Strativ Arena" />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={isPending}>
        {submitLabel}
      </Button>
    </Form>
  );
}
