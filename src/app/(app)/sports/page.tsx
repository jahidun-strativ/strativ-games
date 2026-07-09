import { asc } from "drizzle-orm";
import { db } from "@/db";
import { sports } from "@/db/schema";
import { createSport, deleteSport, updateSport } from "@/server/actions/sports";
import { SportForm } from "@/components/sport-form";
import { PageHeader } from "@/components/ui/page-header";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { isAdmin } from "@/server/auth";

export const metadata = { title: "Sports" };

export default async function SportsPage() {
  const [allSports, admin] = await Promise.all([
    db.query.sports.findMany({
      orderBy: asc(sports.name),
      with: { teams: { columns: { id: true } }, players: { columns: { id: true } } },
    }),
    isAdmin(),
  ]);

  return (
    <div>
      <PageHeader kicker="Sports catalogue" title="Sports" />

      <div className={`grid gap-6 ${admin ? "lg:grid-cols-[1fr_22rem]" : ""}`}>
        <div className="space-y-4">
          {allSports.map((sport) => {
            const header = (
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
                  style={{ backgroundColor: sport.color }}
                >
                  {sport.shortName}
                </span>
                <div>
                  <p className="font-display text-lg">{sport.name}</p>
                  <p className="text-xs text-ink-500">
                    {sport.teams.length} teams · {sport.players.length} players
                  </p>
                </div>
              </div>
            );

            if (!admin) {
              return (
                <div key={sport.id} className="tv-card-sm p-4">
                  {header}
                  {sport.description ? (
                    <p className="mt-3 text-sm text-ink-700">{sport.description}</p>
                  ) : null}
                </div>
              );
            }

            return (
              <details key={sport.id} className="tv-card-sm group p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  {header}
                  <span className="text-xs font-bold uppercase text-burnt-400 group-open:hidden">
                    Edit ▾
                  </span>
                </summary>
                {sport.description ? (
                  <p className="mt-3 text-sm text-ink-700">{sport.description}</p>
                ) : null}
                <div className="mt-4 border-t border-line pt-4">
                  <SportForm
                    action={updateSport.bind(null, sport.id)}
                    sport={sport}
                    submitLabel="Save"
                  />
                </div>
                <div className="mt-2 flex justify-end">
                  <ConfirmDelete
                    action={deleteSport.bind(null, sport.id)}
                    confirmMessage={`Delete ${sport.name}? All its teams, players and matches will be removed.`}
                  />
                </div>
              </details>
            );
          })}
        </div>

        {admin ? (
          <aside>
            <div className="tv-card p-5">
              <h2 className="font-display mb-4 text-lg text-ink-900">Add a sport</h2>
              <SportForm action={createSport} submitLabel="Add sport" />
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
