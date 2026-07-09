import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { deletePlayer } from "@/server/actions/players";
import { getPlayerTotals } from "@/server/queries/stats";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { EditPlayerButton } from "@/components/entity-modals";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Player" };

export default async function PlayerDetailPage({
  params,
}: PageProps<"/players/[id]">) {
  const { id } = await params;
  const [player, allSports, allTeams] = await Promise.all([
    db.query.players.findFirst({
      where: (p, { eq }) => eq(p.id, id),
      with: {
        team: true,
        sport: true,
        matchStats: {
          with: { match: { with: { homeTeam: true, awayTeam: true } } },
          orderBy: (s, { desc }) => desc(s.createdAt),
          limit: 10,
        },
      },
    }),
    db.query.sports.findMany(),
    db.query.teams.findMany(),
  ]);
  if (!player) notFound();

  const totals = await getPlayerTotals(id);

  return (
    <div>
      <PageHeader
        kicker={`${player.sport.name} · ${player.team?.name ?? "Free agent"}`}
        title={
          player.squadNumber ? `#${player.squadNumber} ${player.name}` : player.name
        }
        actions={<EditPlayerButton sports={allSports} teams={allTeams} player={player} />}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-cream-200 px-3 py-1 text-sm font-bold uppercase text-ink-700">
          {player.position}
        </span>
        <StatusBadge status={player.status} />
      </div>

      <section className="grid grid-cols-3 gap-3 sm:max-w-md sm:gap-4">
        {[
          { label: "Goals", value: totals.goals },
          { label: "Assists", value: totals.assists },
          { label: "Apps", value: totals.appearances },
        ].map((stat) => (
          <div key={stat.label} className="tv-card-sm p-4 text-center">
            <p className="scoreboard text-3xl font-bold text-burnt-400">{stat.value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-widest text-ink-500">
              {stat.label}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-8">
        <h2 className="font-display mb-3 text-xl text-ink-900">Match log</h2>
        {player.matchStats.length === 0 ? (
          <p className="text-sm text-ink-500">No recorded matches yet.</p>
        ) : (
          <div className="tv-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-cream-100 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Match</th>
                  <th className="px-3 py-2 text-center">G</th>
                  <th className="px-3 py-2 text-center">A</th>
                </tr>
              </thead>
              <tbody>
                {player.matchStats.map((s) => (
                  <tr key={s.id} className="border-b border-line last:border-b-0">
                    <td className="px-3 py-2 text-ink-500">{formatDate(s.match.kickoffAt)}</td>
                    <td className="px-3 py-2">
                      <Link href={`/matches/${s.match.id}`} className="font-bold hover:text-burnt-400">
                        {s.match.homeTeam?.name ?? "TBD"} v {s.match.awayTeam?.name ?? "TBD"}
                      </Link>
                    </td>
                    <td className="scoreboard px-3 py-2 text-center font-bold text-burnt-400">
                      {s.goals}
                    </td>
                    <td className="scoreboard px-3 py-2 text-center font-bold text-pitch-500">
                      {s.assists}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-8 border-t border-line pt-4">
        <ConfirmDelete
          action={deletePlayer.bind(null, player.id)}
          label="Delete player"
          confirmMessage={`Delete ${player.name} and all their match stats?`}
        />
      </div>
    </div>
  );
}
