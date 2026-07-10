# Strativ Games — Project Handoff

> Living doc for picking up work in a new session. Update the **Open items** and
> **Recent changes** sections at the end of any substantial task.

_Last updated: 2026-07-10_

## What this is
A sports team manager for Strativ: sports, teams, players, staff, venues,
matches/fixtures, stats/standings, formation & lineup builder, booking costs.
Auth-gated, role-based, installable PWA with push notifications. Dark "stadium
night" theme with athletic (Oswald) headings.

**Working dir:** `strativ-sports-manager/`

## Stack & non-obvious gotchas
- **Next.js 16.2.10** (App Router, Turbopack). Breaking vs older Next — docs in
  `node_modules/next/dist/docs/`. `proxy.ts` replaces `middleware.ts`;
  `params`/`searchParams`/`cookies()` are async; use generated `PageProps<'/route'>`
  (a brand-new route may not be in typegen yet — type `params` inline until it builds).
- **Neon Postgres + Drizzle** (`drizzle-orm/neon-http`). Schema: `src/db/schema.ts`.
  ⚠️ **Migrations:** `drizzle-kit push` is interactive **and dangerous here** — it wants
  to add a missing `app_users.user_id` unique constraint and offers to **truncate
  app_users** (wipes users/roles). **Never run `drizzle-kit push --force`.** Instead
  write additive SQL in `scripts/migrations/*.sql` and apply with
  `node scripts/run-migration.mjs scripts/migrations/<file>.sql` (uses the neon client,
  no drizzle prompts). Older one-off migrations: `scripts/migrate-*.mjs`.
- **Neon Auth** = `@neondatabase/auth` (+ `-ui`), Better Auth based (NOT Stack Auth).
  Env: `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`. Client: `src/lib/auth/client.ts`;
  server: `src/lib/auth/server.ts`. All auth views (sign-in/up/forgot/reset) use Neon
  `AuthView` (`src/app/auth/[path]/page.tsx`) — the old custom sign-in form was removed.
- **Ant Design v6** + `@ant-design/nextjs-registry`; dark theme in
  `src/components/antd-provider.tsx`. ⚠️ antd icons crash in **server components** —
  import icons from `src/components/icons.tsx` (a `"use client"` re-export).
  v6 deprecations: `popupClassName` → `classNames.popup.root`; `destroyOnClose` →
  `destroyOnHidden`.
- **web-push** (notifications), **sharp** (icon generation).
- **Timezone:** app is **Asia/Dhaka** (`src/lib/timezone.ts`); times entered/shown in
  Bangladesh time, stored UTC. **Currency:** BDT (৳), whole taka (`formatBdt`).

## Verify loop (run after changes)
```
npx tsc --noEmit
npx eslint src
npm run build
```
Dev server: Claude Preview MCP `preview_start` (name `dev`, port 3000). Turbopack HMR
sometimes serves **stale compiled chunks** (ghost errors referencing already-removed
symbols, or CSS not updating) — if logs show impossible errors, **restart the dev
server** (and `rm -rf .next` if CSS is stuck). `preview_logs` is a rolling buffer; old
errors linger, so trust a clean restart over the buffer.

## Key conventions
- Mutations = **server actions** in `src/server/actions/*` with `requireAdmin()`
  (or `requireUser()` for self-scoped things). Then `revalidatePath`.
- Auth/role helpers: `src/server/auth.ts` — `getSession()`, `getRole()`, `isAdmin()`,
  `requireAdmin()` (deduped per request via React `cache()`).
- Create/edit UIs are launcher buttons in `src/components/entity-modals.tsx`:
  most open an antd **modal** (`form-modal.tsx`); tall ones open a right-side
  **drawer** (`form-drawer.tsx`) — e.g. "Book a slot".
- **Route loading:** list/index pages render a synchronous shell (title/header) +
  `<Suspense>` around the data with a targeted skeleton (`src/components/ui/skeleton.tsx`)
  so only the data region shows a loader. `(app)/loading.tsx` still covers detail pages
  that await at the top level.
- Central date/money formatting: `src/lib/format.ts`.

## Features (all built; app runs — see Open items for deploy state)
- **Auth:** `@strativ.se`-only gate (`src/lib/auth/allowed.ts`); Neon `AuthView` for all
  flows. Forgot/reset pages have a custom "← Back to sign in" link (Neon's built-in
  "Go back" is `history.back()`, dead when opened from an email). Split-screen auth page
  w/ live stats. Account at `/account/[path]` (email locked, delete-account on).
- **Roles (RBAC):** `admin` vs `member`, `app_users` table. `requireAdmin()` on all
  mutations. **jahidun.nur@strativ.se = admin** (+ `ADMIN_EMAILS` env; first user
  auto-admin if none). `/members` (admin-only) = role management.
- **Scheduling = "Book a slot" (sessions):** the only scheduling entry (the "Single
  match" button was removed). A **session** (`sessions` table) is a booked slot
  (venue/time/kind/cost/paidBy) holding 1+ **fixtures** (`matches.sessionId`):
  - Internal **2 teams** → one 90-min game; **3 teams** → auto **round-robin** (A-B,
    A-C, B-C; 3×25 min, staggered) — `threeTeamRoundRobin` in `server/actions/sessions.ts`.
  - **Competitive** → one game vs an external opponent (`teams.kind = external`).
  - Session page: `/sessions/[id]`. A single game is still 2-sided (edit via match page).
  - **Phase 2/3 NOT built:** per-session "who played" squads + "fill from a team", and
    round-robin → standings + one reminder per session. See Open items.
- **Booking costs (BDT):** `venues.default_cost` pre-fills a slot's cost; cost/who-paid
  ("office" vs "self") live on `sessions` (round-robin = one bill) and on legacy
  standalone `matches`. Venue page shows a spend summary (total / office / we-paid).
- **Players:** login auto-creates a player (`ensurePlayerForUser`). **Position is
  optional** (may be ""); **squad numbers removed** from all UI (`squad_number` column
  left dormant). Team page has a **roster manager** modal (`add-player-to-team.tsx`):
  add existing free agents, **remove** to free agent, or create new — stays open,
  updates live. Player↔team assignment: `assignPlayerToTeam` / `removePlayerFromTeam`.
- **Teams:** slimmed create form (name + sport; league only for opponents; formation/
  stadium/squad-number removed). `formation`/`stadium` columns dormant.
- **Stats:** player leaderboards; internal-league standings + competitive record.
  Dashboard monthly top-scorer/assist race.
- **Formation builder:** 5–11 players, per-size formations, subs. Fresh teams default to
  **6-a-side (2-2-1)** (`DEFAULT_FORMATION`). Picker is a bottom-sheet Drawer on mobile.
- **PWA + push:** manifest (`src/app/manifest.ts`), SW `public/sw.js` (cache `ssm-v4`).
  Notifies on: **create (match + session/slot)**, time/venue change, reschedule, cancel
  — gated by `notify_on_create`. **Manual force-send** "📣 Send notification" button on
  match + session pages (`notify-button.tsx`, `resend*Notification`) — reports device
  count / warns if VAPID missing. Day + same-day reminders via `/api/cron/reminders`.
  Bell toggle (`push-toggle.tsx`): green filled = on, orange **slashed** = off; syncs via
  `PUSH_CHANGED_EVENT` + tab focus. Auto-prompt once/device on first sign-in
  (`push-auto-prompt.tsx`). Notification **settings moved to Account settings**
  (`/account/settings`; admin edits reminder timing, everyone toggles their device).
- **UI/theme:** headings **Oswald** (`--font-display`), body Archivo, scores Chivo Mono.
  Animated **bouncing-ball loading screen** (`src/app/loading.tsx` + keyframes).
  **Text selection/copy disabled globally** (inputs excepted) in `globals.css`.
  `experimental.staleTimes {dynamic:30, static:180}` in `next.config.ts`. Mobile bottom
  nav = 4 tabs + **"More" drawer** (`shell/nav.tsx`).
- **Icons:** favicon "SG" monogram `src/app/icon.svg`; wordmark PWA icons + notification
  tray icon (`notification-192.png`, from favicon) + monochrome badge (`badge-96.png`,
  white "SG"), all via `scripts/gen-icons.mjs`, URLs versioned `?v=3`.

## Open items (pick up here)
1. **Deploy is pending / broken.** All this session's commits are **local only** (not
   pushed). Vercel showed a transient "unexpected error" (~1s, before build) — the local
   `next build` passes clean, so it's a Vercel-side/clone hiccup. Fix: **Redeploy**; if it
   persists, prebuilt deploy (`vercel build --prod` + `vercel deploy --prebuilt --prod`).
2. **VAPID env on Vercel.** Push **silently no-ops** in prod if `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` aren't set there. Delivery is confirmed working
   locally (test push → FCM 201). The "📣 Send notification" button surfaces
   "Push isn't configured" if they're missing.
3. **`app_users` missing unique constraint** on `user_id` (schema expects it, DB lacks it —
   this is what makes `drizzle-kit push` want to truncate). Check
   `SELECT user_id, count(*) FROM app_users GROUP BY 1 HAVING count(*)>1;` then, if clean,
   `ALTER TABLE app_users ADD CONSTRAINT app_users_user_id_unique UNIQUE (user_id);`.
4. **Sessions Phase 2/3** (see Scheduling): per-session participation + standings/reminders.
5. **Dormant columns** to optionally drop later: `teams.formation`, `teams.stadium`,
   `players.squad_number` (kept for non-destructive removal). `sessions` + cost columns
   were applied via `scripts/migrations/001-sessions-and-costs.sql`.

## Production deploy checklist
- Set env on Vercel (Production): `DATABASE_URL`/`DB_URL`, `NEON_AUTH_BASE_URL`,
  `NEON_AUTH_COOKIE_SECRET`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
  `VAPID_SUBJECT`, `ADMIN_EMAILS`, `CRON_SECRET`. Keep `NEON_AUTH_COOKIE_SECRET` **stable**
  across deploys (changing it logs everyone out).
- Apply schema via `scripts/migrations/*.sql` (run-migration.mjs) — **never**
  `drizzle-kit push --force` (would truncate app_users).
- Neon Auth → add the production **domain / redirect origins** (fixes the reset-email link
  pointing at localhost, and `INVALID_ORIGIN`). Deploys don't run migrations; app+DB
  share one Neon DB (local `.env` and prod point at the same one).
- Cron: Vercel picks up `vercel.json`; else hit `/api/cron/reminders` with
  `Authorization: Bearer <CRON_SECRET>`.

## Recent changes (newest first)
- Manual "Send notification" force-send button (match + session pages).
- Notify on booking a slot / session; notify on time-venue change, reschedule, cancel.
- "Book a slot" opens a right-side drawer; removed the redundant "Single match" button.
- Roster manager modal (add/remove/create, stays open); `removePlayerFromTeam`.
- Sessions + round-robin (Phase 1); venue/booking costs (BDT) + spend summary.
- Neutral player wording; optional position; squad numbers removed; team form slimmed.
- Oswald heading font; bouncing-ball loading screen; global copy-disable.
- Granular route loading (skeletons); `staleTimes` caching; mobile "More" nav + Stats moved.
- Unified auth UI to `AuthView` (removed custom sign-in); forgot/reset "Back to sign in".
- Notification settings moved to Account settings; bell status (green/slashed) + auto-prompt.
- Notification tray icon = favicon "SG" + monochrome badge; icon `?v=` versioning, SW `ssm-v4`.
- Navbar bell/avatar equal sizing; DatePicker mobile popup + `inputReadOnly`; on-brand match hero.
