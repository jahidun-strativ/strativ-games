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
  fixedTeam,
  onSuccess,
}: {
  action: (formData: FormData) => Promise<void>;
  sports: Sport[];
  teams: Team[];
  member?: StaffMember;
  submitLabel: string;
  // When set, the team and sport are locked to this team (submitted as hidden
  // fields). Used where a captain/manager adds staff to their own team only.
  fixedTeam?: { id: string; sportId: string };
  onSuccess?: () => void;
}) {
  const { onFinish, isPending } = useActionSubmit(action, onSuccess);

  return (
    <Form
      layout="vertical"
      onFinish={onFinish}
      initialValues={{
        name: member?.name,
        role: member?.role,
        department: member?.department ?? undefined,
        sportId: fixedTeam?.sportId ?? member?.sportId ?? sports[0]?.id,
        teamId: fixedTeam?.id ?? member?.teamId ?? undefined,
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
        {fixedTeam ? (
          <>
            <Form.Item name="sportId" hidden>
              <Input />
            </Form.Item>
            <Form.Item name="teamId" hidden>
              <Input />
            </Form.Item>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
      <Button type="primary" htmlType="submit" loading={isPending}>
        {submitLabel}
      </Button>
    </Form>
  );
}
