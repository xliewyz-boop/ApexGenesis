# Apex Genesis

Apex Genesis is a Rocket League community platform with a Windows Electron desktop app and a React/Vite web companion. Both clients use the same Supabase authentication project; selected features share cloud data.

## Run and test locally

Requirements: Node.js 20+ and npm.

```powershell
npm install
npm test
npm start
```

Web companion:

```powershell
cd frontend
npm install
npm run build
npm run lint
npm run dev
```

Build the Windows installer with `npm run dist`. The installer is written to `release/` and is not code-signed; Windows SmartScreen may warn until a trusted publisher certificate is used.

## Desktop app

- Electron custom `apex://app/` protocol, context isolation, Node integration disabled, constrained preload bridge.
- Supabase email/password login, persistent refreshable session, logout, and cloud profile sync.
- Cloud-backed team directory: members may join/leave public teams; only Admin/Owner may create teams, enforced in both UI and RLS.
- Support center with tickets, replies, status changes for staff, and seven-second polling in Electron; polling/subscriptions are cleaned up on tab changes.
- Staff tools for rank verification, cloud announcements with optional images, and Owner-only staff role management.
- Rocket League official news, top 10 entries, article/image extraction where provided by the source, 10-minute refresh/cache; falls back to the official Steam announcements feed when rocketleague.com is blocked.
- Six training rank tracks (Gold, Platinum, Diamond, Champion, Grand Champion, SSL), 18 practice modules, and curated YouTube search links.
- Fifteen locale choices remain in the app. Core navigation/shop text has been repaired to UTF-8; some older long-form locale content may still need editorial review.
- Static tab HTML is cached in memory, stale tab loads are ignored, tab-specific timers are cleaned up, and scroll reveals are limited to content-heavy sections. Reduced-motion settings are respected.

Some legacy desktop features are still local-only: player directory, tournament planner, Genesis Coin wallet, and parts of the inventory/local announcement archive. They are not yet cross-device synced. The React web shop uses the secured server-side purchase function and online ledger.

## Web companion

The React 19/Vite application lives in `frontend/`. It uses Supabase Auth and Postgres for profiles, posts, follows, teams, tournament registration, announcements, training progress, shop inventory/wallet, and support.

- Lazy route imports split page code into separate chunks. The production main chunk is about 482 KB minified (about 140 KB gzip); page bundles are loaded when needed.
- `frontend/.env` is ignored by Git. The browser uses only `VITE_SUPABASE_URL` and the public publishable key. Never add a service-role or `sb_secret_...` key to client code.
- The production site is `https://apex-genesis-web.vercel.app`. Pushing commit `2c38181` triggered a READY production deployment, but inspection showed Vercel was serving the root Electron `index.html` instead of the React frontend. Root `vercel.json` now explicitly installs/builds `frontend/`, publishes `frontend/dist`, and rewrites SPA routes; the corrected production deployment is now verified and live. Direct Vercel API deployment calls returned 403 for scope `xliew` and the local CLI is logged out, but the Git push deployment path is working.

## Supabase and permissions

The initial schema is `supabase/migrations/20261017000000_initial_schema.sql`. The permissions/support migration is `supabase/migrations/20261017010000_roles_support_performance.sql`; both have been applied to the configured Supabase project.

Verified after the second migration:
- All 15 application tables have Row Level Security enabled.
- Support tables `support_tickets` and `support_messages` exist and are included in the `supabase_realtime` publication.
- The shop's seeded badge description now reads “Topluluk başlangıç rozeti.”
- The confirmed project owner account has the `owner` role.

Role model:
- **Member**: default when no row exists in `user_roles`; regular features and own support tickets.
- **Admin**: rank verification, announcements, team creation, support queue, tournaments/shop/wallet administration.
- **Owner**: all Admin capabilities plus staff role assignment/revocation.
- Legacy `moderator` rows are treated as staff for compatibility.
- Rank changes are blocked server-side for members; team creation and staff role changes are protected by RLS. UI hiding is not considered a security boundary.

The support queue uses Supabase Realtime in the web client, with periodic refresh as a fallback. Electron uses seven-second polling and cleans up its interval on navigation.

## News source behavior

The app attempts the official Rocket League news site first. Some networks receive HTTP 403; in that case the app uses the official Rocket League Steam announcements API. It shows the source label and does not fabricate sample stories. Images are extracted when available in article/announcement markup; a source that supplies no image may still produce a text-only card.

## Validation

- Root smoke tests: `npm test`.
- Syntax checks: `node --check main.js`, `node --check js/cloud.js`, `node --check js/app.js`.
- Web: `cd frontend && npm run build && npm run lint`. The current linter reports React hook/effect warnings but zero errors.
- Run the production HTTP smoke check after each Vercel deployment. A successful build or HTTP 200 does not by itself prove every interactive workflow; test signup, email confirmation, ticket exchange, rank restrictions, and team creation using Member/Admin/Owner accounts.

## Project handoff

Read `GPT.md` before making changes. It contains the architecture map, roles, migration state, validation steps, and remaining caveats. Keep that document current whenever behavior or deployment state changes.
