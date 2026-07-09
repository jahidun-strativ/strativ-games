import { notFound } from "next/navigation";
import { db } from "@/db";
import { PitchBuilder } from "@/components/lineup/pitch-builder";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { ALL_FORMATIONS, DEFAULT_SUBS } from "@/lib/formations";

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

  const savedFormation = team.lineup?.formation;
  const initialFormation =
    savedFormation && ALL_FORMATIONS.includes(savedFormation)
      ? savedFormation
      : ALL_FORMATIONS.includes(team.formation)
        ? team.formation
        : "4-4-2";

  const starterSlots = (team.lineup?.slots ?? []).filter((s) => s.role === "starter");
  const subSlots = (team.lineup?.slots ?? [])
    .filter((s) => s.role === "sub")
    .sort((a, b) => a.slotIndex - b.slotIndex);

  const initialStarters: Record<number, string | null> = {};
  for (const s of starterSlots) initialStarters[s.slotIndex] = s.playerId;

  const initialSubs =
    subSlots.length > 0 ? subSlots.map((s) => s.playerId) : Array(DEFAULT_SUBS).fill(null);

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
        initialFormation={initialFormation}
        initialStarters={initialStarters}
        initialSubs={initialSubs}
      />
    </div>
  );
}
