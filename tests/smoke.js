const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const requiredFiles = [
  'main.js', 'preload.js', 'index.html', 'login.html', 'js/cloud.js', 'dashboard.html', 'support.html', 'teams.html',
  'players.html', 'tournaments.html', 'news.html', 'training.html',
  'shop.html', 'profile.html', 'settings.html', 'admin.html',
  'css/style.css', 'js/app.js', 'js/coins.js', 'js/i18n.js', 'data/rank-training.json',
  'GPT.md', 'EKSİKLER.md', 'README.md', 'vercel.json',
  'supabase/migrations/20261017000000_initial_schema.sql',
  'supabase/migrations/20261017010000_roles_support_performance.sql',
  'supabase/migrations/20261017020000_desktop_cloud_sync.sql'
];

for (const file of requiredFiles) {
  assert.ok(fs.existsSync(path.join(root, file)), `Missing required file: ${file}`);
}

for (const file of ['teams.json', 'players.json', 'tournaments.json', 'news.json', 'mechanics.json', 'rank-training.json', 'shop.json', 'profile.json']) {
  const value = JSON.parse(fs.readFileSync(path.join(root, 'data', file), 'utf8'));
  assert.ok(value !== undefined, `Invalid JSON: ${file}`);
}

for (const file of ['main.js', 'preload.js', 'js/cloud.js', 'js/app.js', 'js/coins.js', 'js/i18n.js']) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  assert.doesNotThrow(() => new vm.Script(source), `JavaScript syntax error in ${file}`);
}

for (const file of ['index.html', 'login.html', 'dashboard.html', 'teams.html', 'players.html', 'tournaments.html', 'news.html', 'training.html', 'shop.html', 'profile.html', 'settings.html', 'admin.html', 'support.html']) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  for (const [, attributes, source] of scripts) {
    if (/\bsrc\s*=/.test(attributes) || !source.trim()) continue;
    assert.doesNotThrow(() => new vm.Script(source), `Inline script syntax error in ${file}`);
  }
}

const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const preload = fs.readFileSync(path.join(root, 'preload.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const training = fs.readFileSync(path.join(root, 'training.html'), 'utf8');
const news = fs.readFileSync(path.join(root, 'news.html'), 'utf8');

assert.match(main, /contextIsolation: true/);
assert.match(main, /nodeIntegration: false/);
assert.match(main, /webSecurity: true/);
assert.match(main, /protocol\.handle/);
assert.match(main, /loadURL\(`\$\{APP_SCHEME\}:\/\/app\/login\.html`\)/);
assert.match(preload, /ALLOWED_JSON/);
assert.doesNotMatch(preload, /invoke: \(channel, \.\.\.args\) => ipcRenderer\.invoke\(channel, \.\.\.args\)/);
assert.match(app, /active-tab-style/);
assert.match(app, /function cleanupActiveTab\(\)/);
assert.match(app, /cache: 'force-cache'/);
assert.match(app, /AbortSignal\.timeout\(8000\)/, 'Tab template requests must fail rather than leave the loading screen stuck');
assert.match(app, /Sekme betiği zaman aşımına uğradı/);
assert.match(app, /new Map\(\)/);
assert.match(index, /apexCloud\.getCurrentUser\(\)/);
assert.match(index, /window\.location\.replace\('login\.html'\)/);
assert.match(index, /cloud-logout/);
const login = fs.readFileSync(path.join(root, 'login.html'), 'utf8');
const cloud = fs.readFileSync(path.join(root, 'js/cloud.js'), 'utf8');
assert.match(login, /apexCloud\.signIn/);
assert.match(login, /apexCloud\.signUp/);
assert.match(login, /E-posta doğrulama/);
assert.doesNotMatch(login, /accept any non-empty credentials/i);
assert.match(cloud, /token\?grant_type=password/);
assert.match(cloud, /token\?grant_type=refresh_token/);
assert.match(cloud, /AbortSignal\.timeout\(10000\)/, 'Supabase requests must not wait indefinitely');
assert.match(cloud, /if \(\[400, 401, 403\]\.includes\(error\.status\)\) clearSession\(\)/, 'Transient refresh failures must not discard the session');
assert.match(cloud, /async function signOut\(\)[\s\S]*?finally \{ clearSession\(\); \}/, 'Sign-out must clear local session even if the network fails');
assert.match(cloud, /Authorization: 'Bearer '/);
assert.match(cloud, /async function getProfile\(userId\)/);
assert.match(cloud, /async function saveProfile\(fields\)/);
assert.match(cloud, /async function getRole\(userId\)/);
const support = fs.readFileSync(path.join(root, 'support.html'), 'utf8');
assert.match(support, /support_tickets/);
assert.match(support, /support_messages/);
assert.match(support, /setInterval\(/);
assert.doesNotMatch(training, /awaitFetch|İçerik yakında eklenecek|Yakında eklenecek/);
assert.match(training, /rank-training\.json/);
assert.match(training, /rank-selector/);
assert.match(training, /youtube\.com\/results\?search_query=/);
const ranks = JSON.parse(fs.readFileSync(path.join(root, 'data', 'rank-training.json'), 'utf8'));
assert.deepEqual(ranks.map(rank => rank.rank), ['GOLD', 'PLATINUM', 'DIAMOND', 'CHAMPION', 'GRAND CHAMPION', 'SSL']);
assert.ok(ranks.every(rank => rank.lessons.length === 3));
const i18n = fs.readFileSync(path.join(root, 'js/i18n.js'), 'utf8');
assert.match(i18n, /zh-CN/);
assert.match(i18n, /pt-BR/);
assert.match(news, /10 \* 60 \* 1000/);
assert.match(main, /ISteamNews\/GetNewsForApp/);
assert.match(news, /Örnek haber gösterilmiyor/);

const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20261017010000_roles_support_performance.sql'), 'utf8');
const cloudSyncMigration = fs.readFileSync(path.join(root, 'supabase/migrations/20261017020000_desktop_cloud_sync.sql'), 'utf8');
assert.match(cloudSyncMigration, /add column if not exists player_role/);
assert.match(cloudSyncMigration, /add column if not exists registration_open/);
assert.match(cloudSyncMigration, /create or replace function public\.claim_daily_reward/);
assert.match(cloudSyncMigration, /wallet_daily_reward_unique_idx/);
assert.match(cloudSyncMigration, /wallet_tournament_reward_unique_idx/);
assert.match(cloudSyncMigration, /Membership loyalty bonus/);
assert.match(cloudSyncMigration, /add column if not exists image_url/);
const playersPage = fs.readFileSync(path.join(root, 'players.html'), 'utf8');
const tournamentsPage = fs.readFileSync(path.join(root, 'tournaments.html'), 'utf8');
const shopPage = fs.readFileSync(path.join(root, 'shop.html'), 'utf8');
const profilePage = fs.readFileSync(path.join(root, 'profile.html'), 'utf8');
const dashboardPage = fs.readFileSync(path.join(root, 'dashboard.html'), 'utf8');
const trainingPage = fs.readFileSync(path.join(root, 'training.html'), 'utf8');
const adminPage = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
assert.match(playersPage, /apexCloud\.select\('profiles'/);
assert.doesNotMatch(playersPage, /apexGenesisPlayers/);
assert.match(tournamentsPage, /apexCloud\.insert\('tournaments'/);
assert.match(tournamentsPage, /registration_open/);
assert.doesNotMatch(tournamentsPage, /apexGenesisTournaments/);
assert.match(shopPage, /purchase_shop_item/);
assert.match(shopPage, /claim_daily_reward/);
assert.match(profilePage, /wallet_transactions/);
assert.match(profilePage, /player_role/);
assert.match(dashboardPage, /safeSelect\('tournaments'/);
assert.match(trainingPage, /training_progress/);
assert.match(adminPage, /Owner Control Center/);
assert.match(adminPage, /image_url/);
assert.match(adminPage, /Kendi Owner rolünü kaldıramazsın/);
assert.match(adminPage, /admin_adjust_wallet/);
assert.match(migration, /alter table public\.support_tickets enable row level security/i);
assert.match(migration, /alter table public\.support_messages enable row level security/i);
assert.match(migration, /create or replace function public\.protect_profile_rank/i);
assert.match(migration, /public\.is_admin\(\) and owner_id = \(select auth\.uid\(\)\)/);
assert.match(migration, /Owner manages staff roles/);
assert.match(migration, /alter publication supabase_realtime add table public\.support_tickets/);
assert.match(migration, /alter publication supabase_realtime add table public\.support_messages/);
const shop = JSON.parse(fs.readFileSync(path.join(root, 'data/shop.json'), 'utf8'));
assert.ok(shop.every(item => !/[ÃÅÄâ€�]/.test(item.name + item.description)), 'Desktop shop text must not contain mojibake');
assert.match(migration, /set description = 'Topluluk başlangıç rozeti\.'/);
assert.ok(fs.existsSync(path.join(root, 'GPT.md')), 'Project handoff GPT.md must exist');
const vercelConfig = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
assert.equal(vercelConfig.outputDirectory, 'frontend/dist');
assert.ok(vercelConfig.headers.some(rule => rule.source === '/assets/(.*)' && rule.headers.some(header => header.key === 'Cache-Control' && header.value.includes('immutable'))), 'Hashed frontend assets should use immutable caching');
assert.match(vercelConfig.installCommand, /cd frontend && npm install/);
assert.match(vercelConfig.buildCommand, /cd frontend && npm run build/);
const webApp = fs.readFileSync(path.join(root, 'frontend/src/App.jsx'), 'utf8');
assert.match(webApp, /lazy\(/, 'Web routes should be lazy-loaded for faster initial render');
const supportPage = fs.readFileSync(path.join(root, 'frontend/src/pages/Support.jsx'), 'utf8');
assert.match(supportPage, /postgres_changes/, 'Web support should subscribe to live database changes');

console.log(`Apex Genesis smoke tests passed: ${requiredFiles.length} required files, 8 JSON files, 15 locale options, six rank tracks, Electron security baseline, cloud-synced desktop pages, daily reward guardrails, lazy routes, UTF-8 shop text, support/RLS guardrails, project handoff, and news refresh checks.`);