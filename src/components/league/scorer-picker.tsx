"use client";

import { Button, Form, Select } from "antd";
import { assignScorer } from "@/server/actions/match-events";
import { useActionSubmit } from "@/components/forms/form-utils";

// Admin picks (or clears) who runs this match's live scorecard.
export function ScorerPicker({
  matchId,
  users,
  currentUserId,
}: {
  matchId: string;
  users: { userId: string; label: string }[];
  currentUserId: string | null;
}) {
  const { onFinish, isPending } = useActionSubmit((fd) => assignScorer(matchId, fd));
  return (
    <Form
      layout="vertical"
      onFinish={onFinish}
      initialValues={{ scorerUserId: currentUserId ?? undefined }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <Form.Item name="scorerUserId" label="Scorekeeper" className="!mb-0 flex-1">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Assign someone…"
            className="!min-w-56"
            options={users.map((u) => ({ label: u.label, value: u.userId }))}
          />
        </Form.Item>
        <Form.Item className="!mb-0">
          <Button htmlType="submit" loading={isPending}>
            Save
          </Button>
        </Form.Item>
      </div>
    </Form>
  );
}
