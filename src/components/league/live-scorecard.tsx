"use client";

import { App, Button, Form, InputNumber, Popconfirm, Segmented, Select } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { addMatchEvent, deleteMatchEvent, finalizeMatch } from "@/server/actions/match-events";
import { useActionSubmit } from "@/components/forms/form-utils";
import type { TimelineEvent } from "@/server/queries/match-events";

type Side = {
  teamId: string;
  teamName: string;
  players: { id: string; name: string }[];
  goalkeeperIds: string[];
};

// The assigned scorekeeper's live console: log goals/saves as they happen (each
// save re-derives the score server-side), review the timeline, then finalize to
// roll everything into season stats. Read-only viewers get <MatchTimeline> instead.
export function LiveScorecard({
  matchId,
  home,
  away,
  events,
}: {
  matchId: string;
  home: Side;
  away: Side;
  events: TimelineEvent[];
}) {
  const router = useRouter();
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [isPending, startTransition] = useTransition();

  const { onFinish, isPending: adding } = useActionSubmit(
    (fd) => addMatchEvent(matchId, fd),
    () => form.resetFields(["playerId", "assistPlayerId", "minute"]),
  );

  const kind = Form.useWatch("kind", form) ?? "goal";
  const teamId = Form.useWatch("teamId", form) ?? home.teamId;
  const scorerId = Form.useWatch("playerId", form);
  const side = teamId === away.teamId ? away : home;
  const squad = side.players;
  // A save can only be credited to a designated goalkeeper. If the team has none
  // set, fall back to the whole squad so the scorer is never blocked.
  const keepers = squad.filter((p) => side.goalkeeperIds.includes(p.id));
  const playerPool = kind === "save" && keepers.length > 0 ? keepers : squad;

  // Poll for events logged elsewhere (another scorer, another device) so the
  // console stays in sync. ponytail: 10s poll, swap for SSE only if load demands.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(t);
  }, [router]);

  function runAction(fn: () => Promise<void>) {
    startTransition(async () => {
      try {
        await fn();
      } catch (err) {
        message.error(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  const teamOptions = [
    { label: home.teamName, value: home.teamId },
    { label: away.teamName, value: away.teamId },
  ];
  const teamName = (id: string | null) =>
    id === home.teamId ? home.teamName : id === away.teamId ? away.teamName : "";

  return (
    <div className="space-y-6">
      {/* Log an event */}
      <div className="tv-card-sm p-5">
        <h3 className="font-display mb-4 text-lg text-ink-900">Log an event</h3>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ kind: "goal", teamId: home.teamId }}
          onValuesChange={(changed) => {
            // Switching side clears the picked players — they belong to the old squad.
            // Switching kind clears the scorer — a goal's scorer may not be a keeper.
            if ("teamId" in changed || "kind" in changed) {
              form.resetFields(["playerId", "assistPlayerId"]);
            }
          }}
        >
          <div className="flex flex-wrap items-end gap-3">
            <Form.Item name="kind" className="!mb-0">
              <Segmented
                options={[
                  { label: "⚽ Goal", value: "goal" },
                  { label: "🧤 Save", value: "save" },
                ]}
              />
            </Form.Item>
            <Form.Item name="teamId" label="Team" className="!mb-0" rules={[{ required: true }]}>
              <Select options={teamOptions} className="!w-44" />
            </Form.Item>
            <Form.Item
              name="playerId"
              label={kind === "goal" ? "Scorer" : "Keeper"}
              className="!mb-0"
              rules={[{ required: true, message: "Pick a player" }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder={kind === "save" ? "Goalkeeper" : "Player"}
                className="!w-52"
                options={playerPool.map((p) => ({ label: p.name, value: p.id }))}
              />
            </Form.Item>
            {kind === "goal" ? (
              <Form.Item name="assistPlayerId" label="Assist (optional)" className="!mb-0">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="—"
                  className="!w-52"
                  options={squad
                    .filter((p) => p.id !== scorerId)
                    .map((p) => ({ label: p.name, value: p.id }))}
                />
              </Form.Item>
            ) : null}
            <Form.Item name="minute" label="Min" className="!mb-0">
              <InputNumber min={0} max={200} className="!w-20" placeholder="'" />
            </Form.Item>
            <Form.Item className="!mb-0">
              <Button type="primary" htmlType="submit" loading={adding}>
                Add
              </Button>
            </Form.Item>
          </div>
        </Form>
      </div>

      {/* Timeline */}
      <div className="tv-card-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <h3 className="font-display text-lg text-ink-900">Timeline</h3>
          <span className="text-xs text-ink-500">{events.length} events</span>
        </div>
        {events.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-500">
            No events yet — log the first goal or save above.
          </p>
        ) : (
          <ul>
            {[...events].reverse().map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0"
              >
                <span className="scoreboard w-9 shrink-0 text-right text-sm font-bold text-ink-500">
                  {e.minute != null ? `${e.minute}'` : "—"}
                </span>
                <span className="shrink-0 text-lg">{e.kind === "goal" ? "⚽" : "🧤"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {e.playerName}
                    {e.assistName ? (
                      <span className="font-normal text-ink-500"> — assist {e.assistName}</span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-ink-500">
                    {e.kind === "goal" ? "Goal" : "Save"} · {teamName(e.teamId)}
                  </p>
                </div>
                <Button
                  size="small"
                  danger
                  type="text"
                  disabled={isPending}
                  onClick={() => runAction(() => deleteMatchEvent(matchId, e.id))}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Finalize */}
      <div className="tv-card-sm flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h3 className="font-display text-lg text-ink-900">Finish the match</h3>
          <p className="text-sm text-ink-500">
            Rolls the timeline into player stats and marks the match completed.
          </p>
        </div>
        <Popconfirm
          title="Finalize this match?"
          description="Goals, assists and saves become season stats. You can still edit later."
          okText="Finalize"
          onConfirm={() => runAction(() => finalizeMatch(matchId))}
        >
          <Button type="primary" loading={isPending}>
            Finalize match
          </Button>
        </Popconfirm>
      </div>
    </div>
  );
}
