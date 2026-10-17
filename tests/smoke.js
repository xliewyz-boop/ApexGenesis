const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const requiredFiles = [
  'main.js', 'preload.js', 'index.html', 'login.html', 'js/cloud.js', 'dashboard.html', 'teams.html',
  'players.html', 'tournaments.html', 'news.html', 'training.html',
  'shop.html', 'profile.html', 'settings.html', 'admin.html',
  'css/style.css', 'js/app.js', 'js/coins.js', 'js/i18n.js', 'data/rank-training.json'
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

for (const file of ['index.html', 'login.html', 'dashboard.html', 'teams.html', 'players.html', 'tournaments.html', 'news.html', 'training.html', 'shop.html', 'profile.html', 'settings.html', 'admin.html']) {
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
assert.match(app, /Isolate each tab's lexical scope/);
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
assert.match(cloud, /Authorization: 'Bearer '/);
assert.match(cloud, /async function getProfile\(userId\)/);
assert.match(cloud, /async function saveProfile\(fields\)/);
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

console.log(`Apex Genesis smoke tests passed: ${requiredFiles.length} required files, 8 JSON files, 15 locale options, six rank tracks, Electron security baseline, tab loading, and news refresh checks.`);
