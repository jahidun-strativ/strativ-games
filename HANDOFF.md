# Strativ Games — Project Handoff

> Living doc for picking up work in a new session. Update the **Open items** and
> **Recent changes** sections at the end of any substantial task.

_Last updated: 2026-07-12_

## What this is
A sports team manager for Strativ: sports, teams, players, staff, venues,
matches/fixtures, stats/standings, formation & lineup builder (team default +
per-match), team captains, per-match squads with guests, RSVP/availability,
booking costs + cost split, match-day posters, public result pages. Auth-gated,
role-based (admin / member / per-team captain), installable PWA with push
notifications. Dark "stadium night" theme with athletic (Oswald) headings.

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
  `requireAdmin()`, plus captain-scoped: `getCurrentPlayer()`, `isCaptainOf(teamId)`,
  `canManageTeam(teamId)` (admin || captain), `requireTeamManager(teamId)` (roster),
  `requireCaptainOf(teamId)` (match line-ups/squads — admins NOT allowed). Deduped per
  request via React `cache()`.
- **Public (no-auth) surfaces**, bypassed in `proxy.ts`: `*/poster` images and
  `/result/[id]` — unlisted by UUID, not access-controlled. Everything else is gated.
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
  auto-admin if none). `/members` (admin-only) = role management. Promoting member →
  admin sends that user a push ("You're now an admin 🛡️", `setUserRole` in
  `server/actions/members.ts`) — only on the transition, never on re-save; best-effort.
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
  **Delete guard:** `deletePlayer` refuses while the player is on a team (release first);
  the player page swaps the delete button for guidance + a team link when assigned.
  ⚠️ Deleting a **login-linked** player doesn't stick anyway — `ensurePlayerForUser`
  recreates it on their next visit; use status `inactive` for real members instead.
  `ConfirmDelete` (`ui/confirm-delete.tsx`) catches action errors and shows them as a
  toast (reuses `isNextControlFlow` so redirects still bubble) — benefits all deletes.
- **Teams:** slimmed create form (name + sport; league only for opponents; formation/
  stadium/squad-number removed). `formation`/`stadium` columns dormant.
- **Stats:** player leaderboards; internal-league standings + competitive record.
  Dashboard monthly top-scorer/assist race.
- **Formation builder:** 5–11 players, per-size formations, subs. Fresh teams default to
  **6-a-side (2-2-1)** (`DEFAULT_FORMATION`). Picker is a bottom-sheet Drawer on mobile.
  `PitchBuilder` is now generic — takes an `onSave(formation, squadSize, slots)` prop
  instead of hard-wiring `saveLineup`, so it serves both the team default lineup and
  per-match lineups.
- **Team captains (per-team role):** `teams.captainId` → a player on the team; that
  player's linked login gets captain powers. **Admin-assigned** via a `CaptainPicker`
  (`captain-picker.tsx`) on the team page; a 🧢 C badge marks them in the roster. Auth
  helpers in `server/auth.ts`: `getCurrentPlayer()`, `isCaptainOf(teamId)`,
  `canManageTeam(teamId)` (admin || captain), `requireTeamManager(teamId)`. Captains can:
  **(1)** manage their team's **roster** — add existing free agents / remove players
  (`assignPlayerToTeam`/`removePlayerFromTeam` now use `requireTeamManager`; creating a
  brand-new player stays admin-only via `AddPlayerButton canCreate`), and **(2)** set
  **per-match lineups**. Setting the captain notifies them (push). Releasing the captain
  from the team clears `captainId`. The team **default** lineup stays admin-only.
- **Per-match lineups (CAPTAIN-ONLY):** `match_lineups` + `match_lineup_slots` tables (one per
  match×team, own formation + slots). Builder at `/matches/[id]/lineup/[teamId]`
  (reuses `PitchBuilder`; prefills from the team default when the match has none yet).
  Match page shows a **"Your match line-up"** section with a "🧢 Set … lineup" link **only for
  the team(s) the viewer captains** (team A's captain never sees B's button; admins who aren't
  a captain see none). Save action `saveMatchLineup` (`server/actions/lineups.ts`)
  is gated by **`requireCaptainOf`** — **admins cannot edit match line-ups/squads**; they only
  assign the captain. (`requireCaptainOf` passes if the admin *is* the captain.) UI edit-gating
  uses `isCaptainOf`, not `canManageTeam`. `PitchBuilder` read-only banner text is set via its
  `editorLabel` prop (team default = "an admin", per-match = "the team captain"). Migration:
  `scripts/migrations/002-captain-and-match-lineups.sql` (applied).
- **Per-match squads (team is unique per match):** `match_squad_players` (matchId, teamId,
  playerId; migration `003`). Who's fielded for a team **in one match**, independent of the
  roster (`players.teamId`) and the default lineup. **No rows for a (match,team) = use the
  live roster**; the first add/remove **materialises** the roster into rows, so each match
  becomes its own snapshot (`server/actions/squads.ts` → `materialize`). Effective squad via
  `server/queries/match-squad.ts` `getEffectiveSquad(matchId, teamId)` → `{ players, customized }`.
  Actions `addMatchSquadPlayer`/`removeMatchSquadPlayer` (**captain-only**, `requireCaptainOf`):
  add a **guest**
  (free agent OR borrowed from another team, same sport) **without** changing their `teamId`;
  removing also clears them from that match's lineup slots. Edge cases handled: can't add a
  player already in the opponent's squad for that match; sport must match; player delete /
  match delete cascade the squad rows. Managed via `MatchSquadManager` (👥 button on the
  match-lineup page). The **match-lineup pitch builder**, the **match poster** player lists,
  and the **result form** (stat candidates) all read the effective squad, so guests appear
  everywhere for that match. Team roster page + team default lineup are untouched.
- **PWA + push:** manifest (`src/app/manifest.ts`), SW `public/sw.js` (cache `ssm-v4`).
  Send helpers in `src/lib/push.ts`: `sendPushToAll`, **`sendPushToUser(userId, …)`**
  (all of one user's devices; used for admin-promotion + captain-appointment pushes),
  `sendPushToEndpoint`; all prune stale (404/410) subscriptions.
  Notifies on: **create (match + session/slot)**, time/venue change, reschedule, cancel
  — gated by `notify_on_create` — plus **full-time result** (see Public result page),
  **admin promotion**, and **captain appointment**. **Manual force-send** "📣 Send notification" button on
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
  **App shell is viewport-pinned** (`(app)/layout.tsx`: `h-screen overflow-hidden`; only
  the content column scrolls, sidebar has its own `overflow-y-auto`) — a plain `sticky`
  sidebar broke because an ancestor's `overflow-x-hidden` made it the scroll container.
  **PlayersTable** (`tables/players-table.tsx`) is responsive: desktop = antd table with
  initials-avatar chips, white names (orange on hover only), position chips; mobile =
  stacked card list (no horizontal scroll). `RosterTable` shows a 🧢 C captain badge.
- **Icons:** favicon "SG" monogram `src/app/icon.svg`; wordmark PWA icons + notification
  tray icon (`notification-192.png`, from favicon) + monochrome badge (`badge-96.png`,
  white "SG"), all via `scripts/gen-icons.mjs`, URLs versioned `?v=3`.
- **Match-day posters (share pictures):** "🖼️ Generate picture" dropdown on match +
  session pages (`src/components/poster-button.tsx`). Branded 1080×1350 PNGs via
  **`next/og` `ImageResponse`** — render code in `src/server/poster/` (`poster.tsx` =
  Satori-safe JSX, flexbox-only; `fonts.ts` fetches Oswald+Archivo from Google Fonts at
  request time, module-cached, graceful fallback; `respond.tsx` = shared builder,
  `?download=1` forces a file download). Routes: `/matches/[id]/poster` and
  `/sessions/[id]/poster` (`route.tsx`, `runtime=nodejs`, `force-dynamic`, **no auth** — see
  below). Match poster player lists come from the **per-match squad** (`getEffectiveSquad`),
  so guests appear. ⚠️ `fonts.ts` resolves TTF URLs via the Google Fonts **CSS API with a
  very old User-Agent** (`Mozilla/4.0`) — hard-coded gstatic URLs rot when Google bumps font
  versions; each face loads independently so one failure only drops that weight.
  Three `?variant=`s: **`full`** (all teams + full player
  lists — internal games & round-robins; session route de-dups teams across fixtures),
  **`vs`** (bold "A vs B" hero) and **`squad`** (one Strativ team sheet). Competitive games
  default to offering `vs` + `squad`; internal → `full`. **Player lists show names only —
  no status/substitute labels** (deliberate, so nobody feels benched). The **"Generate
  picture" button is admin-only** (UI), but the resulting **poster image URLs are PUBLIC
  share links** — no auth, so they open for people outside the app. `proxy.ts` bypasses
  any path ending in `/poster`, and the route handlers no longer check `isAdmin`. Links are
  unlisted (unguessable match/session UUID), not access-controlled.
- **Cost split / settle-up:** `session_payments` (sessionId, playerId, paid, paidAt; migration
  `005`). On the **session page**, a "Cost split" card divides `session.cost` equally among the
  payers and tracks who's settled — total / per-head / collected / outstanding, plus a "You owe
  ৳X" / "settled" line for the signed-in user. Actions in `server/actions/payments.ts`
  (**admin-only**): `addSessionPayer`, `removeSessionPayer`, `setPaymentPaid`, and
  `fillSessionPayersFromTeams` (seed from the internal teams' rosters). Shown only when
  `session.cost != null`; if `paidBy === "office"` it just says the office covered it. Component
  `cost-split.tsx` (read-only for non-admins). Per-head = round(cost / payers).
- **Costs dashboard:** `/costs` (in nav for everyone, "The books"). Tiles: total / office /
  we-paid / **outstanding**, this-month total (Dhaka-time month buckets), a **"To settle"**
  list (self-paid slots with uncollected money — per-head, unpaid names, links to the slot;
  a costed self-paid slot with **no payers yet counts as fully outstanding**), and an
  aggregated **"Who owes"** list (per-head × unpaid rows summed per player). Includes legacy
  standalone-match costs in totals. Needs the `sessions.payments` many-relation (added).
- **Match availability / RSVP:** `match_availability` (matchId, playerId, status `in|maybe|out`;
  migration `004`). Any signed-in user with a player sets their own RSVP via `setMyAvailability`
  (`server/actions/availability.ts`) — an optimistic pill toggle (`availability-control.tsx`) on
  the match page. The match page shows a per-team **In/Maybe/Out + No-reply** summary and a
  "Guests available" list (free agents who said in). Captain shortcut on the match-lineup page:
  **"➕ Add players who are in"** (`fill-squad-button.tsx` → `fillSquadFromAvailability` in
  `squads.ts`) bulk-adds every "in" player on the team to the per-match squad. The match-created
  push already deep-links to `/matches/[id]`, so tapping it lands on the RSVP control.
  **Opt-out model:** `seedDefaultAvailability` (`server/seed-availability.ts`) defaults every
  player on a match's teams to **"in"** — seeded on slot booking (`createSession`), match
  create/team assignment (`createMatch`/`updateMatch`), joining a team (`assignPlayerToTeam`,
  upcoming scheduled matches only), and being added to a match squad. Always
  `onConflictDoNothing`, so an explicit response is never overwritten; players tap Out/Maybe.
- **Public result page + full-time push:** `/result/[id]` (`src/app/result/[id]/page.tsx`) is a
  **public** page (outside `(app)`, bypassed in `proxy.ts` alongside `/poster`) showing the
  score + goals/assists grouped by side (via `getEffectiveSquad`). When `recordResult` completes
  a match **for the first time** (prev status ≠ completed), it fires `notifyMatchResult` →
  `sendPushToAll` ("🏁 Full-time — A 2–1 B") linking to `/result/[id]`, so tapping the push
  opens the result **without signing in** (SW opens `data.url`). Editing an already-completed
  result does not re-notify. Admins get a "🔗 Public result page" link on the match page once
  completed. Best-effort: push failure never fails the result save.
  **Fixing ended-match data:** "Edit result" (same form, prefilled) for score/stats — untick
  played + zero the numbers to delete a stat row. **"↩️ Reopen match"** (Admin card, completed
  only; `reopenMatch` in `matches.ts` + `reopen-match-button.tsx`) silently sets status back to
  `scheduled` — dropdown choice keeps or wipes score+stats. Unlike **reschedule** (which also
  re-opens but pushes "rescheduled" to everyone), reopen sends nothing; re-completing later
  fires the full-time push again (corrected final = new announcement).
- **Opponents need no roster:** competitive "Book a slot" now takes a free-text
  **"…or new opponent by name"** field (`session-form.tsx`) alongside the opponent Select;
  `createSession` (competitive branch) creates a name-only `external` team on the fly when
  no `opponentId` is picked. So you can log a game vs an opponent you only know by name.

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
   `players.squad_number` (kept for non-destructive removal). Applied migrations:
   `001` sessions+costs, `002` captains+match lineups, `003` match squads,
   `004` availability/RSVP, `005` session payments (all in `scripts/migrations/`).
6. **All recent work is uncommitted** (captains, match lineups/squads, RSVP, cost split,
   public result page, poster/public-link changes, HANDOFF updates) — commit before
   further work.
7. **Nice-to-haves discussed, not built:** uneven/custom cost-split amounts; RSVP "in"
   count seeding the cost split; leaderboard as a public share page; MOTM voting;
   auto-balanced teams; admin read-only view of both teams' match line-ups.

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
- "↩️ Reopen match" admin action (silent revert to scheduled, keep/clear result).
- Opt-out RSVP: players default to "in" when their team is scheduled (seed-availability.ts).
- Player emails shown in the players list (under the name / mobile card line).
- Costs dashboard `/costs` (totals, to-settle, who-owes) + nav entry.
- Cost split / settle-up on session pages (`session_payments`, migration 005).
- Match availability / RSVP (in/maybe/out) + captain "add players who are in" (migration 004).
- Result page redesigned (crests, winner-gold score, goal/assist chips).
- Public result page `/result/[id]` + one-time full-time push (test push delivered 2/2).
- Poster + result links made **public** (proxy bypass); poster font loader fixed (CSS-API
  TTF resolution — old gstatic URLs had rotted to 404).
- Match-page lineup buttons: only the team(s) you captain (no more View/Set pair).
- Match line-ups + match squads made **captain-only** (`requireCaptainOf`); admins assign captains.
- Per-match squads w/ guests (`match_squad_players`, migration 003) feeding lineup/poster/result form.
- Team captains (`teams.captainId`, migration 002) + per-match lineups (`match_lineups`).
- Player delete guard (blocked while on a team); `ConfirmDelete` error toasts.
- Admin-promotion push (`sendPushToUser`); captain-appointment push.
- PlayersTable responsive redesign (avatars / mobile cards); viewport-pinned sidebar.
- Match-day posters (next/og, 3 variants, IG/FB 4:5); opponent-by-name in Book a slot.
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
