"use client";

import { Button, DatePicker, Form, Input, InputNumber, Segmented, Select } from "antd";
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
  const [form] = Form.useForm();
  return (
    <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ paidBy: "office" }}>
      <p className="mb-3 text-sm text-ink-500">
        Books a 90-min slot and generates the 3-team round-robin (3 games). The
        rest order rotates each matchday, so every team gets the mid-slot rest
        equally over the season — you can still fine-tune pairings after.
      </p>
      <Form.Item
        label="Venue (booking)"
        name="venueId"
        rules={[{ required: true, message: "Pick the venue" }]}
      >
        <Select
          placeholder="Select venue"
          options={venues.map((v) => ({
            value: v.id,
            label: `📍 ${v.name}${v.city ? ` — ${v.city}` : ""}`,
          }))}
          onChange={(venueId) => {
            const v = venues.find((x) => x.id === venueId);
            if (v?.defaultCost != null && !form.getFieldValue("cost")) {
              form.setFieldValue("cost", v.defaultCost);
            }
          }}
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
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Form.Item label="Slot cost (৳)" name="cost">
          <InputNumber min={0} step={100} className="!w-full" placeholder="e.g. 3000" />
        </Form.Item>
        <Form.Item label="Paid by" name="paidBy">
          <Segmented
            block
            options={[
              { label: "Office", value: "office" },
              { label: "We pay", value: "self" },
            ]}
          />
        </Form.Item>
      </div>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Form.Item label="Other cost (৳)" name="extraCost" tooltip="Water, extra time, a ball…">
          <InputNumber min={0} step={50} className="!w-full" placeholder="e.g. 300" />
        </Form.Item>
        <Form.Item label="Other cost — what for?" name="extraCostNote">
          <Input placeholder="e.g. water, extra 30 min" maxLength={80} />
        </Form.Item>
      </div>
      <Button type="primary" htmlType="submit" loading={isPending}>
        Add matchday
      </Button>
    </Form>
  );
}
