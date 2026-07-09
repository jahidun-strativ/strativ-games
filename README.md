# Strativ Games

A retro-broadcast-themed sports club manager built with Next.js 16, Neon Postgres, Neon Auth (Better Auth), Drizzle ORM and Tailwind CSS v4. Mobile-responsive with PWA support (installable, offline fallback).

## Features

- **Authentication** — Neon Auth (`@neondatabase/auth`, Better Auth based). All pages require sign-in; every signed-in user has full access.
- **Roster management** — full CRUD for sports, teams, players and staff.
- **Matches & venue bookings** — schedule fixtures with a required venue, double-booking guard, reschedule/cancel, and result entry with per-player goals/assists.
- **Stats** — top scorers / assists / appearances leaderboards and per-sport league standings computed from completed matches.
- **Lineup builder** — tap-to-assign visual pitch with formation presets (4-4-2, 4-3-3, 3-5-2, 4-2-3-1, 5-3-2).
- **PWA** — web manifest, retro app icons, service worker with offline page.

## Setup

1. Install dependencies: `npm install`
2. Configure `.env` (see `.env.example`):
   - `DATABASE_URL` (or `DB_URL`) — Neon Postgres connection string
   - `NEON_AUTH_BASE_URL` — from Neon console → your project → **Auth** → **Configuration** ("Auth URL")
   - `NEON_AUTH_COOKIE_SECRET` — generate with `openssl rand -base64 32`
3. Push the schema: `npm run db:push`
4. Seed demo data (optional): `npm run db:seed`
5. Run: `npm run dev`

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `start` | Production build / serve |
| `npm run db:push` | Push Drizzle schema to Neon |
| `npm run db:seed` | Seed demo data (skips if data exists) |
| `node scripts/gen-icons.mjs` | Regenerate PWA icons from `public/icons/icon.svg` |

## Architecture

- `src/db/schema.ts` — Drizzle schema (sports, teams, players, staff, venues, matches, player_match_stats, lineups, lineup_slots)
- `src/server/actions/*` — Server Actions (all mutations; auth-checked)
- `src/server/queries/*` — leaderboard SQL + pure standings computation
- `src/app/(app)/*` — protected app pages (auth gate in the group layout)
- `src/app/auth/[path]` + `src/app/api/auth/[...path]` — Neon Auth pages (sign-in/up, account) and API handler
- `src/lib/auth/*` — Neon Auth server/client instances
- `src/proxy.ts` — Next 16 proxy (middleware successor): cookie-presence redirect
- `src/app/globals.css` — retro design tokens (Tailwind v4 `@theme`)
