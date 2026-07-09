# Strativ Games — Project Handoff

> Living doc for picking up work in a new session. Update the **Open items** and
> **Recent changes** sections at the end of any substantial task.

_Last updated: 2026-07-09_

## What this is
A sports team manager for Strativ: sports, teams, players, staff, venues,
matches/fixtures, stats/standings, formation & lineup builder. Auth-gated,
role-based, installable PWA with push notifications. Modern dark "stadium
night" theme.

**Working dir:** `strativ-sports-manager/`

## Stack & non-obvious gotchas
- **Next.js 16.2.10** (App Router, Turbopack). Breaking vs older Next — docs in
  `node_modules/next/dist/docs/`. `proxy.ts` replaces `middleware.ts`;
  `params`/`searchParams`/`cookies()` are async; use generated `PageProps<'/route'>`.
- **Neon Postgres + Drizzle** (`drizzle-orm/neon-http`). Schema: `src/db/schema.ts`.
  Migrations are **raw-SQL scripts** in `scripts/migrate-*.mjs` run with `node scripts/x.mjs`
  (drizzle-kit push is interactive and blocked in this env).
- **Neon Auth** = `@neondatabase/auth` (+ `-ui`), Better Auth based (NOT Stack Auth).
  Env: `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`. Client: `src/lib/auth/client.ts`;
  server: `src/lib/auth/server.ts`.
- **Ant Design v6** + `@ant-design/nextjs-registry`; dark theme in
  `src/components/antd-provider.tsx`. ⚠️ antd icons crash in **server components** —
  import icons from `src/components/icons.tsx` (a `"use client"` re-export).
- **web-push** (notifications), **sharp** (icon generation).
- **Timezone:** app is **Asia/Dhaka** (`src/lib/timezone.ts`). Match times are
  entered/shown in Bangladesh time; stored as UTC.

## Verify loop (run after changes)
```
npx tsc --noEmit
npx eslint src
npm run build
```
Dev server: Claude Preview MCP `preview_start` (name `dev`, port 3000). Rebuild
touches `.next` and can kill the dev server — restart it after `npm run build`.

## Key conventions
- Mutations = **server actions** in `src/server/actions/*` with `requireAdmin()`
  (or `requireUser()` for self-scoped things like push subscribe). Then `revalidatePath`.
- Auth/role helpers: `src/server/auth.ts` — `getSession()`, `getRole()`, `requireUser()`,
  `isAdmin()`, `requireAdmin()` (session + role deduped per request via React `cache()`).
- Create/edit UIs are **antd modals** via `src/components/entity-modals.tsx` (launcher
  buttons that server pages render with plain-data props) — no full-page forms.
- Central date formatting: `src/lib/format.ts` (12-hour AM/PM, Asia/Dhaka).

## Features (all built, build passing)
- **Auth:** `@strativ.se`-only gate (`src/lib/auth/allowed.ts`); custom antd sign-in
  (`src/components/auth/sign-in-form.tsx`, native password eye, `you@strativ.se`);
  other flows via `AuthView`. Split-screen auth page w/ live stats. `/blocked` page.
  Account at `/account/[path]` (email locked, delete-account on).
- **Roles (RBAC):** `admin` vs `member`, `app_users` table. `requireAdmin()` on all
  create/edit/delete; members get read-only UI. **jahidun.nur@strativ.se = admin**
  (DB row + `ADMIN_EMAILS` env). First user auto-admin if no `ADMIN_EMAILS`.
  `/members` (admin-only) = role management + notification settings.
- **Players from registration:** login auto-creates a player (`ensureAppUser` +
  `ensurePlayerForUser` in `src/app/(app)/layout.tsx`).
- **Matches:** internal (Strativ v Strativ) or competitive (vs external opponent
  teams; `teams.kind`). Teams optional/assignable later. Venue double-booking guard.
- **Stats:** combined player leaderboards; split internal-league standings +
  competitive record. Dashboard monthly top-scorer/assist race.
- **Formation builder:** 5–11 players, per-size formations, 1–5 subs
  (`src/lib/formations.ts`, `src/components/lineup/pitch-builder.tsx`).
- **PWA + push:** manifest (`src/app/manifest.ts`), SW (`public/sw.js`); notify on
  match create, 1-day + same-day reminders via `/api/cron/reminders`
  (CRON_SECRET-protected, `vercel.json` cron, daily 08:00 BD — Vercel Hobby limit);
  catch-up push on first subscribe; admin toggles on `/members`.
- **Icons:** wordmark PWA icon `public/icons/icon.svg` → PNGs via
  `scripts/gen-icons.mjs`; favicon "SG" monogram `src/app/icon.svg`; `apple-icon.png`.

## Open items (pick up here)
1. **Route/component caching feels slow on revisit.** Pages are dynamic (cookies/DB)
   so Next doesn't cache them; dev also has no prefetch + on-demand compile (prod is
   much faster). TODO: add `experimental.staleTimes` (e.g. `{ dynamic: 30 }`) to
   `next.config.ts` so revisits within the window serve from the client Router Cache.
   **Verify `staleTimes` is supported/named the same in Next 16** (check the docs)
   before adding.
2. **PWA icon didn't update after logo change** (web favicon did). Cause: manifest
   icon URLs unchanged + SW/OS caching. TODO: version manifest icon `src` (e.g. `?v=2`)
   in `src/app/manifest.ts`, bump SW `CACHE` name in `public/sw.js` (currently `ssm-v2`)
   and its `PRECACHE` URLs. Note: installed PWAs may still need reinstall.

## Production deploy checklist
- Set env on host: `DATABASE_URL`/`DB_URL`, `NEON_AUTH_BASE_URL`,
  `NEON_AUTH_COOKIE_SECRET`, VAPID keys (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
  `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`), `ADMIN_EMAILS`, `CRON_SECRET`.
- Run all `scripts/migrate-*.mjs` against the prod DB once.
- Neon Auth → add the production **trusted domain** (fixes `INVALID_ORIGIN`).
- Cron: Vercel picks up `vercel.json`; otherwise hit `/api/cron/reminders` on a
  schedule with header `Authorization: Bearer <CRON_SECRET>`.

## Recent changes (newest first)
- Timezone support (Asia/Dhaka); cron changed to daily 08:00 BD.
- Match notifications: create + day/same-day reminders + catch-up + admin toggles.
- Favicon "SG" monogram + apple-icon; wordmark PWA icon.
- RBAC (admin/member), Members admin page.
- Internal vs competitive matches + external opponent teams.
