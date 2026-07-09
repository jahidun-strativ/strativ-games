"use client";

import { Button, DatePicker, Form, Select } from "antd";
import { useActionSubmit } from "@/components/forms/form-utils";
import { utcToPickerValue } from "@/lib/timezone";
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
      initialValues={{ venueId: currentVenueId, kickoffAt: utcToPickerValue(currentKickoff) }}
    >
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Form.Item label="Venue" name="venueId" rules={[{ required: true }]}>
          <Select options={venues.map((v) => ({ value: v.id, label: v.name }))} />
        </Form.Item>
        <Form.Item label="Kickoff (Bangladesh time)" name="kickoffAt" rules={[{ required: true }]}>
          <DatePicker
            showTime={{ format: "h:mm A", minuteStep: 5, use12Hours: true }}
            format="ddd D MMM YYYY, h:mm A"
            // Keep the field non-editable so tapping it opens the picker panel
            // instead of the mobile on-screen keyboard.
            inputReadOnly
            className="!w-full"
            classNames={{ popup: { root: "ssm-datetime-popup" } }}
          />
        </Form.Item>
      </div>
      <Button htmlType="submit" loading={isPending}>
        Update booking
      </Button>
    </Form>
  );
}
