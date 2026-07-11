import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const sports = pgTable("sports", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  shortName: text("short_name").notNull(),
  color: text("color").notNull().default("#E8630A"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  sportId: uuid("sport_id")
    .notNull()
    .references(() => sports.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  // "internal" = a Strativ squad with a roster/lineup; "external" = an
  // opponent (other company / local club) we only track by name.
  kind: text("kind").notNull().default("internal"),
  league: text("league"),
  formation: text("formation").notNull().default("4-4-2"),
  // The team's captain (a player on this team). Whichever registered user that
  // player is linked to gets captain powers for this team: editing per-match
  // lineups and managing the roster. Admin-assigned; null = no captain yet.
  captainId: uuid("captain_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const players = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  sportId: uuid("sport_id")
    .notNull()
    .references(() => sports.id, { onDelete: "cascade" }),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  position: text("position").notNull(),
  squadNumber: integer("squad_number"),
  status: text("status").notNull().default("active"),
  // Links a player to the Neon Auth user who registered. Auto-created players
  // (one per registration) carry this; manually-added players leave it null.
  userId: text("user_id").unique(),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const staff = pgTable("staff", {
  id: uuid("id").primaryKey().defaultRandom(),
  sportId: uuid("sport_id")
    .notNull()
    .references(() => sports.id, { onDelete: "cascade" }),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  role: text("role").notNull(),
  department: text("department"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const venues = pgTable("venues", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  address: text("address"),
  city: text("city"),
  capacity: integer("capacity"),
  notes: text("notes"),
  // Standard rental cost per booking (BDT, whole taka). Pre-fills a match's
  // cost when this venue is picked; each booking can override it.
  defaultCost: integer("default_cost"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// A booked slot (e.g. a 90-min hire). Holds one or more fixtures: a single
// game (2 teams / competitive) or a round-robin (3 internal teams). Cost and
// who-paid live here since one slot is one bill regardless of games played.
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sportId: uuid("sport_id").references(() => sports.id, { onDelete: "set null" }),
  venueId: uuid("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "restrict" }),
  kind: text("kind").notNull().default("internal"),
  title: text("title"),
  notes: text("notes"),
  cost: integer("cost"),
  paidBy: text("paid_by").notNull().default("office"),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("scheduled"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const matches = pgTable("matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Belongs to a booked slot; a fixture's venue/time/cost come from its session.
  // Nullable for legacy standalone matches created before sessions existed.
  sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "cascade" }),
  // Ordering + timing within the slot (info only, not enforced).
  orderIndex: integer("order_index").notNull().default(0),
  durationMin: integer("duration_min"),
  breakMin: integer("break_min"),
  // Sport and teams are optional — a match can be booked (venue + time) first
  // and have its teams assigned later.
  sportId: uuid("sport_id").references(() => sports.id, { onDelete: "set null" }),
  homeTeamId: uuid("home_team_id").references(() => teams.id, { onDelete: "set null" }),
  awayTeamId: uuid("away_team_id").references(() => teams.id, { onDelete: "set null" }),
  // "internal" = Strativ vs Strativ; "competitive" = Strativ vs an external opponent.
  kind: text("kind").notNull().default("internal"),
  // Free-text label for matches without teams yet (e.g. "Friday friendly").
  title: text("title"),
  // Reminder de-dup flags: set once each scheduled reminder has been sent.
  remindedDayBefore: boolean("reminded_day_before").notNull().default(false),
  remindedHourBefore: boolean("reminded_hour_before").notNull().default(false),
  venueId: uuid("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "restrict" }),
  kickoffAt: timestamp("kickoff_at", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("scheduled"),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  // Booking cost (BDT, whole taka) and who covers it: "office" or "self".
  cost: integer("cost"),
  paidBy: text("paid_by").notNull().default("office"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const playerMatchStats = pgTable(
  "player_match_stats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    goals: integer("goals").notNull().default(0),
    assists: integer("assists").notNull().default(0),
    played: boolean("played").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.matchId, t.playerId)],
);

export const lineups = pgTable("lineups", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .unique()
    .references(() => teams.id, { onDelete: "cascade" }),
  formation: text("formation").notNull().default("4-4-2"),
  // Number of on-pitch starters (goalkeeper included), 5–11.
  squadSize: integer("squad_size").notNull().default(11),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const lineupSlots = pgTable(
  "lineup_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lineupId: uuid("lineup_id")
      .notNull()
      .references(() => lineups.id, { onDelete: "cascade" }),
    // "starter" = on the pitch, "sub" = on the bench.
    role: text("role").notNull().default("starter"),
    slotIndex: integer("slot_index").notNull(),
    positionLabel: text("position_label").notNull(),
    playerId: uuid("player_id").references(() => players.id, { onDelete: "set null" }),
  },
  (t) => [unique().on(t.lineupId, t.role, t.slotIndex)],
);

// A team's lineup for one specific match — its own formation and slot
// assignments, independent of the team's default lineup. One row per
// (match, team); created/edited by the team's captain or an admin.
export const matchLineups = pgTable(
  "match_lineups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    formation: text("formation").notNull().default("4-4-2"),
    squadSize: integer("squad_size").notNull().default(11),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.matchId, t.teamId)],
);

export const matchLineupSlots = pgTable(
  "match_lineup_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchLineupId: uuid("match_lineup_id")
      .notNull()
      .references(() => matchLineups.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("starter"),
    slotIndex: integer("slot_index").notNull(),
    positionLabel: text("position_label").notNull(),
    playerId: uuid("player_id").references(() => players.id, { onDelete: "set null" }),
  },
  (t) => [unique().on(t.matchLineupId, t.role, t.slotIndex)],
);

// Per-match squad membership for a team — who's playing in THIS match,
// independent of the persistent team roster (players.teamId) and the team's
// default lineup. Lets a captain field a guest for one match or drop a regular
// without touching the roster. Absence of any rows for a (match, team) means
// "use the team's current roster as-is"; the first add/remove materialises the
// roster into rows and edits from there (so each match is its own snapshot).
export const matchSquadPlayers = pgTable(
  "match_squad_players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.matchId, t.teamId, t.playerId)],
);

// Splits a booked slot's cost among players who chip in ("self"-paid slots).
// One row per (session, player); `paid` tracks who has settled up. The per-head
// share is the session cost ÷ number of payers, computed for display.
export const sessionPayments = pgTable(
  "session_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    paid: boolean("paid").notNull().default(false),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.sessionId, t.playerId)],
);

// A player's RSVP for a match: are they available to play? One row per
// (match, player); set by the player themselves. Captains use the "in" list to
// build the match squad.
export const matchAvailability = pgTable(
  "match_availability",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("in"), // in | maybe | out
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.matchId, t.playerId)],
);

// Singleton row holding which match notifications are enabled (admin-configured).
export const notificationSettings = pgTable("notification_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  notifyOnCreate: boolean("notify_on_create").notNull().default(true),
  notifyDayBefore: boolean("notify_day_before").notNull().default(true),
  notifyHourBefore: boolean("notify_hour_before").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// App-level user records with roles. One row per registered user; role gates
// who may create/edit/delete data.
export const appUsers = pgTable("app_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().unique(),
  email: text("email").notNull(),
  role: text("role").notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Web Push subscriptions — one row per browser/device a user has enabled.
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sportsRelations = relations(sports, ({ many }) => ({
  teams: many(teams),
  players: many(players),
  staff: many(staff),
  matches: many(matches),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  sport: one(sports, { fields: [teams.sportId], references: [sports.id] }),
  players: many(players),
  staff: many(staff),
  lineup: one(lineups, { fields: [teams.id], references: [lineups.teamId] }),
  captain: one(players, { fields: [teams.captainId], references: [players.id] }),
  homeMatches: many(matches, { relationName: "homeTeam" }),
  awayMatches: many(matches, { relationName: "awayTeam" }),
}));

export const playersRelations = relations(players, ({ one, many }) => ({
  sport: one(sports, { fields: [players.sportId], references: [sports.id] }),
  team: one(teams, { fields: [players.teamId], references: [teams.id] }),
  matchStats: many(playerMatchStats),
}));

export const staffRelations = relations(staff, ({ one }) => ({
  sport: one(sports, { fields: [staff.sportId], references: [sports.id] }),
  team: one(teams, { fields: [staff.teamId], references: [teams.id] }),
}));

export const venuesRelations = relations(venues, ({ many }) => ({
  matches: many(matches),
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  venue: one(venues, { fields: [sessions.venueId], references: [venues.id] }),
  sport: one(sports, { fields: [sessions.sportId], references: [sports.id] }),
  fixtures: many(matches),
  payments: many(sessionPayments),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  session: one(sessions, { fields: [matches.sessionId], references: [sessions.id] }),
  sport: one(sports, { fields: [matches.sportId], references: [sports.id] }),
  homeTeam: one(teams, {
    fields: [matches.homeTeamId],
    references: [teams.id],
    relationName: "homeTeam",
  }),
  awayTeam: one(teams, {
    fields: [matches.awayTeamId],
    references: [teams.id],
    relationName: "awayTeam",
  }),
  venue: one(venues, { fields: [matches.venueId], references: [venues.id] }),
  playerStats: many(playerMatchStats),
  lineups: many(matchLineups),
}));

export const playerMatchStatsRelations = relations(playerMatchStats, ({ one }) => ({
  match: one(matches, { fields: [playerMatchStats.matchId], references: [matches.id] }),
  player: one(players, { fields: [playerMatchStats.playerId], references: [players.id] }),
}));

export const lineupsRelations = relations(lineups, ({ one, many }) => ({
  team: one(teams, { fields: [lineups.teamId], references: [teams.id] }),
  slots: many(lineupSlots),
}));

export const lineupSlotsRelations = relations(lineupSlots, ({ one }) => ({
  lineup: one(lineups, { fields: [lineupSlots.lineupId], references: [lineups.id] }),
  player: one(players, { fields: [lineupSlots.playerId], references: [players.id] }),
}));

export const matchLineupsRelations = relations(matchLineups, ({ one, many }) => ({
  match: one(matches, { fields: [matchLineups.matchId], references: [matches.id] }),
  team: one(teams, { fields: [matchLineups.teamId], references: [teams.id] }),
  slots: many(matchLineupSlots),
}));

export const sessionPaymentsRelations = relations(sessionPayments, ({ one }) => ({
  session: one(sessions, { fields: [sessionPayments.sessionId], references: [sessions.id] }),
  player: one(players, { fields: [sessionPayments.playerId], references: [players.id] }),
}));

export const matchAvailabilityRelations = relations(matchAvailability, ({ one }) => ({
  match: one(matches, { fields: [matchAvailability.matchId], references: [matches.id] }),
  player: one(players, { fields: [matchAvailability.playerId], references: [players.id] }),
}));

export const matchLineupSlotsRelations = relations(matchLineupSlots, ({ one }) => ({
  lineup: one(matchLineups, {
    fields: [matchLineupSlots.matchLineupId],
    references: [matchLineups.id],
  }),
  player: one(players, { fields: [matchLineupSlots.playerId], references: [players.id] }),
}));

export type Sport = typeof sports.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Player = typeof players.$inferSelect;
export type StaffMember = typeof staff.$inferSelect;
export type Venue = typeof venues.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type PlayerMatchStat = typeof playerMatchStats.$inferSelect;
export type Lineup = typeof lineups.$inferSelect;
export type LineupSlot = typeof lineupSlots.$inferSelect;
export type MatchLineup = typeof matchLineups.$inferSelect;
export type MatchLineupSlot = typeof matchLineupSlots.$inferSelect;
export type MatchSquadPlayer = typeof matchSquadPlayers.$inferSelect;
export type MatchAvailability = typeof matchAvailability.$inferSelect;
export type SessionPayment = typeof sessionPayments.$inferSelect;

export const AVAILABILITY_STATUSES = ["in", "maybe", "out"] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export type AppUser = typeof appUsers.$inferSelect;
export type NotificationSettings = typeof notificationSettings.$inferSelect;

export const ROLES = ["admin", "member"] as const;
export type Role = (typeof ROLES)[number];

export const MATCH_STATUSES = ["scheduled", "completed", "cancelled"] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const MATCH_KINDS = ["internal", "competitive"] as const;
export type MatchKind = (typeof MATCH_KINDS)[number];

export const TEAM_KINDS = ["internal", "external"] as const;
export type TeamKind = (typeof TEAM_KINDS)[number];

export const PLAYER_STATUSES = ["active", "injured", "suspended", "inactive"] as const;
