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

- Database schema and RLS policies are in `supabase/migrations/20261017000000_initial_schema.sql`. This SQL must be run in the intended Supabase project before the web pages can use the tables.
- Local web environment values belong in `frontend/.env`; the file is ignored by Git. Only the Supabase project URL and publishable key belong in the client.
- Wallet transactions cannot be written directly by the browser. Shop purchases use a server-side Postgres function with balance and ownership checks.
- A web build passing does not mean that the SQL migration has been applied, email confirmation tested, admin role assigned, or website deployed.
- The React/Vite web companion is separate from the Electron desktop app; this update does not silently replace the desktop app's local data with cloud data.
- The official Rocket League news page returned HTTP 403 from this machine's network during validation. The desktop app tries rocketleague.com/news first and falls back to the official Rocket League Steam announcements API when blocked; the UI labels the fallback source. No sample news is fabricated.
- The web frontend has Vercel SPA rewrite configuration. To publish it, create/select a Vercel project with root directory `frontend`, configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, and set the final HTTPS URL in Supabase Auth settings.
- The old Express/SQLite prototype in `backend/` is not part of the online web stack and should not be deployed as-is.

The previous generated seed records for teams, players, tournaments, and news were removed from the active app to avoid presenting fabricated community information as real. They are preserved under `data/legacy-seed-backup/` in the development project and are excluded from the installer.

## Validation

Run `npm test` to check required files, JSON validity, JavaScript syntax, Electron security settings, tab loading structure, and regression checks for the old fake login and training placeholder.

The installer is not code-signed. Windows SmartScreen may display a warning until the publisher signs the executable with a trusted code-signing certificate.

[executed on device: WIN-JS1MMJ6G3LN (47b38491-93fe-4329-b37c-d57703e8bb81)]