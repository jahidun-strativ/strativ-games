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
  league: text("league"),
  formation: text("formation").notNull().default("4-4-2"),
  stadium: text("stadium"),
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const matches = pgTable("matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Sport and teams are optional — a match can be booked (venue + time) first
  // and have its teams assigned later.
  sportId: uuid("sport_id").references(() => sports.id, { onDelete: "set null" }),
  homeTeamId: uuid("home_team_id").references(() => teams.id, { onDelete: "set null" }),
  awayTeamId: uuid("away_team_id").references(() => teams.id, { onDelete: "set null" }),
  // Free-text label for matches without teams yet (e.g. "Friday friendly").
  title: text("title"),
  venueId: uuid("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "restrict" }),
  kickoffAt: timestamp("kickoff_at", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("scheduled"),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
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
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const lineupSlots = pgTable(
  "lineup_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lineupId: uuid("lineup_id")
      .notNull()
      .references(() => lineups.id, { onDelete: "cascade" }),
    slotIndex: integer("slot_index").notNull(),
    positionLabel: text("position_label").notNull(),
    playerId: uuid("player_id").references(() => players.id, { onDelete: "set null" }),
  },
  (t) => [unique().on(t.lineupId, t.slotIndex)],
);

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
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
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

export type Sport = typeof sports.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Player = typeof players.$inferSelect;
export type StaffMember = typeof staff.$inferSelect;
export type Venue = typeof venues.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type PlayerMatchStat = typeof playerMatchStats.$inferSelect;
export type Lineup = typeof lineups.$inferSelect;
export type LineupSlot = typeof lineupSlots.$inferSelect;
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;

export const MATCH_STATUSES = ["scheduled", "completed", "cancelled"] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const PLAYER_STATUSES = ["active", "injured", "suspended", "inactive"] as const;
