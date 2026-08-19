"use client";

import { Button, DatePicker, Form, Select } from "antd";
import { FormModal } from "@/components/form-modal";
import { useActionSubmit } from "@/components/forms/form-utils";
import { addMatchday } from "@/server/actions/league";
import type { Venue } from "@/db/schema";

export function AddMatchdayButton({
  seasonId,
  venues,
  nextNumber,
  label = "+ Add matchday",
}: {
  seasonId: string;
  venues: Venue[];
  nextNumber: number;
  label?: string;
}) {
  return (
    <FormModal title={`Add matchday ${nextNumber}`} triggerLabel={label} width={480}>
      {(close) => <AddMatchdayForm seasonId={seasonId} venues={venues} onSuccess={close} />}
    </FormModal>
  );
}

function AddMatchdayForm({
  seasonId,
  venues,
  onSuccess,
}: {
  seasonId: string;
  venues: Venue[];
  onSuccess: () => void;
}) {
  const { onFinish, isPending } = useActionSubmit(addMatchday.bind(null, seasonId), onSuccess);
  return (
    <Form layout="vertical" onFinish={onFinish}>
      <p className="mb-3 text-sm text-ink-500">
        Books a 90-min slot and generates the 3-team round-robin (3 games) automatically.
      </p>
      <Form.Item label="Venue" name="venueId" rules={[{ required: true, message: "Pick the venue" }]}>
        <Select
          placeholder="Select venue"
          options={venues.map((v) => ({
            value: v.id,
            label: `📍 ${v.name}${v.city ? ` — ${v.city}` : ""}`,
          }))}
        />
      </Form.Item>
      <Form.Item label="Start (Bangladesh time)" name="startAt" rules={[{ required: true }]}>
        <DatePicker
          showTime={{ format: "h:mm A", minuteStep: 5, use12Hours: true }}
          format="ddd D MMM YYYY, h:mm A"
          inputReadOnly
          className="!w-full"
          classNames={{ popup: { root: "ssm-datetime-popup" } }}
        />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={isPending}>
        Add matchday
      </Button>
    </Form>
  );
}
