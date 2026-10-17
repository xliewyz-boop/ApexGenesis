# GPT.md — Apex Genesis Project Handoff

## Project purpose
Apex Genesis is a Rocket League community platform with two clients: a Windows Electron desktop app and a React/Vite web companion. They share Supabase Auth and selected Postgres data; some legacy desktop features remain local-only.

## Repository map
- Electron root: `main.js`, `preload.js`, `index.html`, feature HTML pages, `css/`, `js/`, `data/`.
- Web: `frontend/src` (React 19, React Router, Vite, Tailwind CSS, Supabase JS).
- SQL: `supabase/migrations/20261017000000_initial_schema.sql`, `supabase/migrations/20261017010000_roles_support_performance.sql`, and `supabase/migrations/20261017020000_desktop_cloud_sync.sql` (all applied).
- Tests: `tests/smoke.js`; root command `npm test`.
- Missing-work checklist and truthful limitations: `EKSİKLER.md`.
- Build web: `cd frontend && npm run build && npm run lint`.
- Build Windows installer: `npm run dist`.

## Authentication and keys
- Project URL is configured in `frontend/.env` (ignored by Git); the publishable key is public client config, not a secret.
- Never commit `frontend/.env`, access/refresh tokens, OAuth client secrets, service-role keys, or `sb_secret_...` keys.
- Electron `js/cloud.js` is a small REST/Auth wrapper that stores a refreshable session in localStorage. It uses only the publishable key plus the logged-in user's access token.
- Electron protocol is `apex://app/`; renderer uses `contextIsolation: true`, `nodeIntegration: false`, and a constrained preload bridge.

## Database / migration status
All three SQL migration files listed above have been applied to the configured Supabase project.
- 15 application tables have RLS enabled.
- `support_tickets` and `support_messages` exist and are included in `supabase_realtime`.
- The shop seed description for Apex Genesis Badge is corrected to UTF-8 Turkish: “Topluluk başlangıç rozeti.”
- Profile columns `player_role` and `region`, tournament `registration_open`, and the `claim_daily_reward()` RPC exist in production.
- Desktop players/profile, tournaments/registrations, cloud wallet/shop/inventory, dashboard metrics, and training progress use Supabase instead of per-device localStorage.
- Wallet rewards are server-side: daily +10 GC, +2 GC/day membership loyalty, and +50 GC once per tournament registration. Admin/Owner can adjust a wallet with a required reason; database constraints prevent duplicate daily/tournament rewards.
- A confirmed project owner account has been granted `user_roles.role='owner'`.
- RLS/policy verification query confirmed support table RLS and publication membership. Do not assume an interactive ticket exchange has been end-to-end tested until tested from Member and staff accounts.

## Role model
- Member: default if there is no row in `user_roles`.
- Admin: can verify rank, create teams, publish announcements, administer shop/tournaments/wallet, and work the support queue.
- Owner: all Admin permissions plus staff role assignment/revocation.
- Legacy `moderator` role is treated as staff for compatibility.
- `public.is_admin()` means owner/admin/moderator; `public.is_owner()` is Owner-only.
- `profiles.rocket_league_rank` is protected by a trigger; members cannot self-assign ranks.
- Team INSERT policy requires `public.is_admin()`; member join/leave policies remain separate.
- Owner-only `user_roles` policy prevents Admins from promoting users.
- The UI is not a security boundary; all authorization must remain in RLS/functions/triggers.

## Support workflow
- Member creates `support_tickets` and first `support_messages` row.
- Member can read/reply only to tickets they own.
- Admin/Owner can see the support queue, update status/assignment, and send staff messages.
- Web client subscribes to Supabase Realtime with a periodic refresh fallback.
- Electron support page polls every seven seconds and registers `window.apexTabCleanup` to stop polling on navigation.
- `rank_verification` tickets should be reviewed manually before staff changes the rank.

## Performance and UI
- Electron `js/app.js` caches tab HTML promises, ignores stale loads, removes active tab styles, and cleans tab-specific intervals/observers. Tab HTML fetches time out after 8 seconds and external tab scripts after 8 seconds, so a broken resource displays a retryable error instead of leaving the loading state indefinitely.
- Supabase Auth/REST fetches in the Electron bridge time out after 10 seconds. Transient refresh failures preserve the stored session; sign-out clears the local session even if refreshing or the logout request fails.
- News fetch is cached for ten minutes and returns at most the ten newest source entries. It tries rocketleague.com/news then official Steam announcements on failure; images are extracted when available.
- Web routes use React.lazy/Suspense. Last measured main JS chunk was ~482 KB minified/~140 KB gzip, with separate lazy page chunks. Root `vercel.json` applies one-year immutable caching to hashed `/assets/*` files; HTML remains revalidated by default.
- Scroll reveal is limited to content-heavy pages and respects `prefers-reduced-motion`. Electron settings can disable animations.
- Text files should be UTF-8. Fix the source, not rendered output, if replacement/mojibake characters appear.

## Deployment status and caveats
- Production URL: `https://apex-genesis-web.vercel.app`.
- Production deployment: the latest Git-triggered Vercel production deployment from GitHub `main` reached READY after the source/migration push. The connected production alias is `https://apex-genesis-web.vercel.app`.
- Production HTTP checks passed after deployment: `/`, `/login`, `/signup`, `/support`, `/admin`, main JS, and CSS all returned HTTP 200. The rewrite is provided by the repository's root `vercel.json`.
- Build/lint last passed: web build succeeded; oxlint had 25 warnings (React hook/effect/exhaustive-deps), zero errors.
- Root `vercel.json` builds `frontend/`, publishes `frontend/dist`, and rewrites SPA routes. Vercel Git deployments automatically rebuild on pushes to `main`; deployment IDs change with every push, so inspect the Vercel project for the current ID.
- Local `vercel whoami` reports Logged out; deployment used the connected Vercel integration. No local CLI login is assumed.
- HTTP smoke checks do not prove all authenticated workflows. Still test signup/email confirmation, profile updates, Member rank denial, Member team-creation denial, Owner role management, and real-time ticket exchange with separate Member/staff accounts.
- A production HTTP 200 is not proof of all workflows. Test signup/email confirmation, profile updates, rank denial for Member, team creation denial for Member, Owner role management, ticket messaging, and support status changes.
- The old Express/SQLite prototype in `backend/` is not the production web stack and should not be deployed as-is.
- Display preferences, notification settings, and older local announcement drafts remain device-local by design; published announcements and cloud wallet are authoritative. Some legacy local profile/cache values remain but must not be used as authorization or the source of truth.

## Security notes
- Never expose service-role credentials to client apps.
- Don't use user metadata as authorization. Read `user_roles` and rely on database RLS.
- Don't render untrusted content with `innerHTML`; use `textContent` or React text interpolation.
- Avoid changing production role assignments without confirming the target account.