"use client";

import { Button, DatePicker, Form, Input, InputNumber, Segmented, Select } from "antd";
import { useActionSubmit } from "@/components/forms/form-utils";
import type { Team, Venue } from "@/db/schema";

export function SessionForm({
  action,
  venues,
  teams,
  onSuccess,
}: {
  action: (formData: FormData) => Promise<void>;
  venues: Venue[];
  teams: Team[];
  onSuccess?: () => void;
}) {
  const { onFinish, isPending } = useActionSubmit(action, onSuccess);
  const [form] = Form.useForm();
  const kind = Form.useWatch("kind", form) ?? "internal";

  const internalTeams = teams.filter((t) => t.kind !== "external");
  const externalTeams = teams.filter((t) => t.kind === "external");

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={{ kind: "internal", paidBy: "office", isHome: "home" }}
    >
      <Form.Item name="kind">
        <Segmented
          block
          options={[
            { label: "Internal (round-robin)", value: "internal" },
            { label: "Competitive (vs opponent)", value: "competitive" },
          ]}
          onChange={() =>
            form.setFieldsValue({
              teamIds: undefined,
              ourTeamId: undefined,
              opponentId: undefined,
              opponentName: undefined,
            })
          }
        />
      </Form.Item>

      <Form.Item
        label="Venue (booking)"
        name="venueId"
        rules={[{ required: true, message: "Pick the booked venue" }]}
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
          className="!w-full sm:!w-72"
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

      <div className="my-4 border-t border-line pt-4">
        {kind === "competitive" ? (
          <>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Form.Item
                label="Strativ team"
                name="ourTeamId"
                rules={[{ required: true, message: "Pick our team" }]}
              >
                <Select
                  placeholder="Our team"
                  options={internalTeams.map((t) => ({ value: t.id, label: t.name }))}
                />
              </Form.Item>
              <Form.Item
                label="Opponent"
                name="opponentId"
                rules={[
                  {
                    validator: (_, v) =>
                      v || form.getFieldValue("opponentName")?.trim()
                        ? Promise.resolve()
                        : Promise.reject(new Error("Pick or name the opponent")),
                  },
                ]}
              >
                <Select
                  allowClear
                  placeholder={externalTeams.length ? "Select opponent" : "None yet — name one below"}
                  options={externalTeams.map((t) => ({ value: t.id, label: t.name }))}
                  onChange={(v) => {
                    if (v) form.setFieldValue("opponentName", undefined);
                  }}
                />
              </Form.Item>
            </div>
            <Form.Item
              label="…or new opponent by name"
              name="opponentName"
              tooltip="No roster needed — just their team name. We'll add them as an opponent."
            >
              <Input
                placeholder="e.g. FC Ericsson"
                onChange={(e) => {
                  if (e.target.value.trim()) form.setFieldValue("opponentId", undefined);
                  form.validateFields(["opponentId"]);
                }}
              />
            </Form.Item>
            <Form.Item label="Playing" name="isHome">
              <Segmented
                options={[
                  { label: "Home", value: "home" },
                  { label: "Away", value: "away" },
                ]}
              />
            </Form.Item>
          </>
        ) : (
          <Form.Item
            label="Teams in this slot"
            name="teamIds"
            tooltip="Pick 2 teams for one 90-min game, or 3 for a round-robin (3 × 25 min)."
            rules={[
              { required: true, message: "Pick 2 or 3 teams" },
              {
                validator: (_, v: string[] | undefined) =>
                  v && (v.length < 2 || v.length > 3)
                    ? Promise.reject(new Error("Pick 2 or 3 teams"))
                    : Promise.resolve(),
              },
            ]}
          >
            <Select
              mode="multiple"
              maxCount={3}
              allowClear
              placeholder="Pick 2 or 3 internal teams"
              options={internalTeams.map((t) => ({ value: t.id, label: t.name }))}
            />
          </Form.Item>
        )}

        <Form.Item label="Title (optional)" name="title">
          <Input placeholder="e.g. Friday five-a-side" />
        </Form.Item>
      </div>

      <Form.Item label="Notes" name="notes">
        <Input.TextArea rows={2} placeholder="Kit colours, arrangements…" />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={isPending}>
        Book slot
      </Button>
    </Form>
  );
}
