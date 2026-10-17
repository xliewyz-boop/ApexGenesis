const { app, BrowserWindow, protocol, shell, ipcMain } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

const APP_SCHEME = 'apex';
const APP_ROOT = __dirname;
let officialNewsCache = null;
const NEWS_CACHE_TTL_MS = 10 * 60 * 1000;
const cacheRoot = process.env.LOCALAPPDATA || path.join(app.getPath('appData'), '..', 'Local');
const cacheDirectory = path.join(cacheRoot, 'ApexGenesis', 'Cache');
app.setPath('cache', cacheDirectory);
app.setAppUserModelId('com.apexgenesis.desktop');
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

protocol.registerSchemesAsPrivileged([{
  scheme: APP_SCHEME,
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true }
}]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#0a0a0a',
    show: false,
    autoHideMenuBar: true,
    title: 'Apex Genesis',
    webPreferences: {
      preload: path.join(APP_ROOT, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`${APP_SCHEME}://app/`)) event.preventDefault();
  });
  win.webContents.on('did-fail-load', (_event, code, description, url) => {
    if (code !== -3) console.error('Renderer navigation failed:', code, description, url);
  });
  if (process.env.APEX_DEBUG === '1') {
    win.webContents.on('console-message', (...args) => {
      const details = args[1];
      if (details && typeof details === 'object') {
        if (Number(details.level) >= 2) console.error('Renderer console error:', details.message, details.sourceId, details.lineNumber);
      } else if (Number(args[1]) >= 2) {
        console.error('Renderer console error:', args[2], args[4], args[3]);
      }
    });
  }
  win.loadURL(`${APP_SCHEME}://app/login.html`);
}

app.whenReady().then(async () => {
  await fs.mkdir(cacheDirectory, { recursive: true });
  const allowedJsonFiles = new Set([
    'teams.json', 'players.json', 'tournaments.json',
    'news.json', 'mechanics.json', 'rank-training.json', 'shop.json', 'profile.json'
  ]);
  ipcMain.handle('apex:load-json', async (event, filename) => {
    const senderUrl = event.senderFrame?.url || '';
    if (!senderUrl.startsWith(`${APP_SCHEME}://app/`)) throw new Error('Unauthorized data request');
    if (typeof filename !== 'string' || !allowedJsonFiles.has(filename)) throw new Error('Unsupported data file');
    const contents = await fs.readFile(path.join(APP_ROOT, 'data', filename), 'utf8');
    return JSON.parse(contents);
  });

  ipcMain.handle('apex:fetch-official-news', async (event) => {
    const senderUrl = event.senderFrame?.url || '';
    if (!senderUrl.startsWith(`${APP_SCHEME}://app/`)) throw new Error('Unauthorized news request');
    if (officialNewsCache && Date.now() - officialNewsCache.cachedAt < NEWS_CACHE_TTL_MS) return officialNewsCache.result;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/155.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    };
    // Prefer the requested official Rocket League news page. Some networks block it with HTTP 403;
    // in that case use Psyonix/Valve's official Rocket League Steam news feed and identify the source.
    try {
      const page = await fetch('https://www.rocketleague.com/news', { headers, signal: AbortSignal.timeout(12000) });
      if (page.ok) {
        const html = (await page.text()).slice(0, 4000000);
        const matches = [...html.matchAll(/<a[^>]+href=["'](https:\/\/www\.rocketleague\.com\/news\/[^"'#?]+|\/news\/[^"'#?]+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
        const seen = new Set();
        const items = matches.map(match => {
          const link = new URL(match[1], 'https://www.rocketleague.com').href;
          const title = match[2].replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
          if (!title || seen.has(link)) return null;
          seen.add(link);
          const pos = html.indexOf(match[0]);
          const context = html.slice(Math.max(0, pos - 1800), Math.min(html.length, pos + match[0].length + 900));
          const imageMatch = context.match(/(?:src|data-src|srcset)=["'](https?:[^"'\s,]+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)["']/i);
          const image = imageMatch ? imageMatch[1] : '';
          return { title, content: '', date: '', link, image, source: 'Rocket League official website' };
        }).filter(Boolean).slice(0, 10);
        if (items.length) {
          officialNewsCache = { cachedAt: Date.now(), result: { ok: true, status: page.status, source: 'official-website', items, updatedAt: new Date().toISOString() } };
          return officialNewsCache.result;
        }
      }
    } catch (error) {
      // Try the official publisher announcements feed below.
    }
    try {
      const fallback = await fetch('https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=252950&count=24&maxlength=0', {
        headers: { 'User-Agent': headers['User-Agent'], 'Accept': 'application/json' },
        signal: AbortSignal.timeout(12000)
      });
      if (!fallback.ok) return { ok: false, status: fallback.status, source: '', items: [], updatedAt: new Date().toISOString() };
      const payload = await fallback.json();
      const sourceItems = (payload?.appnews?.newsitems || []).map(item => {
        const raw = String(item.contents || '');
        const imageMatch = raw.match(/<img[^>]+src=["'](https?:[^"']+)["']/i) || raw.match(/\[img\](https?:[^\[]+)\[\/img\]/i);
        const image = imageMatch ? (imageMatch[1] || imageMatch[2]).replace(/&amp;/g, '&') : '';
        const content = raw.replace(/<img\b[^>]*>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/\[.*?\]/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
        return { title: String(item.title || '').replace(/<[^>]*>/g, ''), content: content.slice(0, 1400), date: item.date ? new Date(item.date * 1000).toISOString() : '', link: String(item.url || ''), image, source: 'Rocket League / Steam news feed' };
      }).filter(item => item.title && /^https:\/\/(?:steamcommunity\.com|steamstore-a\.akamaihd\.net)\//i.test(item.link)).slice(0, 10);
      const items = await Promise.all(sourceItems.map(async item => {
        if (item.image) return item;
        try {
          const article = await fetch(item.link, { headers: { 'User-Agent': headers['User-Agent'], 'Accept': 'text/html' }, signal: AbortSignal.timeout(3500) });
          if (!article.ok) return item;
          const html = await article.text();
          let match = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i);
          if (!match) match = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i);
          const image = match?.[1]?.replace(/&amp;/g, '&') || '';
          if (!/^https:\/\//i.test(image)) return item;
          return { ...item, image };
        } catch { return item; }
      }));
      const result = { ok: items.length > 0, status: fallback.status, source: 'official-steam-fallback', items, updatedAt: new Date().toISOString() };
      if (result.ok) officialNewsCache = { cachedAt: Date.now(), result };
      return result;
    } catch (error) {
      return { ok: false, status: 0, source: '', items: [], error: error.name === 'TimeoutError' ? 'timeout' : 'network', updatedAt: new Date().toISOString() };
    }
  });

  protocol.handle(APP_SCHEME, async (request) => {
    try {
      const url = new URL(request.url);
      if (url.hostname !== 'app') return new Response('Not found', { status: 404 });
      const decoded = decodeURIComponent(url.pathname);
      const requested = path.resolve(APP_ROOT, `.${decoded}`);
      const relative = path.relative(APP_ROOT, requested);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        return new Response('Forbidden', { status: 403 });
      }
      const body = await fs.readFile(requested);
      const type = MIME_TYPES[path.extname(requested).toLowerCase()] || 'application/octet-stream';
      const headers = { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff' };
      if (path.extname(requested).toLowerCase() === '.html') {
        headers['Content-Security-Policy'] = "default-src 'self' https: data: blob:; script-src 'self' 'unsafe-inline' https://www.youtube.com https://www.youtube-nocookie.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' https: data: blob:; connect-src 'self' https:; frame-src https://www.youtube.com https://www.youtube-nocookie.com; object-src 'none'; base-uri 'self';";
      }
      return new Response(body, { status: 200, headers });
    } catch (error) {
      if (error.code === 'ENOENT') return new Response('Not found', { status: 404 });
      console.error('App resource error:', error.message);
      return new Response('Unable to load application resource', { status: 500 });
    }
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
