"use client";

import { FormModal } from "@/components/form-modal";
import { TeamForm } from "@/components/team-form";
import { PlayerForm } from "@/components/player-form";
import { VenueForm } from "@/components/venue-form";
import { MatchForm } from "@/components/match-form";
import { createTeam, updateTeam } from "@/server/actions/teams";
import { createPlayer, updatePlayer } from "@/server/actions/players";
import { createVenue, updateVenue } from "@/server/actions/venues";
import { createMatch, updateMatch } from "@/server/actions/matches";
import type { Match, Player, Sport, Team, Venue } from "@/db/schema";

type Variant = "primary" | "secondary" | "danger" | "ghost";

export function NewMatchButton({
  sports,
  teams,
  venues,
  label = "+ Schedule match",
  variant = "primary",
}: {
  sports: Sport[];
  teams: Team[];
  venues: Venue[];
  label?: string;
  variant?: Variant;
}) {
  return (
    <FormModal title="Schedule a match" triggerLabel={label} triggerVariant={variant} width={560}>
      {(close) => (
        <MatchForm
          action={createMatch}
          sports={sports}
          teams={teams}
          venues={venues}
          onSuccess={close}
        />
      )}
    </FormModal>
  );
}

export function EditMatchButton({
  sports,
  teams,
  venues,
  match,
  label = "Edit match",
}: {
  sports: Sport[];
  teams: Team[];
  venues: Venue[];
  match: Match;
  label?: string;
}) {
  return (
    <FormModal title="Edit match" triggerLabel={label} triggerVariant="secondary" width={560}>
      {(close) => (
        <MatchForm
          action={updateMatch.bind(null, match.id)}
          sports={sports}
          teams={teams}
          venues={venues}
          match={match}
          submitLabel="Save match"
          onSuccess={close}
        />
      )}
    </FormModal>
  );
}

export function NewTeamButton({
  sports,
  kind = "internal",
  label,
  variant = "primary",
}: {
  sports: Sport[];
  kind?: "internal" | "external";
  label?: string;
  variant?: Variant;
}) {
  const external = kind === "external";
  return (
    <FormModal
      title={external ? "New opponent" : "New team"}
      triggerLabel={label ?? (external ? "+ New opponent" : "+ New team")}
      triggerVariant={variant}
      width={520}
    >
      {(close) => (
        <TeamForm
          action={createTeam}
          sports={sports}
          kind={kind}
          submitLabel={external ? "Add opponent" : "Create team"}
          onSuccess={close}
        />
      )}
    </FormModal>
  );
}

export function EditTeamButton({ sports, team }: { sports: Sport[]; team: Team }) {
  return (
    <FormModal title={`Edit ${team.name}`} triggerLabel="Edit" triggerVariant="secondary" width={520}>
      {(close) => (
        <TeamForm
          action={updateTeam.bind(null, team.id)}
          sports={sports}
          team={team}
          submitLabel="Save changes"
          onSuccess={close}
        />
      )}
    </FormModal>
  );
}

export function NewPlayerButton({
  sports,
  teams,
  label = "+ New player",
  variant = "primary",
  defaultSportId,
  defaultTeamId,
}: {
  sports: Sport[];
  teams: Team[];
  label?: string;
  variant?: Variant;
  defaultSportId?: string;
  defaultTeamId?: string;
}) {
  return (
    <FormModal title="Add a player" triggerLabel={label} triggerVariant={variant} width={640}>
      {(close) => (
        <PlayerForm
          action={createPlayer}
          sports={sports}
          teams={teams}
          submitLabel="Add player"
          onSuccess={close}
          defaultSportId={defaultSportId}
          defaultTeamId={defaultTeamId}
        />
      )}
    </FormModal>
  );
}

export function EditPlayerButton({
  sports,
  teams,
  player,
}: {
  sports: Sport[];
  teams: Team[];
  player: Player;
}) {
  return (
    <FormModal
      title={`Edit ${player.name}`}
      triggerLabel="Edit"
      triggerVariant="secondary"
      width={640}
    >
      {(close) => (
        <PlayerForm
          action={updatePlayer.bind(null, player.id)}
          sports={sports}
          teams={teams}
          player={player}
          submitLabel="Save changes"
          onSuccess={close}
        />
      )}
    </FormModal>
  );
}

export function NewVenueButton({
  label = "+ New venue",
  variant = "primary",
}: {
  label?: string;
  variant?: Variant;
}) {
  return (
    <FormModal title="New venue" triggerLabel={label} triggerVariant={variant} width={560}>
      {(close) => <VenueForm action={createVenue} submitLabel="Add venue" onSuccess={close} />}
    </FormModal>
  );
}

export function EditVenueButton({ venue }: { venue: Venue }) {
  return (
    <FormModal title={`Edit ${venue.name}`} triggerLabel="Edit" triggerVariant="secondary" width={560}>
      {(close) => (
        <VenueForm
          action={updateVenue.bind(null, venue.id)}
          venue={venue}
          submitLabel="Save changes"
          onSuccess={close}
        />
      )}
    </FormModal>
  );
}
