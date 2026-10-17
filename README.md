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

## Important deployment status

This build is a **local desktop release**, not yet a multi-user online platform.

- Profiles, team/player/tournament records, Genesis Coin, inventory, and announcements are stored in this installation's browser storage.
- The admin screen is a local management screen; it is not protected by server-side administrator roles.
- The official Rocket League news page returned HTTP 403 from this machine's network during validation. The app tries rocketleague.com/news first and falls back to the official Rocket League Steam announcements API when blocked; the UI labels the fallback source. No sample news is fabricated.
- The React/Vite prototype and Express/SQLite prototype in `frontend/` and `backend/` are not included in the Windows installer. They have not been integrated into a production cloud backend.
- Cross-device accounts, verified email, online synchronization, real-time tournaments, server-enforced roles, remote economy transactions, automated news synchronization, and public hosting require a deployed backend and owner-controlled hosting credentials. Do not market those features as operational until they are configured and tested.

The previous generated seed records for teams, players, tournaments, and news were removed from the active app to avoid presenting fabricated community information as real. They are preserved under `data/legacy-seed-backup/` in the development project and are excluded from the installer.

## Validation

Run `npm test` to check required files, JSON validity, JavaScript syntax, Electron security settings, tab loading structure, and regression checks for the old fake login and training placeholder.

The installer is not code-signed. Windows SmartScreen may display a warning until the publisher signs the executable with a trusted code-signing certificate.
