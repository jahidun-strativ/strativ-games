"use client";

import { Button, Form, Input, Select } from "antd";
import { useActionSubmit } from "@/components/forms/form-utils";
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
      {/* League/competition is only meaningful for external opponents; internal
          Strativ squads just need a name and sport. Formation defaults to
          4-4-2 and is set later in the lineup builder. */}
      {external ? (
        <Form.Item label="League / competition" name="league">
          <Input placeholder="Division 2 Norra" />
        </Form.Item>
      ) : null}
      <Button type="primary" htmlType="submit" loading={isPending}>
        {submitLabel}
      </Button>
    </Form>
  );
}
