import { asc } from "drizzle-orm";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { createStaff, deleteStaff, updateStaff } from "@/server/actions/staff";
import { StaffForm } from "@/components/staff-form";
import { PageHeader } from "@/components/ui/page-header";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { EmptyState } from "@/components/ui/empty-state";
import { isAdmin } from "@/server/auth";

export const metadata = { title: "Staff" };

export default async function StaffPage() {
  const [allStaff, allSports, allTeams, admin] = await Promise.all([
    db.query.staff.findMany({
      orderBy: asc(staff.name),
      with: { sport: true, team: true },
    }),
    db.query.sports.findMany(),
    db.query.teams.findMany(),
    isAdmin(),
  ]);

  return (
    <div>
      <PageHeader kicker="Backroom" title="Staff" />

      <div className={`grid gap-6 ${admin ? "lg:grid-cols-[1fr_22rem]" : ""}`}>
        <div className="space-y-3">
          {allStaff.length === 0 ? (
            <EmptyState title="No staff yet" hint="Add coaches, physios and admins." />
          ) : (
            allStaff.map((member) => {
              const meta = (
                <div>
                  <p className="font-bold">{member.name}</p>
                  <p className="text-xs text-ink-500">
                    {member.role}
                    {member.department ? ` · ${member.department}` : ""} ·{" "}
                    {member.team?.name ?? "Strativ-wide"} ({member.sport.name})
                  </p>
                </div>
              );

              if (!admin) {
                return (
                  <div key={member.id} className="tv-card-sm p-4">
                    {meta}
                  </div>
                );
              }

              return (
                <details key={member.id} className="tv-card-sm group p-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    {meta}
                    <span className="text-xs font-bold uppercase text-burnt-400 group-open:hidden">
                      Edit ▾
                    </span>
                  </summary>
                  <div className="mt-4 border-t border-line pt-4">
                    <StaffForm
                      action={updateStaff.bind(null, member.id)}
                      sports={allSports}
                      teams={allTeams}
                      member={member}
                      submitLabel="Save"
                    />
                  </div>
                  <div className="mt-2 flex justify-end">
                    <ConfirmDelete
                      action={deleteStaff.bind(null, member.id)}
                      confirmMessage={`Remove ${member.name} from staff?`}
                    />
                  </div>
                </details>
              );
            })
          )}
        </div>

        {admin ? (
          <aside>
            <div className="tv-card p-5">
              <h2 className="font-display mb-4 text-lg text-ink-900">Add staff member</h2>
              <StaffForm
                action={createStaff}
                sports={allSports}
                teams={allTeams}
                submitLabel="Add staff"
              />
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
