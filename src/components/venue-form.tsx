"use client";

import { Button, Form, Input, InputNumber } from "antd";
import { useActionSubmit } from "@/components/forms/form-utils";
import type { Venue } from "@/db/schema";

export function VenueForm({
  action,
  venue,
  submitLabel,
  onSuccess,
}: {
  action: (formData: FormData) => Promise<void>;
  venue?: Venue;
  submitLabel: string;
  onSuccess?: () => void;
}) {
  const { onFinish, isPending } = useActionSubmit(action, onSuccess);

  return (
    <Form
      layout="vertical"
      className="max-w-xl"
      onFinish={onFinish}
      initialValues={{
        name: venue?.name,
        address: venue?.address ?? undefined,
        city: venue?.city ?? undefined,
        capacity: venue?.capacity ?? undefined,
        notes: venue?.notes ?? undefined,
      }}
    >
      <Form.Item label="Venue name" name="name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <div className="grid gap-x-4 sm:grid-cols-3">
        <Form.Item label="Address" name="address" className="sm:col-span-2">
          <Input />
        </Form.Item>
        <Form.Item label="City" name="city">
          <Input />
        </Form.Item>
      </div>
      <Form.Item label="Capacity" name="capacity">
        <InputNumber min={0} className="!w-40" />
      </Form.Item>
      <Form.Item label="Booking notes" name="notes">
        <Input.TextArea rows={3} placeholder="Booking lead time, surface, facilities…" />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={isPending}>
        {submitLabel}
      </Button>
    </Form>
  );
}
