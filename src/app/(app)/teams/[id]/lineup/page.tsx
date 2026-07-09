import { notFound } from "next/navigation";
import { db } from "@/db";
import { PitchBuilder } from "@/components/lineup/pitch-builder";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Lineup" };

export default async function LineupPage({
  params,
}: PageProps<"/teams/[id]/lineup">) {
  const { id } = await params;
  const team = await db.query.teams.findFirst({
    where: (t, { eq }) => eq(t.id, id),
    with: {
      players: { orderBy: (p, { asc }) => asc(p.squadNumber) },
      lineup: { with: { slots: true } },
    },
  });
  if (!team) notFound();

  const initialSlots =
    team.lineup?.slots.map((s) => ({
      slotIndex: s.slotIndex,
      positionLabel: s.positionLabel,
      playerId: s.playerId,
    })) ?? [];

  return (
    <div>
      <PageHeader
        kicker="Tactics board"
        title={`${team.name} lineup`}
        actions={
          <ButtonLink variant="secondary" href={`/teams/${team.id}`}>
            ← Back to team
          </ButtonLink>
        }
      />
      <PitchBuilder
        teamId={team.id}
        roster={team.players}
        initialFormation={team.lineup?.formation ?? team.formation}
        initialSlots={initialSlots}
      />
    </div>
  );
}
