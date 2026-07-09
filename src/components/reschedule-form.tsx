"use client";

import dayjs from "dayjs";
import { Button, DatePicker, Form, Select } from "antd";
import { useActionSubmit } from "@/components/forms/form-utils";
import type { Venue } from "@/db/schema";

export function RescheduleForm({
  action,
  venues,
  currentVenueId,
  currentKickoff,
}: {
  action: (formData: FormData) => Promise<void>;
  venues: Venue[];
  currentVenueId: string;
  currentKickoff: Date;
}) {
  const { onFinish, isPending } = useActionSubmit(action);

  return (
    <Form
      layout="vertical"
      onFinish={onFinish}
      initialValues={{ venueId: currentVenueId, kickoffAt: dayjs(currentKickoff) }}
    >
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Form.Item label="Venue" name="venueId" rules={[{ required: true }]}>
          <Select options={venues.map((v) => ({ value: v.id, label: v.name }))} />
        </Form.Item>
        <Form.Item label="Kickoff" name="kickoffAt" rules={[{ required: true }]}>
          <DatePicker
            showTime={{ format: "HH:mm", minuteStep: 5 }}
            format="ddd D MMM YYYY, HH:mm"
            className="!w-full"
          />
        </Form.Item>
      </div>
      <Button htmlType="submit" loading={isPending}>
        Update booking
      </Button>
    </Form>
  );
}
