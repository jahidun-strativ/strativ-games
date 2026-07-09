"use client";

import { useTransition } from "react";
import { App, Button, Tag } from "antd";
import { setUserRole } from "@/server/actions/members";

export type MemberRow = {
  userId: string;
  email: string;
  name: string | null;
  role: string;
};

export function MembersTable({ members, meUserId }: { members: MemberRow[]; meUserId: string }) {
  const { message } = App.useApp();
  const [isPending, startTransition] = useTransition();

  function toggle(m: MemberRow) {
    const next = m.role === "admin" ? "member" : "admin";
    startTransition(async () => {
      try {
        await setUserRole(m.userId, next);
        message.success(`${m.name || m.email} is now ${next === "admin" ? "an admin" : "a member"}.`);
      } catch (err) {
        message.error(err instanceof Error ? err.message : "Couldn't update role.");
      }
    });
  }

  return (
    <div className="tv-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-cream-100 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">
            <th className="px-4 py-2">Member</th>
            <th className="px-4 py-2">Role</th>
            <th className="px-4 py-2 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => {
            const isMe = m.userId === meUserId;
            return (
              <tr key={m.userId} className="border-b border-line last:border-b-0">
                <td className="px-4 py-3">
                  <p className="font-bold">
                    {m.name || m.email}
                    {isMe ? <span className="ml-2 text-xs text-ink-500">(you)</span> : null}
                  </p>
                  <p className="text-xs text-ink-500">{m.email}</p>
                </td>
                <td className="px-4 py-3">
                  <Tag color={m.role === "admin" ? "orange" : "default"} className="uppercase">
                    {m.role}
                  </Tag>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="small"
                    loading={isPending}
                    onClick={() => toggle(m)}
                    danger={m.role === "admin"}
                  >
                    {m.role === "admin" ? "Revoke admin" : "Make admin"}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
