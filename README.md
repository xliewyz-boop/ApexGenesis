# Apex Genesis Desktop

Apex Genesis is a Windows desktop companion for the Rocket League community, built with Electron and a dark, esports-focused interface.

## Run in development

Requirements: Node.js 20+ and npm.

```powershell
npm install
npm test
npm start
```

## Build the Windows installer

```powershell
npm run dist
```

The NSIS installer is written to `release/ApexGenesis-Setup-1.2.0-x64.exe`. The unpacked application is written to `release/win-unpacked/`.

## Current functionality

- Custom Electron protocol for local HTML, CSS, scripts, images, and JSON resources.
- Context-isolated renderer with Node integration disabled and external links opened in the system browser.
- Local player profile with editable name, bio, avatar URL, and team selection.
- Local team directory with create, search, and delete.
- Local player directory with create, search, and delete.
- Local tournament planner with create, filtering, local participation records, and delete.
- Genesis Coin local wallet, transaction history, virtual shop, and inventory.
- Local community announcements with add/delete and safe text rendering.
- Training Academy with six rank tracks (Gold, Platinum, Diamond, Champion, Grand Champion, SSL), 18 rank-specific practice modules, detailed steps, common mistakes, durations, and curated YouTube search links (avoids embedding unverified video IDs).
- Language selector for 15 locales: Turkish, English, Spanish, French, German, Brazilian Portuguese, Italian, Russian, Polish, Dutch, Japanese, Korean, Simplified Chinese, Arabic, and Hindi. Core navigation and selected interface labels are translated; some user-generated and long-form training text remains in its original language.
- Rocket League news refreshes every 10 minutes. The app tries rocketleague.com/news first; if the official site returns HTTP 403 on the current network, it falls back to the official Rocket League Steam announcements feed and clearly labels that source.
- Theme color and animation preferences.
- Automated smoke checks and Windows installer build configuration.

## Online web companion status

The React/Vite web companion in `frontend/` is now wired to Supabase Auth and Postgres for sign-in, profiles, community posts, follows, teams, tournament registration, announcements, rank-training progress, and the virtual shop.

- Database schema and Row Level Security policies from `supabase/migrations/20261017000000_initial_schema.sql` have been applied to the configured Supabase project and the expected PostgREST tables returned HTTP 200 during verification.
- The public web companion is deployed at https://apex-genesis-web.vercel.app. Its root and SPA routes (`/login`, `/signup`) and built JS/CSS assets returned HTTP 200.
- Supabase Auth allows sign-ups and has email confirmation enabled. The Site URL and redirect allowlist include the production Vercel domain; an actual new-user email confirmation still needs an end-to-end human mailbox test.
- Local web environment values belong in `frontend/.env`; the file is ignored by Git. Only the Supabase project URL and publishable key belong in the client.
- Wallet transactions cannot be written directly by the browser. Shop purchases use a server-side Postgres function with balance and ownership checks.
- The Electron desktop app now uses the same Supabase email/password account system and synchronizes the basic profile (username, bio, avatar, rank) with the web companion. Its teams, player directory, tournaments, local Genesis Coin wallet, inventory, and local admin/news features have not all been migrated to cloud storage; they remain local features for now.
- The web admin panel uses a server-side admin role and RLS. No admin role has been assigned because no owner account has yet been verified/selected; grant it only after creating and confirming the intended account.
- Vercel production deployment is a verified file-based snapshot. Automatic GitHub-to-Vercel deployments could not be linked because the Vercel connector returned a scope authorization error; future code changes need another deployment until that connection is repaired.
- The official Rocket League news page returned HTTP 403 from this machine's network during validation. The desktop app tries rocketleague.com/news first and falls back to the official Rocket League Steam announcements API when blocked; the UI labels the fallback source. No sample news is fabricated.
- The old Express/SQLite prototype in `backend/` is not part of the online web stack and should not be deployed as-is.

The previous generated seed records for teams, players, tournaments, and news were removed from the active app to avoid presenting fabricated community information as real. They are preserved under `data/legacy-seed-backup/` in the development project and are excluded from the installer.

## Validation

Run `npm test` to check required files, JSON validity, JavaScript syntax, Electron security settings, tab loading structure, and regression checks for the old fake login and training placeholder.

The installer is not code-signed. Windows SmartScreen may display a warning until the publisher signs the executable with a trusted code-signing certificate.
