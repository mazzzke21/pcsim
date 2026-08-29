/* ============================================================
   PCSIM Vault — сервер
   Раздаёт сайт (index.html, app.js, style.css) и хранит все
   данные в SQLite-базе на сервере (server/data.db).

   Нужен Node.js 22.5+ (используется встроенный модуль node:sqlite).
   Запуск:  node server/server.js
   ============================================================ */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const SERVER_DIR = __dirname;                    // c:\site\server
const SITE_DIR = path.join(SERVER_DIR, '..');    // корень сайта (index.html, app.js, style.css)
const DB_PATH = path.join(SERVER_DIR, 'data.db');
const PORT = process.env.PORT || 3000;

/* ---------------- БАЗА ДАННЫХ ---------------- */
const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    avatar TEXT DEFAULT '👤',
    photo TEXT,
    banner TEXT DEFAULT 'green',
    bannerEmoji TEXT DEFAULT '💾',
    accent TEXT DEFAULT 'green',
    bio TEXT DEFAULT '',
    links TEXT DEFAULT '{}',
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'novice',
    joined TEXT,
    totalLikes INTEGER DEFAULT 0,
    totalDownloads INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS saves (
    id TEXT PRIMARY KEY,
    authorId TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'Fun',
    tags TEXT DEFAULT '[]',
    cpu TEXT DEFAULT '',
    gpu TEXT DEFAULT '',
    ram TEXT DEFAULT '',
    os TEXT DEFAULT '',
    benchmark INTEGER DEFAULT 0,
    fileContent TEXT DEFAULT '',
    fileSize INTEGER DEFAULT 0,
    gameVersion TEXT DEFAULT '2.4.1',
    publishedAt TEXT,
    screenshots TEXT DEFAULT '[]',
    likes INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    downloads INTEGER DEFAULT 0,
    featured TEXT
  );
  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    saveId TEXT NOT NULL,
    authorId TEXT NOT NULL,
    text TEXT NOT NULL,
    rating INTEGER DEFAULT 0,
    createdAt TEXT
  );
  CREATE TABLE IF NOT EXISTS likes (
    saveId TEXT NOT NULL,
    userId TEXT NOT NULL,
    PRIMARY KEY (saveId, userId)
  );
  CREATE TABLE IF NOT EXISTS favs (
    userId TEXT NOT NULL,
    saveId TEXT NOT NULL,
    PRIMARY KEY (userId, saveId)
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    userId TEXT NOT NULL
  );
`);

/* Модератор по умолчанию (создаётся при первом запуске) */
const mod = db.prepare('SELECT id FROM users WHERE username = ?').get('mazzzke21');
if (!mod) {
  db.prepare(`INSERT INTO users (id, username, password, avatar, role, status, joined, bio)
              VALUES (?, ?, ?, ?, 'moderator', 'legend', ?, ?)`)
    .run(crypto.randomUUID(), 'mazzzke21', 'tosa5656', '🛡️', new Date().toISOString().slice(0,10),
         'Модератор PCSIM Vault');
}

/* ---------------- ХЕЛПЕРЫ ---------------- */
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString().slice(0, 10);
const json = (res, code, obj) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
};
const USER_FIELDS = 'id, username, avatar, photo, banner, bannerEmoji, accent, bio, links, role, status, joined, totalLikes, totalDownloads';
const userRow = (r) => Object.assign({}, r, { links: JSON.parse(r.links || '{}') });
const saveRow = (r) => Object.assign({}, r, { tags: JSON.parse(r.tags || '[]'), screenshots: JSON.parse(r.screenshots || '[]') });

function parseBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 5e6) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); } });
  });
}

function getToken(req) {
  const h = req.headers['authorization'] || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}
function currentUserId(req) {
  const t = getToken(req);
  if (!t) return null;
  const s = db.prepare('SELECT userId FROM sessions WHERE token = ?').get(t);
  return s ? s.userId : null;
}

/* ---------------- СТАТИКА (фронтенд) ---------------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json; charset=utf-8', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };
function serveStatic(req, res, pathname) {
  let p = pathname === '/' ? '/index.html' : pathname;
  const file = path.normalize(path.join(SITE_DIR, p));
  if (!file.startsWith(SITE_DIR)) { json(res, 403, { error: 'Access denied' }); return; }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { json(res, 404, { error: 'Not found' }); return; }
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

/* ---------------- ФУНКЦИИ API ---------------- */
async function handleApi(req, res, url) {
  const method = req.method;
  const body = await parseBody(req);
  const uid_ = currentUserId(req);

  // Пользователи (публично — без пароля и email)
  if (method === 'GET' && url.pathname === '/api/users') {
    const rows = db.prepare(`SELECT ${USER_FIELDS} FROM users`).all().map(userRow);
    return json(res, 200, rows);
  }

  // Регистрация (без email — просто ник + пароль)
  if (method === 'POST' && url.pathname === '/api/register') {
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    if (username.length < 2) return json(res, 400, { error: 'Никнейм слишком короткий' });
    if (password.length < 4) return json(res, 400, { error: 'Пароль минимум 4 символа' });
    const exists = db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(username);
    if (exists) return json(res, 409, { error: 'Никнейм уже занят' });
    const id = uid();
    db.prepare('INSERT INTO users (id, username, password, avatar, joined) VALUES (?,?,?,?,?)')
      .run(id, username, password, ['🎮','🚀','⚡','💎','🔥','🤖','🦝','🦊','🐺'][Math.floor(Math.random()*10)], now());
    return json(res, 201, { id });
  }

  // Вход
  if (method === 'POST' && url.pathname === '/api/login') {
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    const u = db.prepare('SELECT id, password FROM users WHERE username = ? COLLATE NOCASE').get(username);
    if (!u || u.password !== password) return json(res, 401, { error: 'Неверный никнейм или пароль' });
    const token = crypto.randomBytes(24).toString('hex');
    db.prepare('INSERT INTO sessions (token, userId) VALUES (?,?)').run(token, u.id);
    return json(res, 200, { token, id: u.id });
  }

  // Текущий пользователь
  if (method === 'GET' && url.pathname === '/api/me') {
    if (!uid_) return json(res, 401, { error: 'Не авторизован' });
    const u = db.prepare(`SELECT ${USER_FIELDS} FROM users WHERE id = ?`).get(uid_);
    return json(res, 200, u ? userRow(u) : null);
  }

  // Выход
  if (method === 'POST' && url.pathname === '/api/logout') {
    const t = getToken(req);
    if (t) db.prepare('DELETE FROM sessions WHERE token = ?').run(t);
    return json(res, 200, { ok: true });
  }

  // Список сейвов
  if (method === 'GET' && url.pathname === '/api/saves') {
    const rows = db.prepare('SELECT * FROM saves').all().map(saveRow);
    return json(res, 200, rows);
  }
  const saveRe = url.pathname.match(/^\/api\/saves\/([^/]+)$/);
  if (method === 'GET' && saveRe) {
    const s = db.prepare('SELECT * FROM saves WHERE id = ?').get(saveRe[1]);
    return s ? json(res, 200, saveRow(s)) : json(res, 404, { error: 'Сейв не найден' });
  }

  // Загрузка сейва
  if (method === 'POST' && url.pathname === '/api/saves') {
    if (!uid_) return json(res, 401, { error: 'Войдите, чтобы загружать' });
    const id = uid();
    db.prepare(`INSERT INTO saves (id, authorId, title, category, tags, cpu, gpu, ram, os, benchmark,
                fileContent, fileSize, gameVersion, publishedAt, screenshots) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id, uid_, String(body.title || '').trim(), body.category || 'Fun',
           JSON.stringify(body.tags || []), body.cpu || '', body.gpu || '', body.ram || '', body.os || '',
           body.benchmark || 0, body.fileContent || '', body.fileSize || 0,
           body.gameVersion || '2.4.1', body.publishedAt || now(), JSON.stringify(body.screenshots || []));
    return json(res, 201, { id });
  }

  // Удаление сейва (автор или модератор)
  if (method === 'DELETE' && saveRe) {
    const me = uid_ ? db.prepare(`SELECT ${USER_FIELDS} FROM users WHERE id = ?`).get(uid_) : null;
    const s = db.prepare('SELECT * FROM saves WHERE id = ?').get(saveRe[1]);
    if (!s) return json(res, 404, { error: 'Не найден' });
    if (!me || (me.id !== s.authorId && me.role !== 'moderator')) return json(res, 403, { error: 'Недостаточно прав' });
    db.prepare('DELETE FROM saves WHERE id = ?').run(saveRe[1]);
    db.prepare('DELETE FROM comments WHERE saveId = ?').run(saveRe[1]);
    db.prepare('DELETE FROM likes WHERE saveId = ?').run(saveRe[1]);
    db.prepare('DELETE FROM favs WHERE saveId = ?').run(saveRe[1]);
    return json(res, 200, { ok: true });
  }

  // Обновление профиля (ник, аватар, фото 512×512, баннер, акцент, био, ссылки, пароль)
  if (method === 'POST' && /^\/api\/users\/[^/]+\/update$/.test(url.pathname)) {
    if (!uid_) return json(res, 401, { error: 'Не авторизован' });
    const targetId = url.pathname.split('/')[3];
    if (targetId !== uid_) return json(res, 403, { error: 'Можно менять только свой профиль' });
    const u = db.prepare(`SELECT ${USER_FIELDS} FROM users WHERE id = ?`).get(uid_);
    const dup = db.prepare('SELECT id FROM users WHERE username = ? AND id <> ? COLLATE NOCASE').get(body.username, uid_);
    if (dup) return json(res, 409, { error: 'Никнейм уже занят' });
    db.prepare(`UPDATE users SET username=?, avatar=?, photo=?, banner=?, bannerEmoji=?, accent=?, bio=?, links=?
                ${body.password ? ', password=?' : ''} WHERE id=?`)
      .run(String(body.username || u.username).trim(), body.avatar || u.avatar,
           body.photo !== undefined ? body.photo : u.photo,
           body.banner || u.banner, body.bannerEmoji !== undefined ? body.bannerEmoji : u.bannerEmoji,
           body.accent || u.accent, String(body.bio || '').trim(), JSON.stringify(body.links || {}),
           ...(body.password ? [body.password] : []), uid_);
    return json(res, 200, { ok: true });
  }

  // Удаление профиля (модератор)
  if (method === 'DELETE' && /^\/api\/users\/[^/]+$/.test(url.pathname)) {
    const me = uid_ ? db.prepare(`SELECT ${USER_FIELDS} FROM users WHERE id = ?`).get(uid_) : null;
    if (!me || me.role !== 'moderator') return json(res, 403, { error: 'Недостаточно прав' });
    const targetId = url.pathname.split('/')[3];
    if (targetId === me.id) return json(res, 400, { error: 'Нельзя удалить себя' });
    db.prepare('DELETE FROM users WHERE id = ?').run(targetId);
    db.prepare('DELETE FROM saves WHERE authorId = ?').run(targetId);
    db.prepare('DELETE FROM comments WHERE authorId = ?').run(targetId);
    return json(res, 200, { ok: true });
  }
// Комментарии
  if (method === 'GET' && url.pathname === '/api/comments') {
    const rows = url.searchParams.has('saveId')
      ? db.prepare('SELECT * FROM comments WHERE saveId = ?').all(url.searchParams.get('saveId'))
      : db.prepare('SELECT * FROM comments').all();
    return json(res, 200, rows);
  }
  if (method === 'POST' && url.pathname === '/api/comments') {
    if (!uid_) return json(res, 401, { error: 'Не авторизован' });
    db.prepare('INSERT INTO comments (id, saveId, authorId, text, rating, createdAt) VALUES (?,?,?,?,?,?)')
      .run(uid(), body.saveId, uid_, String(body.text || ''), body.rating || 0, now());
    return json(res, 201, { ok: true });
  }
  const commentRe = url.pathname.match(/^\/api\/comments\/([^/]+)$/);
  if (method === 'DELETE' && commentRe) {
    const me = uid_ ? db.prepare(`SELECT ${USER_FIELDS} FROM users WHERE id = ?`).get(uid_) : null;
    const c = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentRe[1]);
    if (!c) return json(res, 404, { error: 'Комментарий не найден' });
    if (!me || (me.id !== c.authorId && me.role !== 'moderator')) return json(res, 403, { error: 'Недостаточно прав' });
    db.prepare('DELETE FROM comments WHERE id = ?').run(commentRe[1]);
    return json(res, 200, { ok: true });
  }

  // Лайк / снятие лайка
  if (method === 'POST' && url.pathname === '/api/like') {
    if (!uid_) return json(res, 401, { error: 'Не авторизован' });
    const s = db.prepare('SELECT id, likes, authorId FROM saves WHERE id = ?').get(body.saveId);
    if (!s) return json(res, 404, { error: 'Сейв не найден' });
    const existed = db.prepare('SELECT 1 FROM likes WHERE saveId = ? AND userId = ?').get(body.saveId, uid_);
    if (existed) {
      db.prepare('DELETE FROM likes WHERE saveId = ? AND userId = ?').run(body.saveId, uid_);
      db.prepare('UPDATE saves SET likes = likes - 1 WHERE id = ?').run(body.saveId);
      db.prepare('UPDATE users SET totalLikes = totalLikes - 1 WHERE id = ?').run(s.authorId);
    } else {
      db.prepare('INSERT INTO likes (saveId, userId) VALUES (?,?)').run(body.saveId, uid_);
      db.prepare('UPDATE saves SET likes = likes + 1 WHERE id = ?').run(body.saveId);
      db.prepare('UPDATE users SET totalLikes = totalLikes + 1 WHERE id = ?').run(s.authorId);
    }
    return json(res, 200, { ok: true, liked: !existed });
  }

  // Избранное
  if (method === 'POST' && url.pathname === '/api/fav') {
    if (!uid_) return json(res, 401, { error: 'Не авторизован' });
    const existed = db.prepare('SELECT 1 FROM favs WHERE userId = ? AND saveId = ?').get(uid_, body.saveId);
    if (existed) db.prepare('DELETE FROM favs WHERE userId = ? AND saveId = ?').run(uid_, body.saveId);
    else db.prepare('INSERT INTO favs (userId, saveId) VALUES (?,?)').run(uid_, body.saveId);
    return json(res, 200, { ok: true, fav: !existed });
  }

  // Просмотр
  if (method === 'POST' && url.pathname === '/api/view') {
    db.prepare('UPDATE saves SET views = views + 1 WHERE id = ?').run(body.saveId);
    return json(res, 200, { ok: true });
  }

  // Скачивание
  if (method === 'POST' && url.pathname === '/api/download') {
    const s = db.prepare('SELECT authorId FROM saves WHERE id = ?').get(body.saveId);
    if (!s) return json(res, 404, { error: 'Сейв не найден' });
    db.prepare('UPDATE saves SET downloads = downloads + 1 WHERE id = ?').run(body.saveId);
    db.prepare('UPDATE users SET totalDownloads = totalDownloads + 1 WHERE id = ?').run(s.authorId);
    return json(res, 200, { ok: true });
  }

  return json(res, 404, { error: 'API endpoint not found: ' + method + ' ' + url.pathname });
}

/* ---------------- HTTP СЕРВЕР ---------------- */
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    handleApi(req, res, url).catch(() => json(res, 500, { error: 'Server error' }));
  } else {
    serveStatic(req, res, url.pathname);
  }
});

server.listen(PORT, () => {
  console.log('✅ PCSIM Vault работает: http://localhost:' + PORT);
  console.log('📦 База данных SQLite: ' + DB_PATH);
  console.log('🌐 Сайт раздаётся из: ' + SITE_DIR);
  console.log('🔑 Модератор: mazzzke21');
});