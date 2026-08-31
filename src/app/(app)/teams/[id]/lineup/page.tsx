import { notFound } from "next/navigation";
import { db } from "@/db";
import { PitchBuilder } from "@/components/lineup/pitch-builder";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { PosterButton } from "@/components/poster-button";
import { ALL_FORMATIONS, DEFAULT_FORMATION } from "@/lib/formations";
import { saveLineup } from "@/server/actions/lineups";
import { isAdmin } from "@/server/auth";

export const metadata = { title: "Lineup" };

export default async function LineupPage({
  params,
}: PageProps<"/teams/[id]/lineup">) {
  const { id } = await params;
  const team = await db.query.teams.findFirst({
    where: (t, { eq }) => eq(t.id, id),
    with: {
      players: { orderBy: (p, { asc }) => asc(p.name) },
      lineup: { with: { slots: true } },
    },
  });
  if (!team) notFound();
  const admin = await isAdmin();

  // A previously saved lineup keeps its formation; otherwise a fresh team
  // builds up at the 6-a-side default rather than a full 11.
  const savedFormation = team.lineup?.formation;
  const initialFormation =
    savedFormation && ALL_FORMATIONS.includes(savedFormation)
      ? savedFormation
      : DEFAULT_FORMATION;

  const slots = team.lineup?.slots ?? [];
  // Starters and their per-position subs are both keyed by starter slot index.
  const initialStarters: Record<number, string | null> = {};
  const initialSubs: Record<number, string | null> = {};
  for (const s of slots) {
    if (s.role === "starter") initialStarters[s.slotIndex] = s.playerId;
    else initialSubs[s.slotIndex] = s.playerId;
  }

  return (
    <div>
      <PageHeader
        kicker="Tactics board"
        title={`${team.name} lineup`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PosterButton
              basePath={`/teams/${team.id}/lineup/poster`}
              label="Lineup image"
              variants={[
                { label: "Lineup image", variant: "lineup", hint: "Formation on the pitch" },
              ]}
            />
            <ButtonLink variant="secondary" href={`/teams/${team.id}`}>
              ← Back to team
            </ButtonLink>
          </div>
        }
      />
      <PitchBuilder
        roster={team.players}
        initialFormation={initialFormation}
        initialStarters={initialStarters}
        initialSubs={initialSubs}
        onSave={saveLineup.bind(null, team.id)}
        canEdit={admin}
      />
    </div>
  );
}
