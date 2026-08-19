"use client";

import { App, Button, DatePicker, Form, Input, InputNumber } from "antd";
import { useActionSubmit } from "@/components/forms/form-utils";
import { utcToPickerValue } from "@/lib/timezone";
import { updateSeason } from "@/server/actions/league";
import type { Season } from "@/db/schema";

export function EditSeasonForm({ season }: { season: Season }) {
  const { message } = App.useApp();
  const { onFinish, isPending } = useActionSubmit(updateSeason.bind(null, season.id), () =>
    message.success("Season updated."),
  );
  return (
    <Form
      layout="vertical"
      onFinish={onFinish}
      initialValues={{
        name: season.name,
        plannedMatchdays: season.plannedMatchdays,
        startAt: utcToPickerValue(season.startAt),
      }}
    >
      <Form.Item label="Season name" name="name" rules={[{ required: true }]}>
        <Input placeholder="e.g. Strativ Futsal League — Season 1" />
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
        <Form.Item label="Planned matchdays" name="plannedMatchdays" rules={[{ required: true }]}>
          <InputNumber min={1} max={60} className="!w-full" />
        </Form.Item>
      </div>
      <Button type="primary" htmlType="submit" loading={isPending}>
        Save changes
      </Button>
    </Form>
  );
}
