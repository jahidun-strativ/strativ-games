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
  kind = "internal",
  onSuccess,
}: {
  action: (formData: FormData) => Promise<void>;
  sports: Sport[];
  team?: Team;
  submitLabel: string;
  kind?: "internal" | "external";
  onSuccess?: () => void;
}) {
  const { onFinish, isPending } = useActionSubmit(action, onSuccess);
  const external = (team?.kind ?? kind) === "external";

  return (
    <Form
      layout="vertical"
      className="max-w-xl"
      onFinish={onFinish}
      initialValues={{
        name: team?.name,
        kind: team?.kind ?? kind,
        sportId: team?.sportId ?? sports[0]?.id,
        league: team?.league ?? undefined,
        formation: team?.formation ?? "4-4-2",
        stadium: team?.stadium ?? undefined,
      }}
    >
      <Form.Item name="kind" hidden>
        <Input />
      </Form.Item>
      <Form.Item
        label={external ? "Opponent name" : "Team name"}
        name="name"
        rules={[{ required: true }]}
      >
        <Input placeholder={external ? "FC Ericsson" : "Aurora FC"} />
      </Form.Item>
      <Form.Item label="Sport" name="sportId" rules={[{ required: true }]}>
        <Select options={sports.map((s) => ({ value: s.id, label: s.name }))} />
      </Form.Item>
      <Form.Item label={external ? "League / competition" : "League"} name="league">
        <Input placeholder="Division 2 Norra" />
      </Form.Item>
      {external ? (
        <Form.Item label="Home ground / city" name="stadium">
          <Input placeholder="Optional" />
        </Form.Item>
      ) : (
        <>
          <Form.Item label="Default formation" name="formation">
            <Select options={FORMATION_KEYS.map((f) => ({ value: f, label: f }))} />
          </Form.Item>
          <Form.Item label="Home ground" name="stadium">
            <Input placeholder="Strativ Arena" />
          </Form.Item>
        </>
      )}
      <Button type="primary" htmlType="submit" loading={isPending}>
        {submitLabel}
      </Button>
    </Form>
  );
}
