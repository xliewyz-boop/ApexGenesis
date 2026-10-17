(() => {
  'use strict';
  const SUPABASE_URL = 'https://owowwyetdowudefnszts.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_SWeVhaS3dNbKuQS3NxWUAw_Ob8ucMHm';
  const SESSION_KEY = 'apexSupabaseSession';

  function readSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
    catch { localStorage.removeItem(SESSION_KEY); return null; }
  }
  function saveSession(session) {
    if (!session || !session.access_token) { localStorage.removeItem(SESSION_KEY); return null; }
    const normalized = { ...session, expires_at: session.expires_at || Math.floor(Date.now() / 1000) + Number(session.expires_in || 3600) };
    localStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
    return normalized;
  }
  function clearSession() { localStorage.removeItem(SESSION_KEY); }
  async function parseResponse(response) {
    const raw = await response.text();
    let data = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
    if (!response.ok) {
      const message = data && (data.msg || data.message || data.error_description || data.error) || 'Sunucu isteği başarısız (' + response.status + ').';
      const error = new Error(String(message)); error.status = response.status; error.details = data; throw error;
    }
    return data;
  }
  async function authRequest(path, body, accessToken) {
    const headers = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' };
    if (accessToken) headers.Authorization = 'Bearer ' + accessToken;
    return parseResponse(await fetch(SUPABASE_URL + '/auth/v1/' + path, {
      method: 'POST', headers, body: JSON.stringify(body || {})
    }));
  }
  async function freshSession() {
    let session = readSession();
    if (!session) return null;
    if (Number(session.expires_at || 0) > Math.floor(Date.now() / 1000) + 60) return session;
    if (!session.refresh_token) { clearSession(); return null; }
    try {
      session = saveSession(await authRequest('token?grant_type=refresh_token', { refresh_token: session.refresh_token }));
      return session;
    } catch (error) {
      clearSession();
      throw error;
    }
  }
  async function signIn(email, password) {
    const data = await authRequest('token?grant_type=password', { email: String(email).trim(), password: String(password) });
    saveSession(data);
    return data;
  }
  async function signUp(email, password, username) {
    const data = await authRequest('signup', {
      email: String(email).trim(),
      password: String(password),
      data: { username: String(username).trim() }
    });
    if (data && data.access_token) saveSession(data);
    return data;
  }
  async function request(path, options) {
    const opts = options || {};
    const session = await freshSession();
    const headers = { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + (session ? session.access_token : SUPABASE_KEY) };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    if (opts.prefer) headers.Prefer = opts.prefer;
    const response = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
      method: opts.method || 'GET', headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body)
    });
    return parseResponse(response);
  }
  async function getCurrentUser() {
    const session = await freshSession();
    if (!session) return null;
    try {
      const response = await fetch(SUPABASE_URL + '/auth/v1/user', {
        headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + session.access_token }
      });
      if (response.status === 401 || response.status === 403) { clearSession(); return null; }
      return await parseResponse(response);
    } catch (error) {
      if (error.status === 401 || error.status === 403) { clearSession(); return null; }
      throw error;
    }
  }
  async function signOut() {
    const session = await freshSession();
    try {
      if (session) await parseResponse(await fetch(SUPABASE_URL + '/auth/v1/logout', {
        method: 'POST', headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + session.access_token }
      }));
    } finally { clearSession(); }
  }
  async function select(table, query) { return request(table + (query ? '?' + query : '?select=*')); }
  async function insert(table, rows) { return request(table, { method: 'POST', body: rows, prefer: 'return=representation' }); }
  async function update(table, query, values) { return request(table + '?' + query, { method: 'PATCH', body: values, prefer: 'return=representation' }); }
  async function remove(table, query) { return request(table + '?' + query, { method: 'DELETE', prefer: 'return=representation' }); }
  async function rpc(name, params) { return request('rpc/' + encodeURIComponent(name), { method: 'POST', body: params || {} }); }
  async function getProfile(userId) {
    const user = userId ? { id: userId } : await getCurrentUser();
    if (!user) return null;
    const rows = await select('profiles', 'select=id,username,display_name,bio,avatar_url,rocket_league_rank,player_role,region,created_at&id=eq.' + encodeURIComponent(user.id) + '&limit=1');
    return Array.isArray(rows) ? (rows[0] || null) : null;
  }
  async function getRole(userId) {
    const user = userId ? { id: userId } : await getCurrentUser();
    if (!user) return 'member';
    const rows = await select('user_roles', 'select=role&user_id=eq.' + encodeURIComponent(user.id));
    const roles = Array.isArray(rows) ? rows.map(row => row.role) : [];
    return roles.includes('owner') ? 'owner' : roles.includes('admin') ? 'admin' : roles.includes('moderator') ? 'admin' : 'member';
  }
  async function saveProfile(fields) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Giriş yapman gerekiyor.');
    const values = {};
    for (const key of ['username','display_name','bio','avatar_url','rocket_league_rank','player_role','region']) {
      if (Object.prototype.hasOwnProperty.call(fields || {}, key)) values[key] = fields[key];
    }
    if (typeof values.username === 'string') values.username = values.username.trim().toLowerCase();
    const rows = await update('profiles', 'id=eq.' + encodeURIComponent(user.id), values);
    if (!Array.isArray(rows) || !rows.length) throw new Error('Çevrim içi profil güncellenemedi. Veritabanı migration ve RLS ayarlarını kontrol et.');
    return rows[0];
  }

  window.apexCloud = Object.freeze({
    url: SUPABASE_URL, signIn, signUp, signOut, getCurrentUser, getProfile, getRole, saveProfile, select, insert, update, remove, rpc,
    isSignedIn: async () => Boolean(await getCurrentUser()),
    getSession: freshSession
  });
})();
