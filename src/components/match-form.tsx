"use client";

import dayjs from "dayjs";
import { Button, DatePicker, Form, Input, Select } from "antd";
import { useActionSubmit } from "@/components/forms/form-utils";
import type { Match, Sport, Team, Venue } from "@/db/schema";

export function MatchForm({
  action,
  sports,
  teams,
  venues,
  match,
  submitLabel = "Book venue & schedule",
  onSuccess,
}: {
  action: (formData: FormData) => Promise<void>;
  sports: Sport[];
  teams: Team[];
  venues: Venue[];
  match?: Match;
  submitLabel?: string;
  onSuccess?: () => void;
}) {
  const { onFinish, isPending } = useActionSubmit(action, onSuccess);
  const [form] = Form.useForm();
  const sportId = Form.useWatch("sportId", form);
  const homeTeamId = Form.useWatch("homeTeamId", form);

  const sportTeams = teams.filter((t) => !sportId || t.sportId === sportId);
  const teamOptions = (exclude?: string) =>
    sportTeams
      .filter((t) => t.id !== exclude)
      .map((t) => ({ value: t.id, label: t.name }));

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={{
        sportId: match?.sportId ?? undefined,
        homeTeamId: match?.homeTeamId ?? undefined,
        awayTeamId: match?.awayTeamId ?? undefined,
        title: match?.title ?? undefined,
        venueId: match?.venueId ?? undefined,
        kickoffAt: match ? dayjs(match.kickoffAt) : undefined,
        notes: match?.notes ?? undefined,
      }}
    >
      <Form.Item
        label="Venue (booking)"
        name="venueId"
        rules={[{ required: true, message: "Every match needs a booked venue" }]}
      >
        <Select
          placeholder="Select venue"
          options={venues.map((v) => ({
            value: v.id,
            label: `📍 ${v.name}${v.city ? ` — ${v.city}` : ""}`,
          }))}
        />
      </Form.Item>
      <Form.Item label="Kickoff" name="kickoffAt" rules={[{ required: true }]}>
        <DatePicker
          showTime={{ format: "HH:mm", minuteStep: 5 }}
          format="ddd D MMM YYYY, HH:mm"
          className="!w-full sm:!w-72"
        />
      </Form.Item>

      <div className="my-4 border-t border-line pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-500">
          Teams (optional — you can assign these later)
        </p>
        <Form.Item label="Sport" name="sportId">
          <Select
            allowClear
            placeholder="Any sport"
            options={sports.map((s) => ({ value: s.id, label: s.name }))}
            onChange={() => {
              form.setFieldValue("homeTeamId", undefined);
              form.setFieldValue("awayTeamId", undefined);
            }}
          />
        </Form.Item>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Form.Item label="Home team" name="homeTeamId">
            <Select allowClear placeholder="TBD" options={teamOptions()} />
          </Form.Item>
          <Form.Item label="Away team" name="awayTeamId">
            <Select allowClear placeholder="TBD" options={teamOptions(homeTeamId)} />
          </Form.Item>
        </div>
        <Form.Item
          label="Match title"
          name="title"
          tooltip="Shown when teams aren't set yet, e.g. “Friday five-a-side”."
        >
          <Input placeholder="Optional label for team-less matches" />
        </Form.Item>
      </div>

      <Form.Item label="Notes" name="notes">
        <Input.TextArea rows={2} placeholder="Cup round, friendly, kit colour…" />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={isPending}>
        {submitLabel}
      </Button>
    </Form>
  );
}
