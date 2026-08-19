"use client";

import { Button, DatePicker, Form, Input, InputNumber, Select } from "antd";
import { FormModal } from "@/components/form-modal";
import { useActionSubmit } from "@/components/forms/form-utils";
import { createSeason } from "@/server/actions/league";
import type { Sport } from "@/db/schema";

export function CreateSeasonButton({
  sports,
  label = "+ Start a season",
}: {
  sports: Sport[];
  label?: string;
}) {
  return (
    <FormModal title="Start a season" triggerLabel={label} width={520}>
      {(close) => <CreateSeasonForm sports={sports} onSuccess={close} />}
    </FormModal>
  );
}

function CreateSeasonForm({ sports, onSuccess }: { sports: Sport[]; onSuccess: () => void }) {
  const { onFinish, isPending } = useActionSubmit(createSeason, onSuccess);
  return (
    <Form
      layout="vertical"
      onFinish={onFinish}
      initialValues={{
        name: "Strativ Futsal League — Season 1",
        plannedMatchdays: 6,
        sportId: sports.length === 1 ? sports[0].id : undefined,
      }}
    >
      <Form.Item label="Season name" name="name" rules={[{ required: true }]}>
        <Input placeholder="e.g. Strativ Futsal League — Season 1" />
      </Form.Item>
      <Form.Item label="Sport" name="sportId" rules={[{ required: true, message: "Pick the sport" }]}>
        <Select
          placeholder="Select sport"
          options={sports.map((s) => ({ value: s.id, label: s.name }))}
        />
      </Form.Item>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Form.Item label="Start date" name="startAt" rules={[{ required: true }]}>
          <DatePicker
            showTime={{ format: "h:mm A", minuteStep: 5, use12Hours: true }}
            format="ddd D MMM YYYY, h:mm A"
            inputReadOnly
            className="!w-full"
            classNames={{ popup: { root: "ssm-datetime-popup" } }}
          />
        </Form.Item>
        <Form.Item label="Matchdays" name="plannedMatchdays" rules={[{ required: true }]}>
          <InputNumber min={1} max={60} className="!w-full" />
        </Form.Item>
      </div>
      <Button type="primary" htmlType="submit" loading={isPending}>
        Start season
      </Button>
    </Form>
  );
}
