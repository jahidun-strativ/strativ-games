import { eq } from "drizzle-orm";
import { ArrowRight } from "lucide-react";
import { db } from "@/db";
import { players as playersTable, teams as teamsTable } from "@/db/schema";
import { isAdmin } from "@/server/auth";
import { getActiveSeason } from "@/server/queries/season";
import { getRecentTransfers } from "@/server/queries/transfers";
import { TransferWindow } from "@/components/league/transfer-window";
import { PosterButton } from "@/components/poster-button";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Transfer window" };
export const dynamic = "force-dynamic";

export default async function LeagueTransfersPage() {
  const [admin, season] = await Promise.all([isAdmin(), getActiveSeason()]);
  if (!season) return null;

  const [sportTeams, sportPlayers, transfers] = await Promise.all([
    db.query.teams.findMany({
      where: eq(teamsTable.sportId, season.sportId),
      columns: { id: true, name: true, kind: true },
      orderBy: (t, { asc }) => asc(t.name),
    }),
    db.query.players.findMany({
      where: eq(playersTable.sportId, season.sportId),
      orderBy: (p, { asc }) => asc(p.name),
      with: { team: { columns: { name: true } } },
    }),
    getRecentTransfers({ sportId: season.sportId }),
  ]);

  const internalTeams = sportTeams.filter((t) => t.kind !== "external");
  const transferPlayers = sportPlayers.map((p) => ({
    id: p.id,
    name: p.name,
    teamId: p.teamId,
    teamName: p.team?.name ?? null,
  }));

  return (
    <div className="space-y-6">
      {admin ? (
        <TransferWindow players={transferPlayers} teams={internalTeams} />
      ) : (
        <p className="text-sm text-ink-500">Recent transfers in {season.name}.</p>
      )}

      <section>
        <h2 className="font-display mb-3 text-xl text-ink-900">Recent transfers</h2>
        {transfers.length === 0 ? (
          <p className="tv-card px-4 py-6 text-sm text-ink-500">
            No transfers yet — moves you make appear here as shareable cards.
          </p>
        ) : (
          <ul className="space-y-3">
            {transfers.map((t) => (
              <li
                key={t.id}
                className="tv-card-sm flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0 space-y-1.5">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                      t.kind === "swap"
                        ? "bg-gold-400/20 text-gold-300"
                        : "bg-burnt-500/20 text-burnt-400"
                    }`}
                  >
                    {t.kind === "swap" ? "Swap deal" : "Transfer"} · {formatDate(t.createdAt)}
                  </span>
                  {t.moves.map((m, i) => (
                    <p key={i} className="flex flex-wrap items-center gap-1.5 text-sm">
                      <span className="font-bold text-ink-900">{m.player}</span>
                      <span className="text-ink-500">{m.from ?? "Free agent"}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-burnt-400" />
                      <span className="font-semibold text-ink-900">{m.to ?? "Free agent"}</span>
                    </p>
                  ))}
                </div>
                <PosterButton
                  basePath={`/league/transfers/${t.id}/poster`}
                  label="Photo card"
                  variants={[
                    { label: "Transfer card", variant: "transfer", hint: "Done-deal graphic" },
                  ]}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
