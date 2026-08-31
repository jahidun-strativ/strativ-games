"use client";

import { useState } from "react";
import { Button } from "antd";
import { StaffForm } from "@/components/staff-form";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { createStaff, updateStaff, deleteStaff } from "@/server/actions/staff";
import type { StaffMember } from "@/db/schema";

// Team-scoped staff management for a captain/manager (or admin). The team and
// sport are locked, so staff added here only ever belongs to this team. Read-only
// for everyone else. Reuses the shared StaffForm + staff actions.
export function TeamStaffManager({
  teamId,
  sportId,
  staff,
  canManage,
}: {
  teamId: string;
  sportId: string;
  staff: StaffMember[];
  canManage: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const fixedTeam = { id: teamId, sportId };

  const meta = (m: StaffMember) => (
    <span className="min-w-0">
      <span className="block truncate text-sm font-semibold text-ink-900">{m.name}</span>
      <span className="block truncate text-xs text-ink-500">
        {m.role}
        {m.department ? ` · ${m.department}` : ""}
      </span>
    </span>
  );

  return (
    <div className="space-y-2">
      {staff.length === 0 ? (
        <p className="text-sm text-ink-500">No staff yet.</p>
      ) : (
        staff.map((m) =>
          canManage ? (
            <details key={m.id} className="group rounded-lg border border-line bg-cream-50 p-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                {meta(m)}
                <span className="shrink-0 text-xs font-bold uppercase text-burnt-400 group-open:hidden">
                  Edit ▾
                </span>
              </summary>
              <div className="mt-3 border-t border-line pt-3">
                <StaffForm
                  action={updateStaff.bind(null, m.id)}
                  sports={[]}
                  teams={[]}
                  member={m}
                  fixedTeam={fixedTeam}
                  submitLabel="Save"
                />
                <div className="mt-2 flex justify-end">
                  <ConfirmDelete
                    action={deleteStaff.bind(null, m.id)}
                    confirmMessage={`Remove ${m.name} from staff?`}
                  />
                </div>
              </div>
            </details>
          ) : (
            <div key={m.id} className="rounded-lg border border-line bg-cream-50 p-3">
              {meta(m)}
            </div>
          ),
        )
      )}

      {canManage ? (
        adding ? (
          <div className="rounded-lg border border-line bg-cream-50 p-3">
            <StaffForm
              action={createStaff}
              sports={[]}
              teams={[]}
              fixedTeam={fixedTeam}
              submitLabel="Add staff"
              onSuccess={() => setAdding(false)}
            />
          </div>
        ) : (
          <Button size="small" onClick={() => setAdding(true)}>
            + Add staff
          </Button>
        )
      ) : null}
    </div>
  );
}
