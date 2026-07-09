"use client";

import dayjs from "dayjs";
import { Button, DatePicker, Form, Input, Segmented, Select } from "antd";
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
  const kind = Form.useWatch("kind", form) ?? "internal";
  const sportId = Form.useWatch("sportId", form);
  const homeTeamId = Form.useWatch("homeTeamId", form);

  const internalTeams = teams.filter((t) => t.kind !== "external");
  const externalTeams = teams.filter((t) => t.kind === "external");
  const bySport = <T extends Team>(list: T[]) =>
    list.filter((t) => !sportId || t.sportId === sportId);

  const opt = (list: Team[], exclude?: string) =>
    bySport(list)
      .filter((t) => t.id !== exclude)
      .map((t) => ({ value: t.id, label: t.name }));

  // Derive competitive fields (our side vs opponent, home/away) for editing.
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const homeIsExternal = match?.homeTeamId
    ? teamMap.get(match.homeTeamId)?.kind === "external"
    : false;
  const initialCompetitive =
    match?.kind === "competitive"
      ? homeIsExternal
        ? { ourTeamId: match.awayTeamId, opponentId: match.homeTeamId, isHome: "away" }
        : { ourTeamId: match.homeTeamId, opponentId: match.awayTeamId, isHome: "home" }
      : { isHome: "home" };

  // Map the form values into the home/away + kind shape the action expects.
  function handleFinish(values: Record<string, unknown>) {
    const v = { ...values };
    if (v.kind === "competitive") {
      const our = v.ourTeamId as string | undefined;
      const opp = v.opponentId as string | undefined;
      const home = v.isHome !== "away";
      v.homeTeamId = home ? our : opp;
      v.awayTeamId = home ? opp : our;
    }
    delete v.ourTeamId;
    delete v.opponentId;
    delete v.isHome;
    onFinish(v);
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{
        kind: match?.kind ?? "internal",
        sportId: match?.sportId ?? undefined,
        homeTeamId: match?.homeTeamId ?? undefined,
        awayTeamId: match?.awayTeamId ?? undefined,
        ourTeamId: initialCompetitive.ourTeamId ?? undefined,
        opponentId: initialCompetitive.opponentId ?? undefined,
        isHome: initialCompetitive.isHome,
        title: match?.title ?? undefined,
        venueId: match?.venueId ?? undefined,
        kickoffAt: match ? dayjs(match.kickoffAt) : undefined,
        notes: match?.notes ?? undefined,
      }}
    >
      <Form.Item name="kind">
        <Segmented
          block
          options={[
            { label: "Internal (Strativ vs Strativ)", value: "internal" },
            { label: "Competitive (vs opponent)", value: "competitive" },
          ]}
          onChange={() => {
            form.setFieldsValue({
              homeTeamId: undefined,
              awayTeamId: undefined,
              ourTeamId: undefined,
              opponentId: undefined,
            });
          }}
        />
      </Form.Item>

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
          showTime={{ format: "h:mm A", minuteStep: 5, use12Hours: true }}
          format="ddd D MMM YYYY, h:mm A"
          className="!w-full sm:!w-72"
        />
      </Form.Item>

      <div className="my-4 border-t border-line pt-4">
        <Form.Item label="Sport" name="sportId">
          <Select
            allowClear
            placeholder="Any sport"
            options={sports.map((s) => ({ value: s.id, label: s.name }))}
            onChange={() =>
              form.setFieldsValue({
                homeTeamId: undefined,
                awayTeamId: undefined,
                ourTeamId: undefined,
                opponentId: undefined,
              })
            }
          />
        </Form.Item>

        {kind === "competitive" ? (
          <>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Form.Item label="Strativ team" name="ourTeamId">
                <Select allowClear placeholder="Our team" options={opt(internalTeams)} />
              </Form.Item>
              <Form.Item label="Opponent" name="opponentId">
                <Select
                  allowClear
                  placeholder={externalTeams.length ? "Select opponent" : "Add opponents on the Teams page"}
                  options={opt(externalTeams)}
                />
              </Form.Item>
            </div>
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
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item label="Home team" name="homeTeamId">
              <Select allowClear placeholder="TBD" options={opt(internalTeams)} />
            </Form.Item>
            <Form.Item label="Away team" name="awayTeamId">
              <Select allowClear placeholder="TBD" options={opt(internalTeams, homeTeamId)} />
            </Form.Item>
          </div>
        )}

        <Form.Item
          label="Match title"
          name="title"
          tooltip="Shown when teams aren't set yet, e.g. “Friday five-a-side”."
        >
          <Input placeholder="Optional label" />
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
