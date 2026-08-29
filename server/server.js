/* ============================================================
   PCSIM Vault — сервер с MongoDB + Mongoose
   Данные хранятся в MongoDB (например, бесплатный MongoDB Atlas)
   и НЕ теряются при перезапуске на Render.
   Строка подключения берётся из process.env.MONGO_URI.

   Установка зависимостей:
     npm install mongoose

   Локальный запуск (PowerShell):
     $env:MONGO_URI="mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/pcsim"
     node server/server.js

   На Render:
     1) положим этот файл в репозиторий
     2) в Dashboard → Environment добавляем MONGO_URI
     3) Build: npm install   Start: node server.js
   ============================================================ */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const SERVER_DIR = __dirname;
const SITE_DIR = path.join(SERVER_DIR, '..');

/* ============================================================
   СХЕМЫ (Mongoose Schema) и МОДЕЛИ
   ============================================================ */

/* ---- Пользователь ---- */
const userSchema = new mongoose.Schema({
  id:             { type: String, unique: true, required: true }, // uuid-ключ (совместим с фронтендом)
  username:       { type: String, unique: true, required: true },
  password:       { type: String, required: true },
  avatar:         { type: String, default: '👤' },
  photo:          { type: String, default: null },   // своя аватарка (base64 512×512)
  banner:         { type: String, default: 'green' },
  bannerEmoji:    { type: String, default: '💾' },
  accent:         { type: String, default: 'green' },
  bio:            { type: String, default: '' },
  links:          { type: Object, default: {} },     // { tg, dc, yt }
  role:           { type: String, default: 'user' }, // 'user' | 'moderator'
  status:         { type: String, default: 'novice' },
  joined:         { type: String },
  totalLikes:     { type: Number, default: 0 },
  totalDownloads: { type: Number, default: 0 },
});

/* ---- Сохранение (главная модель) ---- */
const saveSchema = new mongoose.Schema({
  id:          { type: String, unique: true, required: true },
  authorId:    { type: String, required: true, index: true },
  title:       { type: String, required: true },
  category:    { type: String, default: 'Fun' },
  tags:        { type: [String], default: [] },
  cpu:         { type: String, default: '' },
  gpu:         { type: String, default: '' },
  ram:         { type: String, default: '' },
  os:          { type: String, default: '' },
  benchmark:   { type: Number, default: 0 },
  fileContent: { type: String, default: '' },
  fileSize:    { type: Number, default: 0 },
  gameVersion: { type: String, default: '2.4.1' },
  publishedAt: { type: String },
  screenshots: { type: [String], default: [] },
  likes:       { type: Number, default: 0 },
  views:       { type: Number, default: 0 },
  downloads:   { type: Number, default: 0 },
  featured:    { type: String, default: null },
});

/* ---- Комментарий ---- */
const commentSchema = new mongoose.Schema({
  id:        { type: String, unique: true, required: true },
  saveId:    { type: String, required: true, index: true },
  authorId:  { type: String, required: true },
  text:      { type: String, required: true },
  rating:    { type: Number, default: 0 },
  createdAt: { type: String },
});

/* ---- Сессия (токен входа) ---- */
const sessionSchema = new mongoose.Schema({
  token:  { type: String, unique: true, required: true },
  userId: { type: String, required: true },
});

/* ---- Лайк: один документ на пару (saveId, userId).
        Уникальный составной индекс защищает от дублей. ---- */
const likeSchema = new mongoose.Schema({
  saveId: { type: String, required: true },
  userId: { type: String, required: true },
});
likeSchema.index({ saveId: 1, userId: 1 }, { unique: true });

/* ---- Избранное: один документ на пару (userId, saveId) ---- */
const favSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  saveId: { type: String, required: true },
});
favSchema.index({ userId: 1, saveId: 1 }, { unique: true });

const User    = mongoose.model('User', userSchema);
const Save    = mongoose.model('Save', saveSchema);
const Comment = mongoose.model('Comment', commentSchema);
const Session = mongoose.model('Session', sessionSchema);
const Like    = mongoose.model('Like', likeSchema);
const Fav     = mongoose.model('Fav', favSchema);
/* ============================================================
   ХЕЛПЕРЫ
   ============================================================ */
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString().slice(0, 10);
const escReg = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const json = (res, code, obj) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
};

/* Документ MongoDB → тот же JSON-формат, что ждёт фронтенд */
const publicUser = (u) => u ? {
  id: u.id, username: u.username, avatar: u.avatar,
  photo: u.photo ?? null, banner: u.banner, bannerEmoji: u.bannerEmoji,
  accent: u.accent, bio: u.bio || '', links: u.links || {},
  role: u.role, status: u.status, joined: u.joined,
  totalLikes: u.totalLikes || 0, totalDownloads: u.totalDownloads || 0,
} : null;

const publicSave = (s) => s ? {
  id: s.id, authorId: s.authorId, title: s.title, category: s.category,
  tags: s.tags || [], cpu: s.cpu || '', gpu: s.gpu || '',
  ram: s.ram || '', os: s.os || '',
  benchmark: s.benchmark || 0, fileContent: s.fileContent || '',
  fileSize: s.fileSize || 0, gameVersion: s.gameVersion || '2.4.1',
  publishedAt: s.publishedAt, screenshots: s.screenshots || [],
  likes: s.likes || 0, views: s.views || 0, downloads: s.downloads || 0,
  featured: s.featured || null,
} : null;

const publicComment = (c) => c ? {
  id: c.id, saveId: c.saveId, authorId: c.authorId,
  text: c.text, rating: c.rating || 0, createdAt: c.createdAt,
} : null;

function parseBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; if (data.length > 5e6) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); } });
  });
}

function getToken(req) {
  const h = req.headers['authorization'] || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

async function currentUserId(req) {
  const token = getToken(req);
  if (!token) return null;
  const s = await Session.findOne({ token }).lean();
  return s ? s.userId : null;
}

async function isModerator(userId) {
  const me = await User.findOne({ id: userId }).lean();
  return !!(me && (me.role === 'moderator' || me.role === 'admin'));
}

/* ============================================================
   СТАТИКА (раздача фронтенда)
   ============================================================ */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2',
};

function serveStatic(req, res, pathname) {
  const p = pathname === '/' ? '/index.html' : pathname;
  const file = path.normalize(path.join(SITE_DIR, p));
  if (!file.startsWith(SITE_DIR)) return json(res, 403, { error: 'Access denied' });
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return json(res, 404, { error: 'Not found' });
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}
/* ============================================================
   API (все операции — над MongoDB через mongoose)
   ============================================================ */
async function handleApi(req, res, url) {
  const method = req.method;
  const body = await parseBody(req);
  const uid_ = await currentUserId(req);

  /* ---- Список пользователей (без пароля) ---- */
  if (method === 'GET' && url.pathname === '/api/users') {
    const users = await User.find().lean();
    return json(res, 200, users.map(publicUser));
  }

  /* ---- Регистрация (без email — ник + пароль) ---- */
  if (method === 'POST' && url.pathname === '/api/register') {
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    if (username.length < 2) return json(res, 400, { error: 'Никнейм слишком короткий' });
    if (password.length < 4) return json(res, 400, { error: 'Пароль минимум 4 символа' });
    const exists = await User.findOne({ username: { $regex: '^' + escReg(username) + '$', $options: 'i' } }).lean();
    if (exists) return json(res, 409, { error: 'Никнейм уже занят' });
    const id = uid();
    await User.create({
      id, username, password,
      avatar: ['🎮', '🚀', '⚡', '💎', '🔥', '🤖', '🦝', '🦊', '🐺'][Math.floor(Math.random() * 10)],
      joined: now(),
    });
    return json(res, 201, { id });
  }

  /* ---- Вход ---- */
  if (method === 'POST' && url.pathname === '/api/login') {
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    const u = await User.findOne({ username: { $regex: '^' + escReg(username) + '$', $options: 'i' } }).lean();
    if (!u || u.password !== password) return json(res, 401, { error: 'Неверный никнейм или пароль' });
    const token = crypto.randomBytes(24).toString('hex');
    await Session.create({ token, userId: u.id });
    return json(res, 200, { token, id: u.id });
  }

  /* ---- Текущий пользователь ---- */
  if (method === 'GET' && url.pathname === '/api/me') {
    if (!uid_) return json(res, 401, { error: 'Не авторизован' });
    const u = await User.findOne({ id: uid_ }).lean();
    return json(res, 200, publicUser(u));
  }

  /* ---- Выход ---- */
  if (method === 'POST' && url.pathname === '/api/logout') {
    const token = getToken(req);
    if (token) await Session.deleteOne({ token });
    return json(res, 200, { ok: true });
  }

  /* ---- Список сейвов ---- */
  if (method === 'GET' && url.pathname === '/api/saves') {
    const saves = await Save.find().sort({ publishedAt: -1 }).lean();
    return json(res, 200, saves.map(publicSave));
  }

  const saveRe = url.pathname.match(/^\/api\/saves\/([^/]+)$/);

  /* ---- Один сейв ---- */
  if (method === 'GET' && saveRe) {
    const s = await Save.findOne({ id: saveRe[1] }).lean();
    return s ? json(res, 200, publicSave(s)) : json(res, 404, { error: 'Сейв не найден' });
  }

  /* ---- Создать / перезаписать сейв.
          findOneAndUpdate + { upsert: true } — если клиент прислал свой id,
          запись перезапишется, а не продублируется (перезапись по ключу). ---- */
  if (method === 'POST' && url.pathname === '/api/saves') {
    if (!uid_) return json(res, 401, { error: 'Войдите, чтобы загружать' });
    const saveId = String(body.id || uid());
    const doc = {
      id: saveId, authorId: uid_, title: String(body.title || '').trim() || 'Без названия',
      category: body.category || 'Fun', tags: body.tags || [],
      cpu: body.cpu || '', gpu: body.gpu || '', ram: body.ram || '', os: body.os || '',
      benchmark: body.benchmark || 0, fileContent: body.fileContent || '',
      fileSize: body.fileSize || 0, gameVersion: body.gameVersion || '2.4.1',
      publishedAt: body.publishedAt || now(), screenshots: body.screenshots || [],
    };
    await Save.findOneAndUpdate({ id: saveId }, { $set: doc }, { upsert: true, new: true });
    return json(res, 201, { id: saveId });
  }

  /* ---- Удаление сейва (автор или модератор) ---- */
  if (method === 'DELETE' && saveRe) {
    const s = await Save.findOne({ id: saveRe[1] }).lean();
    if (!s) return json(res, 404, { error: 'Не найден' });
    if (!uid_ || (uid_ !== s.authorId && !(await isModerator(uid_))))
      return json(res, 403, { error: 'Недостаточно прав' });
    await Save.deleteOne({ id: saveRe[1] });
    await Comment.deleteMany({ saveId: saveRe[1] });
    await Like.deleteMany({ saveId: saveRe[1] });
    await Fav.deleteMany({ saveId: saveRe[1] });
    return json(res, 200, { ok: true });
  }
/* ---- Обновление профиля (findOneAndUpdate + upsert: true) ---- */
  if (method === 'POST' && /^\/api\/users\/[^/]+\/update$/.test(url.pathname)) {
    if (!uid_) return json(res, 401, { error: 'Не авторизован' });
    const targetId = url.pathname.split('/')[3];
    if (targetId !== uid_) return json(res, 403, { error: 'Можно менять только свой профиль' });
    const username = String(body.username || '').trim();
    const dup = await User.findOne({
      username: { $regex: '^' + escReg(username) + '$', $options: 'i' },
      id: { $ne: uid_ },
    }).lean();
    if (dup) return json(res, 409, { error: 'Никнейм уже занят' });
    const current = await User.findOne({ id: uid_ }).lean();
    if (!current) return json(res, 404, { error: 'Не найден' });
    const updates = {
      username: username || current.username,
      avatar: body.avatar ?? current.avatar,
      photo: body.photo !== undefined ? body.photo : current.photo,
      banner: body.banner || current.banner,
      bannerEmoji: body.bannerEmoji !== undefined ? body.bannerEmoji : current.bannerEmoji,
      accent: body.accent || current.accent,
      bio: String(body.bio || '').trim(),
      links: body.links || {},
    };
    if (body.password) updates.password = body.password;
    await User.findOneAndUpdate({ id: uid_ }, { $set: updates }, { upsert: true, new: true });
    return json(res, 200, { ok: true });
  }

  /* ---- Удаление профиля (модератор) ---- */
  if (method === 'DELETE' && /^\/api\/users\/[^/]+$/.test(url.pathname)) {
    if (!uid_ || !(await isModerator(uid_))) return json(res, 403, { error: 'Недостаточно прав' });
    const targetId = url.pathname.split('/')[3];
    if (targetId === uid_) return json(res, 400, { error: 'Нельзя удалить себя' });
    await User.deleteOne({ id: targetId });
    await Save.deleteMany({ authorId: targetId });
    await Comment.deleteMany({ authorId: targetId });
    return json(res, 200, { ok: true });
  }

  /* ---- Комментарии ---- */
  if (method === 'GET' && url.pathname === '/api/comments') {
    const saveId = url.searchParams.get('saveId');
    const comments = saveId
      ? await Comment.find({ saveId }).sort({ createdAt: -1 }).lean()
      : await Comment.find().lean();
    return json(res, 200, comments.map(publicComment));
  }
  if (method === 'POST' && url.pathname === '/api/comments') {
    if (!uid_) return json(res, 401, { error: 'Не авторизован' });
    const id = uid();
    await Comment.create({
      id, saveId: body.saveId, authorId: uid_,
      text: String(body.text || ''), rating: body.rating || 0, createdAt: now(),
    });
    return json(res, 201, { ok: true, id });
  }
  const commentRe = url.pathname.match(/^\/api\/comments\/([^/]+)$/);
  if (method === 'DELETE' && commentRe) {
    const c = await Comment.findOne({ id: commentRe[1] }).lean();
    if (!c) return json(res, 404, { error: 'Комментарий не найден' });
    if (!uid_ || (uid_ !== c.authorId && !(await isModerator(uid_))))
      return json(res, 403, { error: 'Недостаточно прав' });
    await Comment.deleteOne({ id: commentRe[1] });
    return json(res, 200, { ok: true });
  }

  /* ---- Лайк / снятие лайка (upsert: true по паре saveId+userId) ---- */
  if (method === 'POST' && url.pathname === '/api/like') {
    if (!uid_) return json(res, 401, { error: 'Не авторизован' });
    if (!body.saveId) return json(res, 400, { error: 'saveId обязателен' });
    const s = await Save.findOne({ id: body.saveId }).lean();
    if (!s) return json(res, 404, { error: 'Сейв не найден' });
    const existed = await Like.findOne({ saveId: body.saveId, userId: uid_ }).lean();
    if (existed) {
      await Like.deleteOne({ saveId: body.saveId, userId: uid_ });
      await Save.updateOne({ id: body.saveId }, { $inc: { likes: -1 } });
      await User.updateOne({ id: s.authorId }, { $inc: { totalLikes: -1 } });
    } else {
      await Like.findOneAndUpdate(
        { saveId: body.saveId, userId: uid_ },
        { $set: { saveId: body.saveId, userId: uid_ } },
        { upsert: true }
      );
      await Save.updateOne({ id: body.saveId }, { $inc: { likes: 1 } });
      await User.updateOne({ id: s.authorId }, { $inc: { totalLikes: 1 } });
    }
    return json(res, 200, { ok: true, liked: !existed });
  }

  /* ---- Избранное (upsert: true по паре userId+saveId) ---- */
  if (method === 'POST' && url.pathname === '/api/fav') {
    if (!uid_) return json(res, 401, { error: 'Не авторизован' });
    if (!body.saveId) return json(res, 400, { error: 'saveId обязателен' });
    const existed = await Fav.findOne({ userId: uid_, saveId: body.saveId }).lean();
    if (existed) {
      await Fav.deleteOne({ userId: uid_, saveId: body.saveId });
    } else {
      await Fav.findOneAndUpdate(
        { userId: uid_, saveId: body.saveId },
        { $set: { userId: uid_, saveId: body.saveId } },
        { upsert: true }
      );
    }
    return json(res, 200, { ok: true, fav: !existed });
  }

  /* ---- Просмотр ---- */
  if (method === 'POST' && url.pathname === '/api/view') {
    if (body.saveId) await Save.updateOne({ id: body.saveId }, { $inc: { views: 1 } });
    return json(res, 200, { ok: true });
  }

  /* ---- Скачивание ---- */
  if (method === 'POST' && url.pathname === '/api/download') {
    if (!body.saveId) return json(res, 400, { error: 'saveId обязателен' });
    const s = await Save.findOne({ id: body.saveId }).lean();
    if (!s) return json(res, 404, { error: 'Сейв не найден' });
    await Save.updateOne({ id: body.saveId }, { $inc: { downloads: 1 } });
    await User.updateOne({ id: s.authorId }, { $inc: { totalDownloads: 1 } });
    return json(res, 200, { ok: true });
  }

  return json(res, 404, { error: 'API endpoint not found: ' + method + ' ' + url.pathname });
}
/* ============================================================
   ЗАПУСК
   ============================================================ */
async function bootstrap() {
  if (!MONGO_URI) {
    console.error('❌ Переменная окружения MONGO_URI не задана.');
    console.error('   Пример: mongodb+srv://user:password@cluster0.abcde.mongodb.net/pcsim');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB подключена');
  } catch (err) {
    console.error('❌ Не удалось подключиться к MongoDB:', err.message);
    process.exit(1);
  }

  // Модератор по умолчанию. findOneAndUpdate + upsert: true —
  // при перезапуске сервера модератор не дублируется.
  await User.findOneAndUpdate(
    { username: 'mazzzke21' },
    {
      $setOnInsert: {
        id: 'mod1', password: 'tosa5656', avatar: '🛡️', role: 'moderator',
        status: 'legend', joined: now(), bio: 'Модератор PCSIM Vault',
        photo: null, banner: 'indigo', bannerEmoji: '🛡️', accent: 'indigo', links: {},
      },
    },
    { upsert: true }
  );

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      handleApi(req, res, url).catch((err) => {
        console.error(err);
        json(res, 500, { error: 'Server error' });
      });
    } else {
      serveStatic(req, res, url.pathname);
    }
  });

  server.listen(PORT, () => {
    console.log('✅ PCSIM Vault работает: http://localhost:' + PORT);
    console.log('🌐 Сайт раздаётся из: ' + SITE_DIR);
    console.log('🔑 Модератор: mazzzke21');
    console.log('💾 База: MongoDB (' + MONGO_URI.replace(/\/\/.*@/, '//***@') + ')');
  });
}

// Запуск только при прямом выполнении файла (удобно для тестов)
if (require.main === module) bootstrap();