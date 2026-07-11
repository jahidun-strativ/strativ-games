import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { matchLineups, players as playersTable } from "@/db/schema";
import { PitchBuilder } from "@/components/lineup/pitch-builder";
import { MatchSquadManager } from "@/components/match-squad-manager";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { ALL_FORMATIONS, DEFAULT_FORMATION, DEFAULT_SUBS } from "@/lib/formations";
import { saveMatchLineup } from "@/server/actions/lineups";
import { getEffectiveSquad } from "@/server/queries/match-squad";
import { isCaptainOf } from "@/server/auth";
import { formatFull } from "@/lib/format";

export const metadata = { title: "Match lineup" };

export default async function MatchLineupPage({
  params,
}: {
  params: Promise<{ id: string; teamId: string }>;
}) {
  const { id, teamId } = await params;

  const match = await db.query.matches.findFirst({
    where: (m, { eq }) => eq(m.id, id),
    with: {
      homeTeam: { columns: { id: true, name: true, kind: true, sportId: true } },
      awayTeam: { columns: { id: true, name: true, kind: true, sportId: true } },
    },
  });
  if (!match) notFound();

  // The team must be one side of this match, and an internal squad (external
  // opponents have no roster to line up).
  const team =
    match.homeTeamId === teamId
      ? match.homeTeam
      : match.awayTeamId === teamId
        ? match.awayTeam
        : null;
  if (!team || team.kind === "external") notFound();

  // Match line-ups are captain-only — admins assign the captain, not the lineup.
  const canEdit = await isCaptainOf(teamId);

  // The pool for this match: the per-match squad (own snapshot if customised,
  // else the current roster). This is what the pitch builder assigns from.
  const { players: squad, customized } = await getEffectiveSquad(id, teamId);

  const [existing, teamDefault, sportPlayers] = await Promise.all([
    db.query.matchLineups.findFirst({
      where: and(eq(matchLineups.matchId, id), eq(matchLineups.teamId, teamId)),
      with: { slots: true },
    }),
    // Fall back to the team's default lineup shape when this match has none yet.
    db.query.lineups.findFirst({
      where: (l, { eq }) => eq(l.teamId, teamId),
      with: { slots: true },
    }),
    // Candidates to field as guests: every player of this team's sport.
    db.query.players.findMany({
      where: eq(playersTable.sportId, team.sportId),
      orderBy: asc(playersTable.name),
      with: { team: { columns: { name: true } } },
    }),
  ]);

  const source = existing ?? teamDefault ?? null;

  const savedFormation = source?.formation;
  const initialFormation =
    savedFormation && ALL_FORMATIONS.includes(savedFormation)
      ? savedFormation
      : DEFAULT_FORMATION;

  const starterSlots = (source?.slots ?? []).filter((s) => s.role === "starter");
  const subSlots = (source?.slots ?? [])
    .filter((s) => s.role === "sub")
    .sort((a, b) => a.slotIndex - b.slotIndex);

  const initialStarters: Record<number, string | null> = {};
  for (const s of starterSlots) initialStarters[s.slotIndex] = s.playerId;

  const initialSubs =
    subSlots.length > 0 ? subSlots.map((s) => s.playerId) : Array(DEFAULT_SUBS).fill(null);

  return (
    <div>
      <PageHeader
        kicker={`Match lineup · ${formatFull(match.kickoffAt)}`}
        title={`${team.name} — ${match.homeTeam?.name ?? "TBD"} v ${match.awayTeam?.name ?? "TBD"}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <MatchSquadManager
                matchId={match.id}
                teamId={teamId}
                teamName={team.name}
                initialSquadIds={squad.map((p) => p.id)}
                candidates={sportPlayers.map((p) => ({
                  id: p.id,
                  name: p.name,
                  position: p.position,
                  teamName: p.team?.name ?? null,
                }))}
              />
            ) : null}
            <ButtonLink variant="secondary" href={`/matches/${match.id}`}>
              ← Back to match
            </ButtonLink>
          </div>
        }
      />

      <p className="mb-4 text-sm text-ink-500">
        {!canEdit
          ? `Viewing ${team.name}'s line-up for this match. Only the team captain can change it — an admin can assign one on the team page.`
          : customized
            ? `This match uses its own squad (${squad.length}) — edit it with "Manage match squad". Changes here don't affect the team roster or default lineup.`
            : !existing && teamDefault
              ? `Prefilled from ${team.name}'s default lineup — adjust it for this match and save.`
              : `Fielding ${team.name}'s current roster. Add a guest or drop someone for just this match with "Manage match squad".`}
      </p>

      <PitchBuilder
        roster={squad}
        initialFormation={initialFormation}
        initialStarters={initialStarters}
        initialSubs={initialSubs}
        onSave={saveMatchLineup.bind(null, match.id, teamId)}
        canEdit={canEdit}
        editorLabel="the team captain"
      />
    </div>
  );
}
