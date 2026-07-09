"use client";

import { Button, ColorPicker, Form, Input } from "antd";
import { useActionSubmit } from "@/components/forms/form-utils";
import type { Sport } from "@/db/schema";

export function SportForm({
  action,
  sport,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  sport?: Sport;
  submitLabel: string;
}) {
  const { onFinish, isPending } = useActionSubmit(action);

  return (
    <Form
      layout="vertical"
      onFinish={onFinish}
      initialValues={{
        name: sport?.name,
        shortName: sport?.shortName,
        color: sport?.color ?? "#e8630a",
        description: sport?.description ?? undefined,
      }}
    >
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Form.Item label="Name" name="name" rules={[{ required: true }]}>
          <Input placeholder="Basketball" />
        </Form.Item>
        <Form.Item label="Short name" name="shortName" rules={[{ required: true }]}>
          <Input placeholder="BSK" maxLength={4} />
        </Form.Item>
      </div>
      <Form.Item label="Colour" name="color">
        <ColorPicker disabledAlpha />
      </Form.Item>
      <Form.Item label="Description" name="description">
        <Input.TextArea rows={2} />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={isPending}>
        {submitLabel}
      </Button>
    </Form>
  );
}
