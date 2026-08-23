"use client";

import { Button, DatePicker, Form, Input, InputNumber, Segmented, Select } from "antd";
import { FormModal } from "@/components/form-modal";
import { useActionSubmit } from "@/components/forms/form-utils";
import { utcToPickerValue } from "@/lib/timezone";
import { updateMatchday } from "@/server/actions/league";
import type { Venue } from "@/db/schema";

type Fixture = {
  id: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  status: string;
  homeName: string;
  awayName: string;
};
type TeamOpt = { id: string; name: string };

export function EditMatchdayButton({
  sessionId,
  title,
  startAt,
  venueId,
  cost,
  paidBy,
  fixtures,
  venues,
  teams,
}: {
  sessionId: string;
  title: string | null;
  startAt: Date;
  venueId: string;
  cost: number | null;
  paidBy: string;
  fixtures: Fixture[];
  venues: Venue[];
  teams: TeamOpt[];
}) {
  return (
    <FormModal title="Edit matchday" triggerLabel="Edit" triggerVariant="secondary" width={520}>
      {(close) => (
        <EditMatchdayForm
          sessionId={sessionId}
          title={title}
          startAt={startAt}
          venueId={venueId}
          cost={cost}
          paidBy={paidBy}
          fixtures={fixtures}
          venues={venues}
          teams={teams}
          onSuccess={close}
        />
      )}
    </FormModal>
  );
}

function EditMatchdayForm({
  sessionId,
  title,
  startAt,
  venueId,
  cost,
  paidBy,
  fixtures,
  venues,
  teams,
  onSuccess,
}: {
  sessionId: string;
  title: string | null;
  startAt: Date;
  venueId: string;
  cost: number | null;
  paidBy: string;
  fixtures: Fixture[];
  venues: Venue[];
  teams: TeamOpt[];
  onSuccess: () => void;
}) {
  const { onFinish, isPending } = useActionSubmit(updateMatchday.bind(null, sessionId), onSuccess);
  const [form] = Form.useForm();
  const teamOptions = teams.map((t) => ({ value: t.id, label: t.name }));

  const initialValues: Record<string, unknown> = {
    title: title ?? "",
    venueId,
    startAt: utcToPickerValue(startAt),
    cost: cost ?? undefined,
    paidBy: paidBy === "self" ? "self" : "office",
  };
  for (const f of fixtures) {
    initialValues[`home_${f.id}`] = f.homeTeamId ?? undefined;
    initialValues[`away_${f.id}`] = f.awayTeamId ?? undefined;
  }

  return (
    <Form form={form} layout="vertical" onFinish={onFinish} initialValues={initialValues}>
      <Form.Item label="Title" name="title">
        <Input placeholder="Matchday 1" />
      </Form.Item>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Form.Item label="Venue (booking)" name="venueId" rules={[{ required: true, message: "Pick the venue" }]}>
          <Select
            options={venues.map((v) => ({ value: v.id, label: v.name }))}
            onChange={(id) => {
              const v = venues.find((x) => x.id === id);
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
      </div>

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

      <p className="mb-2 mt-1 text-xs font-semibold uppercase tracking-wider text-ink-500">
        Fixtures
      </p>
      {fixtures.map((f, i) => {
        const locked = f.status !== "scheduled";
        return (
          <div key={f.id} className="mb-3 rounded-lg border border-line bg-cream-200 p-3">
            <p className="mb-2 text-xs font-semibold text-ink-500">
              Game {i + 1}
              {locked ? ` · ${f.status} (locked)` : ""}
            </p>
            {locked ? (
              <p className="text-sm font-semibold text-ink-900">
                {f.homeName} vs {f.awayName}
              </p>
            ) : (
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <Form.Item name={`home_${f.id}`} className="!mb-0" rules={[{ required: true }]}>
                  <Select options={teamOptions} placeholder="Home" />
                </Form.Item>
                <span className="text-xs font-bold text-ink-400">vs</span>
                <Form.Item name={`away_${f.id}`} className="!mb-0" rules={[{ required: true }]}>
                  <Select options={teamOptions} placeholder="Away" />
                </Form.Item>
              </div>
            )}
          </div>
        );
      })}

      <Button type="primary" htmlType="submit" loading={isPending} className="mt-1">
        Save matchday
      </Button>
    </Form>
  );
}
