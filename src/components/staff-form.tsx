"use client";

import { Button, Form, Input, Select } from "antd";
import { useActionSubmit } from "@/components/forms/form-utils";
import type { Sport, StaffMember, Team } from "@/db/schema";

export function StaffForm({
  action,
  sports,
  teams,
  member,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  sports: Sport[];
  teams: Team[];
  member?: StaffMember;
  submitLabel: string;
}) {
  const { onFinish, isPending } = useActionSubmit(action);

  return (
    <Form
      layout="vertical"
      onFinish={onFinish}
      initialValues={{
        name: member?.name,
        role: member?.role,
        department: member?.department ?? undefined,
        sportId: member?.sportId ?? sports[0]?.id,
        teamId: member?.teamId ?? undefined,
      }}
    >
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Form.Item label="Name" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Role" name="role" rules={[{ required: true }]}>
          <Input placeholder="Head Coach" />
        </Form.Item>
        <Form.Item label="Department" name="department">
          <Input placeholder="Technical" />
        </Form.Item>
        <Form.Item label="Sport" name="sportId" rules={[{ required: true }]}>
          <Select options={sports.map((s) => ({ value: s.id, label: s.name }))} />
        </Form.Item>
        <Form.Item label="Team" name="teamId">
          <Select
            allowClear
            placeholder="Strativ-wide (no team)"
            options={teams
              .filter((t) => t.kind !== "external")
              .map((t) => ({ value: t.id, label: t.name }))}
          />
        </Form.Item>
      </div>
      <Button type="primary" htmlType="submit" loading={isPending}>
        {submitLabel}
      </Button>
    </Form>
  );
}
