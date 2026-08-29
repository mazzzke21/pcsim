/* PCSIM Vault — community save platform for PC Simulator (Yiming)
   Vanilla JS, localStorage, Tailwind CDN, Lucide icons. */

/* ============================================================ STATE & STORAGE */
const LS = {
  users: 'pcsim_users',
  saves: 'pcsim_saves',
  comments: 'pcsim_comments',
  likes: 'pcsim_likes',
  session: 'pcsim_session',
  favs: 'pcsim_favs',
  views: 'pcsim_views',
  downloads: 'pcsim_dl',
};

const load = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const ALL_TAGS = ['#rtx', '#watercooled', '#budget', '#max_oc', '#retro', '#money_glitch', '#amd', '#intel', '#mini_itx', '#rgb', '#server', '#silent'];

/* ============================================================ MOCK DATA (удалена — сервер чистый) */
const uid = () => Math.random().toString(36).slice(2, 10);

/* Демо-пользователи удалены. Стартовый аккаунт — только модератор mazzzke21. */

/* Демо-сейвы и комментарии удалены — хранилище стартует пустым. */

/* ============================================================ INIT STORAGE */
/* Сервер чистый: демо-данных больше нет. Модератор создаётся автоматически. */
const LS_VERSION = 'pcsim_v2';
const STORAGE_VERSION = 'pcsim_storage_version';

function initStorage() {
  // Смена версии приложения = полная очистка устаревших демо-данных в браузере
  if (localStorage.getItem(STORAGE_VERSION) !== LS_VERSION) {
    Object.keys(LS).forEach(k => localStorage.removeItem(LS[k]));
    localStorage.setItem(STORAGE_VERSION, LS_VERSION);
  }
  if (!load(LS.users)) {
    save(LS.users, [
      {
        id: 'mod1', username: 'mazzzke21', password: 'tosa5656', email: 'mazzzke21@pcsim.io',
        avatar: '🛡️', status: 'legend', role: 'moderator',
        bio: 'Модератор PCSIM Vault. Удаляет сейвы, профили и комментарии.',
        banner: 'indigo', bannerEmoji: '🛡️', accent: 'indigo', links: {},
        joined: '2026-08-29', totalLikes: 0, totalDownloads: 0,
      },
    ]);
  }
  if (!load(LS.saves)) save(LS.saves, []);
  if (!load(LS.comments)) save(LS.comments, []);
  if (!load(LS.likes, null)) save(LS.likes, {});
  if (!load(LS.favs, null)) save(LS.favs, {});
  if (!load(LS.views, null)) save(LS.views, {});
  if (!load(LS.downloads, null)) save(LS.downloads, {});
}
initStorage();

/* ============================================================ HELPERS */
const AVATAR_EMOJIS = ['🎮','🚀','⚡','💎','🔥','🤖','🦝','🦊','🐺','😎','👾','🤓','🦾','💻','🖥️','📡','⚙️','🧊','🛡️','🎯','🏆','🕹️','👑','🐉'];
const ACCENT_COLORS = { green: '#22c55e', indigo: '#6366f1', rose: '#f43f5e', amber: '#f59e0b', cyan: '#06b6d4' };
const ACCENT_NAMES = { green: 'Зелёный', indigo: 'Индиго', rose: 'Розовый', amber: 'Янтарный', cyan: 'Бирюза' };
const BANNER_NAMES = { green: 'Изумруд', indigo: 'Индиго', orange: 'Оранжевый', rose: 'Розовый', cyan: 'Бирюза', slate: 'Графит' };
const accentColor = (a) => ACCENT_COLORS[a] || ACCENT_COLORS.green;

/* Аватар пользователя: своя фотка (512×512) или эмодзи */
function avatarHtml(u, cls) {
  if (!u) return `<span class="${cls} flex items-center justify-center shrink-0">👤</span>`;
  if (u.photo) return `<img src="${u.photo}" alt="${esc(u.username)}" class="${cls} object-cover shrink-0" loading="lazy" />`;
  return `<span class="${cls} flex items-center justify-center shrink-0">${u.avatar||'👤'}</span>`;
}

function normalizeUser(u) {
  if (!u) return u;
  return {
    ...u,
    photo: u.photo || null,
    banner: u.banner || 'green',
    bannerEmoji: u.bannerEmoji || '💾',
    accent: u.accent || 'green',
    links: u.links || {},
  };
}

const getUsers = () => load(LS.users, []).map(normalizeUser);
const getSaves = () => load(LS.saves, []);
const getComments = () => load(LS.comments, []);
const getUser = (id) => getUsers().find(u => u.id === id);
const getSession = () => load(LS.session, null);
const setSession = (id) => save(LS.session, id);
const clearSession = () => localStorage.removeItem(LS.session);
const currentUser = () => { const id = getSession(); return id ? getUser(id) : null; };
const isMod = () => { const u = currentUser(); return !!u && (u.role === 'moderator' || u.role === 'admin'); };
const modBadge = (u) => (u && u.role === 'moderator')
  ? `<span class="px-2 py-0.5 rounded text-xs font-mono font-bold bg-secondary/15 text-secondary border border-secondary/40">🛡 Модератор</span>`
  : '';

const statusLabel = { novice: 'Новичок', overclocker: 'Оверклокер', legend: 'Легенда' };
const statusBadgeClass = { novice: 'badge-novice', overclocker: 'badge-overclocker', legend: 'badge-legend' };

const fmtDate = (d) => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtSize = (b) => b < 1024 ? b + ' B' : b < 1048576 ? (b/1024).toFixed(1) + ' KB' : (b/1048576).toFixed(1) + ' MB';
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function getLikes(saveId) {
  const likes = load(LS.likes, {});
  return { count: getSaves().find(s => s.id === saveId)?.likes || 0, liked: likes[saveId]?.includes(getSession()) || false };
}
function toggleLike(saveId) {
  const sid = getSession();
  if (!sid) { openAuthModal(); return; }
  const likes = load(LS.likes, {});
  if (!likes[saveId]) likes[saveId] = [];
  const saves = getSaves();
  const save_ = saves.find(s => s.id === saveId);
  if (likes[saveId].includes(sid)) {
    likes[saveId] = likes[saveId].filter(x => x !== sid);
    save_.likes = Math.max(0, save_.likes - 1);
    if (getUser(sid)) getUser(sid); // no-op
    const users = getUsers(); const au = users.find(u => u.id === save_.authorId); if (au) au.totalLikes = Math.max(0, (au.totalLikes||0) - 1); save(LS.users, users);
  } else {
    likes[saveId].push(sid);
    save_.likes = (save_.likes || 0) + 1;
    const users = getUsers(); const au = users.find(u => u.id === save_.authorId); if (au) au.totalLikes = (au.totalLikes||0) + 1; save(LS.users, users);
  }
  save(LS.likes, likes);
  save(LS.saves, saves);
  render();
}

function getFavs() { const f = load(LS.favs, {}); const sid = getSession(); return f[sid] || []; }
function isFav(saveId) { return getFavs().includes(saveId); }
function toggleFav(saveId) {
  const sid = getSession();
  if (!sid) { openAuthModal(); return; }
  const f = load(LS.favs, {});
  if (!f[sid]) f[sid] = [];
  f[sid] = f[sid].includes(saveId) ? f[sid].filter(x => x !== saveId) : [...f[sid], saveId];
  save(LS.favs, f);
  render();
}

function recordView(saveId) {
  const v = load(LS.views, {});
  v[saveId] = (v[saveId] || 0) + 1;
  save(LS.views, v);
  const saves = getSaves();
  const s = saves.find(x => x.id === saveId);
  if (s) s.views = (s.views || 0) + 1;
  save(LS.saves, saves);
}

function recordDownload(saveId) {
  const d = load(LS.downloads, {});
  d[saveId] = (d[saveId] || 0) + 1;
  save(LS.downloads, d);
  const saves = getSaves();
  const s = saves.find(x => x.id === saveId);
  if (s) { s.downloads = (s.downloads || 0) + 1; }
  save(LS.saves, saves);
  const users = getUsers(); const au = users.find(u => u.id === s?.authorId); if (au) { au.totalDownloads = (au.totalDownloads||0) + 1; save(LS.users, users); }
}

function downloadSave(saveObj) {
  const blob = new Blob([saveObj.fileContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = saveObj.title.replace(/\s+/g, '_') + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  recordDownload(saveObj.id);
  toast('Файл сохранения скачан');
  render();
}

function copySaveCode(saveObj) {
  navigator.clipboard.writeText(saveObj.fileContent).then(() => toast('Код сохранения скопирован в буфер обмена'));
}

/* ============================================================ TOAST */
let toastTimer;
function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
  el.className = 'fixed bottom-6 right-6 z-[100] bg-elevated border border-primary text-primary px-5 py-3 rounded-lg font-mono text-sm shadow-lg modal-panel';
  el.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 200); }, 2500);
  el.style.opacity = '1';
}

/* ============================================================ ROUTER (hash) */
function go(hash) { location.hash = hash; }
window.addEventListener('hashchange', () => { window.scrollTo(0,0); render(); });

let currentView = { name: 'home', params: {} };

function parseHash() {
  const h = location.hash.slice(1);
  if (!h) return { name: 'home', params: {} };
  const [path, query] = h.split('?');
  const parts = path.split('/');
  if (parts[0] === 'save' && parts[1]) return { name: 'save', params: { id: decodeURIComponent(parts[1]) } };
  if (parts[0] === 'profile' && parts[1]) return { name: 'profile', params: { id: decodeURIComponent(parts[1]) } };
  if (parts[0] === 'hall') return { name: 'hall' };
  if (parts[0] === 'upload') return { name: 'upload' };
  if (parts[0] === 'mod') return { name: 'mod' };
  if (parts[0] === 'search') return { name: 'home', params: { search: query || '' } };
  return { name: 'home', params: {} };
}

/* ============================================================ FILTER STATE */
let filterState = { tags: [], sort: 'fresh', search: '', category: '' };

/* ============================================================ RENDER ROOT */
function render() {
  currentView = parseHash();
  const app = document.getElementById('app');
  app.innerHTML = layout();
  if (window.lucide) lucide.createIcons();
  bindGlobalEvents();
  mountPage();
}

function layout() {
  const u = currentUser();
  return `
  <header class="sticky top-0 z-40 bg-base/90 backdrop-blur border-b border-border">
    <div class="header-bar max-w-7xl mx-auto px-4 h-16 flex items-center gap-6">
      <a href="#" onclick="go('');return false;" class="flex items-center gap-2 shrink-0">
        <span class="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-base font-mono font-bold">PC</span>
        <span class="font-mono font-bold text-lg hidden sm:block">SIM<span class="text-primary">Vault</span></span>
      </a>
      <nav class="hidden md:flex items-center gap-6 text-sm text-muted font-medium">
        <a href="#" onclick="go('');return false;" class="nav-link ${currentView.name==='home'?'active text-zinc-100':''} hover:text-zinc-100">Лента</a>
        <a href="#hall" onclick="go('hall');return false;" class="nav-link ${currentView.name==='hall'?'active text-zinc-100':''} hover:text-zinc-100">Зал Славы</a>
        <a href="#upload" onclick="go('upload');return false;" class="nav-link ${currentView.name==='upload'?'active text-zinc-100':''} hover:text-zinc-100">Загрузить</a>
        ${isMod() ? `<a href="#mod" onclick="go('mod');return false;" class="nav-link ${currentView.name==='mod'?'active text-zinc-100':''} hover:text-zinc-100">Модерация</a>`:''}
      </nav>
      <div class="header-search flex-1 max-w-md ml-auto relative">
        <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"></i>
        <input id="globalSearch" type="text" placeholder="Поиск по названию, компонентам, автору..."
          value="${filterState.search||''}"
          oninput="onSearchInput(this.value)"
          class="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2 text-sm placeholder:text-muted focus:outline-none focus:border-primary" />
      </div>
      ${u ? `
        <div class="flex items-center gap-3 shrink-0">
          <button onclick="go('upload')" class="btn btn-primary px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5">
            <i data-lucide="plus" class="w-4 h-4"></i><span class="hidden sm:inline">Загрузить</span>
          </button>
          <button onclick="go('profile/${u.id}')" class="flex items-center gap-2 group">
            ${avatarHtml(u, 'w-9 h-9 rounded-full bg-elevated border border-border text-lg')}
            <span class="hidden lg:block text-sm font-medium group-hover:text-primary">${esc(u.username)}</span>
          </button>
          <button onclick="doLogout()" title="Выйти" class="text-muted hover:text-zinc-100"><i data-lucide="log-out" class="w-4 h-4"></i></button>
        </div>
      ` : `
        <button onclick="openAuthModal()" class="btn btn-ghost px-4 py-2 rounded-lg text-sm font-medium shrink-0">Войти</button>
      `}
    </div>
  </header>
  <main id="page" class="max-w-7xl mx-auto px-4 py-6 md:py-8"></main>
  <footer class="border-t border-border mt-12">
    <div class="max-w-7xl mx-auto px-4 py-8 text-center text-muted text-sm font-mono">
      PCSIM Vault · Комьюнити сохранений для PC Simulator (Yiming) · Данные хранятся локально в вашем браузере
    </div>
  </footer>
  <!-- Bottom nav for mobile -->
  <nav class="bottom-nav safe-bottom">
    <button onclick="go('')" class="${currentView.name==='home'?'active':''}"><i data-lucide="layout-grid"></i>Лента</button>
    <button onclick="go('hall')" class="${currentView.name==='hall'?'active':''}"><i data-lucide="trophy"></i>Слава</button>
    <button onclick="go('upload')" class="${currentView.name==='upload'?'active':''}"><i data-lucide="upload"></i>Залить</button>
    <button onclick="${u?`go('profile/${u.id}')`:'openAuthModal()'}" class="${currentView.name==='profile'?'active':''}"><i data-lucide="user"></i>${u?'Профиль':'Войти'}</button>
  </nav>
  `;
}

function bindGlobalEvents() {
  // search debounce
  const si = document.getElementById('globalSearch');
  if (si) {
    let t;
    si.addEventListener('input', (e) => {
      clearTimeout(t);
      t = setTimeout(() => { filterState.search = e.target.value; if (currentView.name !== 'home') go(''); else mountPage(); }, 250);
    });
  }
}

/* ============================================================ PAGE MOUNT */
function mountPage() {
  const page = document.getElementById('page');
  switch (currentView.name) {
    case 'home': page.innerHTML = homePage(); break;
    case 'save': page.innerHTML = savePage(currentView.params.id); break;
    case 'profile': page.innerHTML = profilePage(currentView.params.id); break;
    case 'hall': page.innerHTML = hallPage(); break;
    case 'upload': page.innerHTML = uploadPage(); break;
    case 'mod': page.innerHTML = isMod() ? modPage() : `<div class="text-center py-20 text-muted"><i data-lucide="shield-off" class="w-12 h-12 mx-auto mb-3 opacity-50"></i><h2 class="font-mono font-bold text-xl mb-2">Доступ запрещён</h2><p>Панель модератора видна только модераторам.</p></div>`; break;
    default: page.innerHTML = homePage();
  }
  if (window.lucide) lucide.createIcons();
  // record view on save page
  if (currentView.name === 'save') recordView(currentView.params.id);
  // restore search from hash query
  if (currentView.params.search) {
    const q = currentView.params.search.replace('q=','');
    filterState.search = q;
    const si = document.getElementById('globalSearch'); if (si) si.value = q;
  }
}

/* ============================================================ HOME PAGE */
function homePage() {
  const saves = filteredSaves();
  const cats = ['','High-End','Mini-ITX','Budget','Retro','Server','Fun'];
  return `
  <div class="fade-in">
    <!-- Hero -->
    <section class="hero-mobile mb-8 rounded-2xl bg-gradient-to-br from-surface to-elevated border border-border p-8 md:p-12 relative overflow-hidden">
      <div class="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
      <div class="absolute bottom-0 left-1/2 w-64 h-64 bg-secondary/5 rounded-full blur-3xl"></div>
      <div class="relative">
        <h1 class="font-mono font-bold text-3xl md:text-5xl mb-3">Сохранения для <span class="text-primary">PC Simulator</span></h1>
        <p class="text-muted text-lg max-w-xl mb-6">Делись билдами, оценивай сборки, находи лучшие сейвы сообщества. Валидация железа, сравнение конфигов и Зал Славы — всё внутри.</p>
        <div class="flex gap-3 flex-wrap">
          <button onclick="go('upload')" class="btn btn-primary px-5 py-2.5 rounded-lg font-medium flex items-center gap-2"><i data-lucide="upload" class="w-4 h-4"></i>Загрузить сейв</button>
          <button onclick="go('hall')" class="btn btn-ghost px-5 py-2.5 rounded-lg font-medium flex items-center gap-2"><i data-lucide="trophy" class="w-4 h-4"></i>Зал Славы</button>
        </div>
      </div>
    </section>

    <!-- Filters bar -->
    <section class="mb-6 space-y-4">
      <div class="chip-scroll flex flex-wrap items-center gap-2">
        <span class="text-xs font-mono text-muted uppercase tracking-wider mr-1 shrink-0">Категории:</span>
        ${cats.map(c => `
          <button onclick="setCategory('${c}')" class="btn px-3 py-1.5 rounded-full text-xs font-medium ${filterState.category===c?'btn-primary':'btn-ghost'}">${c||'Все'}</button>
        `).join('')}
      </div>
      <div class="chip-scroll flex flex-wrap items-center gap-2">
        <span class="text-xs font-mono text-muted uppercase tracking-wider mr-1 shrink-0">Теги:</span>
        ${ALL_TAGS.map(t => `<button onclick="toggleTag('${t}')" class="tag-chip px-3 py-1 rounded-full text-xs font-mono border border-border text-muted ${filterState.tags.includes(t)?'active':''}">${t}</button>`).join('')}
      </div>
      <div class="chip-scroll flex items-center gap-2 flex-wrap">
        <span class="text-xs font-mono text-muted uppercase tracking-wider mr-1 shrink-0">Сортировка:</span>
        ${[['fresh','Свежие'],['trending','В тренде'],['downloads','Топ скачиваний'],['bench','Рекорд бенчмарка']].map(([k,l])=>`
          <button onclick="setSort('${k}')" class="btn px-3 py-1.5 rounded-lg text-xs font-medium ${filterState.sort===k?'text-primary border border-primary':'btn-ghost'}">${l}</button>
        `).join('')}
      </div>
    </section>

    <!-- Grid -->
    <section>
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-mono font-bold text-xl">${saves.length} сохранений</h2>
      </div>
      ${saves.length === 0 ? `
        <div class="text-center py-20 text-muted">
          <i data-lucide="package-open" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
          <p>Ничего не найдено. Попробуйте изменить фильтры.</p>
        </div>
      ` : `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          ${saves.map(s => saveCard(s)).join('')}
        </div>
      `}
    </section>
  </div>
  `;
}

function filteredSaves() {
  let saves = getSaves();
  if (filterState.category) saves = saves.filter(s => s.category === filterState.category);
  if (filterState.tags.length) saves = saves.filter(s => filterState.tags.every(t => (s.tags||[]).includes(t)));
  if (filterState.search) {
    const q = filterState.search.toLowerCase();
    saves = saves.filter(s => {
      const author = getUser(s.authorId);
      return s.title.toLowerCase().includes(q) ||
        (s.cpu||'').toLowerCase().includes(q) ||
        (s.gpu||'').toLowerCase().includes(q) ||
        (s.tags||[]).some(t => t.includes(q)) ||
        (author?.username||'').toLowerCase().includes(q);
    });
  }
  switch (filterState.sort) {
    case 'trending': saves = [...saves].sort((a,b) => (b.likes||0)/(b.views||1) - (a.likes||0)/(a.views||1)); break;
    case 'downloads': saves = [...saves].sort((a,b) => (b.downloads||0) - (a.downloads||0)); break;
    case 'bench': saves = [...saves].sort((a,b) => (b.benchmark||0) - (a.benchmark||0)); break;
    default: saves = [...saves].sort((a,b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }
  return saves;
}

function setCategory(c) { filterState.category = c; mountPage(); }
function setSort(s) { filterState.sort = s; mountPage(); }
function toggleTag(t) { filterState.tags = filterState.tags.includes(t) ? filterState.tags.filter(x=>x!==t) : [...filterState.tags, t]; mountPage(); }
function onSearchInput(v) { filterState.search = v; if (currentView.name !== 'home') go(''); else mountPage(); }

/* ============================================================ SAVE CARD */
function saveCard(s) {
  const author = getUser(s.authorId);
  const { liked } = getLikes(s.id);
  const fav = isFav(s.id);
  const avgRating = avgSaveRating(s.id);
  return `
  <article class="card-hover bg-surface border border-border rounded-xl overflow-hidden cursor-pointer group" onclick="go('save/${s.id}')">
    <div class="h-36 bg-gradient-to-br from-elevated to-surface flex items-center justify-center text-5xl relative">
      ${s.screenshots?.[0] || '💾'}
      ${s.featured ? `<span class="absolute top-3 left-3 px-2 py-0.5 rounded text-xs font-mono font-bold bg-primary text-base">${s.featured==='week'?'Сборка недели':s.featured==='bench'?'Бенчмарк':s.featured==='mining'?'Майнинг':''}</span>`:''}
      <button onclick="event.stopPropagation();toggleFav('${s.id}')" class="absolute top-3 right-3 w-8 h-8 rounded-lg bg-base/80 flex items-center justify-center ${fav?'text-primary':'text-muted'} hover:text-primary">
        <i data-lucide="${fav?'heart':'heart'}" class="w-4 h-4" ${fav?'fill="currentColor"':''}></i>
      </button>
    </div>
    <div class="p-4 space-y-3">
      <div>
        <h3 class="font-mono font-bold text-base group-hover:text-primary line-clamp-1">${esc(s.title)}</h3>
        <p class="text-xs text-muted mt-0.5">${s.category} · v${s.gameVersion}</p>
      </div>
      <div class="flex flex-wrap gap-1">
        ${(s.tags||[]).slice(0,3).map(t=>`<span class="text-xs font-mono text-secondary">${t}</span>`).join(' ')}
      </div>
      <div class="text-xs text-muted font-mono space-y-0.5">
        <div class="flex items-center gap-1.5"><i data-lucide="cpu" class="w-3 h-3"></i>${esc(s.cpu)}</div>
        <div class="flex items-center gap-1.5"><i data-lucide="monitor" class="w-3 h-3"></i>${esc(s.gpu)}</div>
      </div>
      <div class="flex items-center justify-between pt-2 border-t border-border text-xs">
        <button onclick="event.stopPropagation();go('profile/${author?.id||''}')" class="flex items-center gap-1.5 hover:text-primary">
          ${avatarHtml(author, 'w-5 h-5 rounded-full bg-elevated border border-border text-sm')}<span class="font-medium">${esc(author?.username||'unknown')}</span>
        </button>
        <div class="flex items-center gap-3 text-muted font-mono">
          ${avgRating ? `<span class="flex items-center gap-0.5 text-yellow-400"><i data-lucide="star" class="w-3 h-3 fill-current"></i>${avgRating.toFixed(1)}</span>`:''}
          <span class="flex items-center gap-0.5 ${liked?'text-primary':''}"><i data-lucide="heart" class="w-3 h-3 ${liked?'fill-current':''}"></i>${s.likes||0}</span>
          <span class="flex items-center gap-0.5"><i data-lucide="download" class="w-3 h-3"></i>${s.downloads||0}</span>
          <span class="flex items-center gap-0.5"><i data-lucide="eye" class="w-3 h-3"></i>${s.views||0}</span>
        </div>
      </div>
    </div>
  </article>`;
}

function avgSaveRating(saveId) {
  const cs = getComments().filter(c => c.saveId === saveId && c.rating);
  if (!cs.length) return 0;
  return cs.reduce((a,c) => a + c.rating, 0) / cs.length;
}

/* ============================================================ SAVE DETAIL PAGE */
function savePage(id) {
  const s = getSaves().find(x => x.id === id);
  if (!s) return `<div class="text-center py-20 text-muted"><p>Сохранение не найдено.</p><button onclick="go('')" class="btn btn-ghost mt-4 px-4 py-2 rounded-lg">На главную</button></div>`;
  const author = getUser(s.authorId);
  const { liked } = getLikes(s.id);
  const fav = isFav(s.id);
  const comments = getComments().filter(c => c.saveId === id).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  const avg = avgSaveRating(id);
  const validation = validateBuild(s);

  return `
  <div class="fade-in space-y-8">
    <button onclick="history.back()" class="text-muted hover:text-zinc-100 text-sm flex items-center gap-1"><i data-lucide="arrow-left" class="w-4 h-4"></i>Назад</button>

    <div class="detail-grid grid lg:grid-cols-3 gap-6">
      <!-- Main -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Header -->
        <div class="card-mobile bg-surface border border-border rounded-xl p-6">
          <div class="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <h1 class="font-mono font-bold text-2xl mb-1">${esc(s.title)}</h1>
              <div class="flex items-center gap-3 text-sm text-muted">
                <span class="px-2 py-0.5 rounded bg-elevated font-mono text-xs">${s.category}</span>
                <span>v${s.gameVersion}</span>
                <span>${fmtDate(s.publishedAt)}</span>
              </div>
            </div>
            <div class="flex gap-2">
              <button onclick="toggleLike('${s.id}')" class="btn ${liked?'btn-primary':'btn-ghost'} px-3 py-2 rounded-lg text-sm flex items-center gap-1.5">
                <i data-lucide="heart" class="w-4 h-4 ${liked?'fill-current':''}"></i>${s.likes||0}
              </button>
              <button onclick="toggleFav('${s.id}')" class="btn ${fav?'btn-primary':'btn-ghost'} px-3 py-2 rounded-lg text-sm flex items-center gap-1.5">
                <i data-lucide="bookmark" class="w-4 h-4 ${fav?'fill-current':''}"></i>
              </button>
              ${isMod() || getSession() === s.authorId ? `<button onclick="deleteSave('${s.id}')" title="Удалить сохранение" class="btn px-3 py-2 rounded-lg text-sm flex items-center gap-1.5 text-red-400 border border-red-400/40 hover:bg-red-400/10">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>`:''}
            </div>
          </div>
          <!-- Screenshots -->
          <div class="screenshots-grid grid grid-cols-3 gap-2 mb-4">
            ${(s.screenshots||[]).map(ss => `<div class="shot-thumb aspect-video bg-elevated rounded-lg flex items-center justify-center text-4xl border border-border">${ss}</div>`).join('')}
          </div>
          <!-- Tags -->
          <div class="flex flex-wrap gap-2 mb-4">
            ${(s.tags||[]).map(t => `<button onclick="filterByTag('${t}')" class="tag-chip px-2.5 py-1 rounded-full text-xs font-mono border border-border text-muted hover:text-primary">${t}</button>`).join('')}
          </div>
          <!-- Actions -->
          <div class="flex flex-wrap gap-3">
            <button onclick='downloadSave(${JSON.stringify(s).replace(/'/g,"\\'")})' class="btn btn-primary px-5 py-2.5 rounded-lg font-medium flex items-center gap-2">
              <i data-lucide="download" class="w-4 h-4"></i>Скачать сейв
            </button>
            <button onclick='copySaveCode(${JSON.stringify(s).replace(/'/g,"\\'")})' class="btn btn-secondary px-5 py-2.5 rounded-lg font-medium flex items-center gap-2">
              <i data-lucide="clipboard-copy" class="w-4 h-4"></i>Скопировать код
            </button>
          </div>
        </div>

        <!-- Save Validator -->
        <div class="card-mobile bg-surface border border-border rounded-xl p-6">
          <h2 class="font-mono font-bold text-lg mb-1 flex items-center gap-2"><i data-lucide="shield-check" class="w-5 h-5 text-primary"></i>Save Validator / Чекер железа</h2>
          <p class="text-sm text-muted mb-4">Анализ баланса сборки и потенциальных узких мест.</p>
          ${validation.html}
        </div>

        <!-- Where to put save -->
        <div class="card-mobile bg-surface border border-border rounded-xl p-6">
          <h2 class="font-mono font-bold text-lg mb-4 flex items-center gap-2"><i data-lucide="map" class="w-5 h-5 text-secondary"></i>Куда закинуть сейв</h2>
          ${guidePaths(s)}
        </div>

        <!-- Compare -->
        <div class="card-mobile bg-surface border border-border rounded-xl p-6">
          <h2 class="font-mono font-bold text-lg mb-4 flex items-center gap-2"><i data-lucide="git-compare" class="w-5 h-5 text-primary"></i>Сравнить с другим сохранением</h2>
          ${compareBlock(s)}
        </div>

        <!-- Comments -->
        <div class="card-mobile bg-surface border border-border rounded-xl p-6">
          <h2 class="font-mono font-bold text-lg mb-4 flex items-center gap-2"><i data-lucide="message-square" class="w-5 h-5 text-secondary"></i>Комментарии (${comments.length})</h2>
          ${comments.length ? `<div class="space-y-4 mb-6">${comments.map(c => commentItem(c)).join('')}</div>` : `<p class="text-muted text-sm mb-6">Пока нет комментариев. Будьте первым!</p>`}
          ${commentForm(s.id)}
        </div>
      </div>

      <!-- Sidebar -->
      <div class="space-y-6">
        <!-- Author -->
        <div class="bg-surface border border-border rounded-xl p-5">
          <h3 class="text-xs font-mono text-muted uppercase tracking-wider mb-3">Автор</h3>
          <button onclick="go('profile/${author?.id||''}')" class="flex items-center gap-3 group w-full">
            <span class="w-12 h-12 rounded-full bg-elevated border border-border flex items-center justify-center text-2xl">${author?.avatar||'👤'}</span>
            <div class="text-left">
              <div class="font-mono font-bold group-hover:text-primary">${esc(author?.username||'unknown')}</div>
              <span class="inline-block mt-0.5 px-2 py-0.5 rounded text-xs font-mono font-bold ${statusBadgeClass[author?.status]}">${statusLabel[author?.status]||'Новичок'}</span>
            </div>
          </button>
          <p class="text-sm text-muted mt-3">${esc(author?.bio||'')}</p>
        </div>

        <!-- Specs -->
        <div class="bg-surface border border-border rounded-xl p-5">
          <h3 class="text-xs font-mono text-muted uppercase tracking-wider mb-3">Характеристики ПК</h3>
          <dl class="space-y-2.5 text-sm">
            <div class="flex justify-between"><dt class="text-muted flex items-center gap-1.5"><i data-lucide="cpu" class="w-4 h-4"></i>CPU</dt><dd class="font-mono text-right">${esc(s.cpu)}</dd></div>
            <div class="flex justify-between"><dt class="text-muted flex items-center gap-1.5"><i data-lucide="monitor" class="w-4 h-4"></i>GPU</dt><dd class="font-mono text-right">${esc(s.gpu)}</dd></div>
            <div class="flex justify-between"><dt class="text-muted flex items-center gap-1.5"><i data-lucide="memory-stick" class="w-4 h-4"></i>RAM</dt><dd class="font-mono text-right">${esc(s.ram)}</dd></div>
            <div class="flex justify-between"><dt class="text-muted flex items-center gap-1.5"><i data-lucide="terminal" class="w-4 h-4"></i>ОС</dt><dd class="font-mono text-right">${esc(s.os)}</dd></div>
            <div class="flex justify-between border-t border-border pt-2.5"><dt class="text-primary flex items-center gap-1.5 font-bold"><i data-lucide="gauge" class="w-4 h-4"></i>Бенчмарк</dt><dd class="font-mono text-primary font-bold text-lg">${(s.benchmark||0).toLocaleString()}</dd></div>
          </dl>
        </div>

        <!-- Stats -->
        <div class="bg-surface border border-border rounded-xl p-5">
          <h3 class="text-xs font-mono text-muted uppercase tracking-wider mb-3">Статистика</h3>
          <div class="grid grid-cols-2 gap-3 text-center">
            <div class="bg-elevated rounded-lg p-3"><div class="text-2xl font-mono font-bold">${s.likes||0}</div><div class="text-xs text-muted">Лайки</div></div>
            <div class="bg-elevated rounded-lg p-3"><div class="text-2xl font-mono font-bold">${s.downloads||0}</div><div class="text-xs text-muted">Скачивания</div></div>
            <div class="bg-elevated rounded-lg p-3"><div class="text-2xl font-mono font-bold">${s.views||0}</div><div class="text-xs text-muted">Просмотры</div></div>
            <div class="bg-elevated rounded-lg p-3"><div class="text-2xl font-mono font-bold">${avg?avg.toFixed(1):'—'}</div><div class="text-xs text-muted">Рейтинг</div></div>
          </div>
          <div class="mt-3 pt-3 border-t border-border text-xs text-muted font-mono space-y-1">
            <div>Размер файла: ${fmtSize(s.fileSize)}</div>
            <div>Опубликован: ${fmtDate(s.publishedAt)}</div>
            <div>Версия игры: ${s.gameVersion}</div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function filterByTag(t) { filterState.tags = [t]; if (currentView.name !== 'home') go(''); else mountPage(); }

/* ============================================================ VALIDATOR */
function validateBuild(s) {
  const bench = s.benchmark || 0;
  const cpuLower = (s.cpu||'').toLowerCase();
  const gpuLower = (s.gpu||'').toLowerCase();
  const ramMatch = (s.ram||'').match(/(\d+)\s*gb/i);
  const ramGB = ramMatch ? parseInt(ramMatch[1]) : 0;

  // crude tier detection
  const isHighEndGPU = /5090|4090|7900/.test(gpuLower);
  const isMidGPU = /4060|4070|7600|7700|3060/.test(gpuLower);
  const isLowGPU = /4050|1030|voodoo/.test(gpuLower);
  const isHighEndCPU = /i9|7950|xeon/.test(cpuLower);
  const isLowCPU = /pentium|celeron|i3/.test(cpuLower);

  // bottleneck estimate
  let cpuScore = isHighEndCPU ? 95 : /i7|i5|7600|7700/.test(cpuLower) ? 70 : isLowCPU ? 25 : 50;
  let gpuScore = isHighEndGPU ? 95 : isMidGPU ? 65 : isLowGPU ? 20 : 50;

  // adjust by bench
  if (bench > 20000) { cpuScore = Math.min(100, cpuScore+5); gpuScore = Math.min(100, gpuScore+5); }
  if (bench > 0 && bench < 500) { cpuScore = 20; gpuScore = 15; }

  const balance = Math.abs(cpuScore - gpuScore);
  const isBottleneck = balance > 30;
  const bottleneckPart = cpuScore < gpuScore ? 'CPU' : 'GPU';
  const ramAdequate = ramGB === 0 ? null : (isHighEndGPU && ramGB < 32 ? 'low' : isMidGPU && ramGB < 16 ? 'low' : 'ok');
  const throttleRisk = bench > 25000 || /6\.\d\s*ghz|overclock/i.test(s.cpu||'');

  const barColor = (v) => v >= 70 ? 'bg-primary' : v >= 40 ? 'bg-yellow-400' : 'bg-red-400';

  const html = `
  <div class="space-y-4">
    <div class="grid grid-cols-2 gap-4">
      <div>
        <div class="flex justify-between text-xs mb-1"><span class="text-muted">CPU мощность</span><span class="font-mono">${cpuScore}%</span></div>
        <div class="h-2 bg-elevated rounded-full overflow-hidden"><div class="bar-fill h-full ${barColor(cpuScore)}" style="width:${cpuScore}%"></div></div>
      </div>
      <div>
        <div class="flex justify-between text-xs mb-1"><span class="text-muted">GPU мощность</span><span class="font-mono">${gpuScore}%</span></div>
        <div class="h-2 bg-elevated rounded-full overflow-hidden"><div class="bar-fill h-full ${barColor(gpuScore)}" style="width:${gpuScore}%"></div></div>
      </div>
    </div>
    <div class="rounded-lg border ${isBottleneck?'border-yellow-400/40 bg-yellow-400/5':'border-primary/40 bg-primary/5'} p-3 text-sm">
      ${isBottleneck
        ? `<div class="flex items-center gap-2 text-yellow-400 font-medium"><i data-lucide="alert-triangle" class="w-4 h-4"></i>Bottleneck: ${bottleneckPart} ограничивает производительность</div>`
        : `<div class="flex items-center gap-2 text-primary font-medium"><i data-lucide="check-circle-2" class="w-4 h-4"></i>Сборка сбалансирована — узких мест не обнаружено</div>`}
    </div>
    ${ramAdequate === 'low' ? `<div class="rounded-lg border border-yellow-400/40 bg-yellow-400/5 p-3 text-sm text-yellow-400 flex items-center gap-2"><i data-lucide="alert-triangle" class="w-4 h-4"></i>RAM (${ramGB}GB) может быть узким местом для этой GPU</div>`:''}
    ${throttleRisk ? `<div class="rounded-lg border border-red-400/40 bg-red-400/5 p-3 text-sm text-red-400 flex items-center gap-2"><i data-lucide="thermometer" class="w-4 h-4"></i>Высокий риск троттлинга — следите за температурой</div>`:''}
    ${bench > 0 ? `<div class="text-xs text-muted font-mono pt-1">Очки бенчмарка: <span class="text-primary">${bench.toLocaleString()}</span></div>`:''}
  </div>`;
  return { html, cpuScore, gpuScore, isBottleneck };
}

/* ============================================================ GUIDE PATHS */
let guidePlatform = 'android';
function guidePaths(s) {
  const paths = {
    android: [
      'Откройте файловый менеджер Android',
      `Перейдите в Android/data/com.yiming.pcsimulator/files/saves/`,
      'Создайте папку с именем билда (латиница, без пробелов)',
      'Поместите скачанный .json файл внутрь папки',
      'Запустите PC Simulator → Загрузить сохранение → выберите папку',
    ],
    ios: [
      'Скачайте приложение Files (Файлы)',
      'Сохраните файл в iCloud Drive → папку PC Simulator',
      'Или используйте AirDrop с Mac/другого iPhone',
      'В PC Simulator: Настройки → Импорт сохранения',
      'Выберите файл из Files',
    ],
    pc: [
      'Откройте проводник Windows',
      'Перейдите в %USERPROFILE%\\Documents\\PCSimulator\\saves\\',
      'Создайте подпапку для билда',
      'Поместите .json файл в эту папку',
      'В игре: Меню → Загрузить → выберите сохранение',
    ],
  };
  const steps = paths[guidePlatform];
  return `
  <div class="space-y-4">
    <div class="flex gap-2">
      ${Object.keys(paths).map(p => `
        <button onclick="setGuidePlatform('${p}')" class="btn px-4 py-2 rounded-lg text-sm font-medium ${guidePlatform===p?'btn-primary':'btn-ghost'} capitalize">${p==='pc'?'PC':p}</button>
      `).join('')}
    </div>
    <ol class="space-y-3">
      ${steps.map((step, i) => `
        <li class="flex gap-3 items-start">
          <span class="shrink-0 w-7 h-7 rounded-full bg-primary text-base font-mono font-bold text-sm flex items-center justify-center">${i+1}</span>
          <span class="text-sm text-zinc-300 pt-0.5">${step}</span>
        </li>
      `).join('')}
    </ol>
  </div>`;
}
function setGuidePlatform(p) { guidePlatform = p; mountPage(); }

/* ============================================================ COMPARE */
let compareTarget = null;
function compareBlock(currentSave) {
  const others = getSaves().filter(s => s.id !== currentSave.id);
  return `
  <div class="space-y-4">
    <select onchange="setCompareTarget(this.value)" class="w-full bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary">
      <option value="">Выберите сохранение для сравнения...</option>
      ${others.map(s => `<option value="${s.id}" ${compareTarget===s.id?'selected':''}>${esc(s.title)}</option>`).join('')}
    </select>
    ${compareTarget ? compareTable(currentSave, getSaves().find(s=>s.id===compareTarget)) : `<p class="text-sm text-muted">Выберите сохранение, чтобы увидеть сравнение характеристик бок о бок.</p>`}
  </div>`;
}
function setCompareTarget(id) { compareTarget = id || null; mountPage(); }

function compareTable(a, b) {
  if (!b) return '';
  const rows = [
    ['CPU', a.cpu, b.cpu],
    ['GPU', a.gpu, b.gpu],
    ['RAM', a.ram, b.ram],
    ['ОС', a.os, b.os],
    ['Бенчмарк', (a.benchmark||0).toLocaleString(), (b.benchmark||0).toLocaleString()],
    ['Лайки', a.likes||0, b.likes||0],
    ['Скачивания', a.downloads||0, b.downloads||0],
    ['Размер', fmtSize(a.fileSize), fmtSize(b.fileSize)],
  ];
  const benchA = a.benchmark||0, benchB = b.benchmark||0;
  return `
  <div class="compare-grid grid grid-cols-3 gap-2 text-sm">
    <div class="font-mono text-xs text-muted uppercase">Характеристика</div>
    <div class="font-mono text-xs text-primary uppercase truncate">${esc(a.title)}</div>
    <div class="font-mono text-xs text-secondary uppercase truncate">${esc(b.title)}</div>
    ${rows.map(([label, va, vb]) => {
      const isBench = label==='Бенчмарк';
      const aBetter = isBench && benchA > benchB;
      const bBetter = isBench && benchB > benchA;
      return `
      <div class="text-muted font-medium border-t border-border pt-2">${label}</div>
      <div class="font-mono border-t border-border pt-2 ${aBetter?'text-primary font-bold':''}">${esc(va)}</div>
      <div class="font-mono border-t border-border pt-2 ${bBetter?'text-secondary font-bold':''}">${esc(vb)}</div>
    `}).join('')}
  </div>`;
}

/* ============================================================ COMMENTS */
function commentItem(c) {
  const author = getUser(c.authorId);
  return `
  <div class="flex gap-3">
    ${avatarHtml(author, 'shrink-0 w-9 h-9 rounded-full bg-elevated border border-border text-lg')}
    <div class="flex-1">
      <div class="flex items-center gap-2 mb-0.5 flex-wrap">
        <button onclick="go('profile/${author?.id||''}')" class="font-mono font-bold text-sm hover:text-primary">${esc(author?.username||'unknown')}</button>
        ${modBadge(author)}
        <span class="px-1.5 py-0.5 rounded text-xs font-mono ${statusBadgeClass[author?.status] || 'badge-novice'}">${statusLabel[author?.status]||'Новичок'}</span>
        <span class="text-xs text-muted">${fmtDate(c.createdAt)}</span>
        ${isMod() ? `<button onclick="deleteComment('${c.id}')" title="Удалить комментарий" class="ml-auto text-muted hover:text-red-400"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>`:''}
      </div>
      ${c.rating ? `<div class="flex gap-0.5 mb-1 text-yellow-400">${[1,2,3,4,5].map(n=>`<i data-lucide="star" class="w-3.5 h-3.5 ${n<=c.rating?'fill-current':'text-muted'}"></i>`).join('')}</div>`:''}
      <p class="text-sm text-zinc-300">${esc(c.text)}</p>
    </div>
  </div>`;
}

let commentRating = 0;
function commentForm(saveId) {
  const u = currentUser();
  if (!u) return `<button onclick="openAuthModal()" class="btn btn-ghost px-4 py-2 rounded-lg text-sm">Войдите, чтобы оставить комментарий</button>`;
  return `
  <div class="border-t border-border pt-4">
    <div class="flex items-center gap-2 mb-3">
      <span class="text-sm text-muted">Ваша оценка:</span>
      <div class="flex gap-0.5" id="commentStars">
        ${[1,2,3,4,5].map(n=>`<i data-lucide="star" class="star w-5 h-5 ${n<=commentRating?'text-yellow-400 fill-current':'text-muted'}" onclick="setCommentRating(${n})"></i>`).join('')}
      </div>
    </div>
    <textarea id="commentText" rows="3" placeholder="Оставьте отзыв о сборке..."
      class="w-full bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm placeholder:text-muted focus:outline-none focus:border-primary resize-none"></textarea>
    <button onclick="submitComment('${saveId}')" class="btn btn-primary mt-3 px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
      <i data-lucide="send" class="w-4 h-4"></i>Отправить
    </button>
  </div>`;
}
function setCommentRating(n) { commentRating = n; mountPage(); }
function submitComment(saveId) {
  const u = currentUser();
  if (!u) { openAuthModal(); return; }
  const text = document.getElementById('commentText')?.value.trim();
  if (!text) { toast('Введите текст комментария'); return; }
  const comments = getComments();
  comments.push({ id: uid(), saveId, authorId: u.id, text, rating: commentRating, createdAt: new Date().toISOString().slice(0,10) });
  save(LS.comments, comments);
  commentRating = 0;
  toast('Комментарий добавлен');
  mountPage();
}

/* ============================================================ PROFILE PAGE */
function profileLinks(u) {
  const l = u?.links || {};
  const chip = (href, icon, label) =>
    `<a href="${href}" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-elevated border border-border text-xs text-muted hover:border-primary hover:text-primary transition"><i data-lucide="${icon}" class="w-3 h-3"></i>${label}</a>`;
  const parts = [];
  if (l.tg) parts.push(chip('https://t.me/' + esc(l.tg), 'send', '@' + esc(l.tg)));
  if (l.dc) parts.push(chip('https://discord.com/users/' + esc(l.dc), 'message-circle', esc(l.dc)));
  if (l.yt) parts.push(chip('https://youtube.com/@' + esc(l.yt), 'youtube', esc(l.yt)));
  if (!parts.length) return '';
  return `<div class="flex flex-wrap gap-2 mt-2">${parts.join('')}</div>`;
}

function profilePage(id) {
  const u = getUser(id);
  if (!u) return `<div class="text-center py-20 text-muted"><p>Пользователь не найден.</p></div>`;
  const userSaves = getSaves().filter(s => s.authorId === id);
  const favs = getFavs().filter(f => id === getSession());
  const favSaves = getSaves().filter(s => favs.includes(s.id));
  const isOwn = getSession() === id;
  const ac = accentColor(u.accent);

  return `
  <div class="fade-in space-y-8">
    <!-- Profile header -->
    <div class="bg-surface border border-border rounded-2xl overflow-hidden relative">
      <div class="profile-banner banner-${esc(u.banner||'green')} h-28 md:h-36 flex items-end justify-end px-6 pb-4">
        ${u.bannerEmoji ? `<span class="text-5xl md:text-6xl drop-shadow-xl select-none">${u.bannerEmoji}</span>`:''}
      </div>
      <div class="relative px-5 md:px-8 pb-8 -mt-14">
        <div class="flex flex-col md:flex-row gap-5 md:gap-6 items-start">
          ${avatarHtml(u, 'w-24 h-24 rounded-2xl bg-elevated border-[3px] border-surface text-5xl shadow-xl')}
          <div class="flex-1 pt-2">
            <div class="flex items-center gap-3 mb-2 flex-wrap">
              <h1 class="font-mono font-bold text-2xl" style="color:${ac}">${esc(u.username)}</h1>
              <span class="px-2.5 py-0.5 rounded text-sm font-mono font-bold ${statusBadgeClass[u.status] || 'badge-novice'}">${statusLabel[u.status] || 'Новичок'}</span>
              ${modBadge(u)}
            </div>
            ${u.bio ? `<p class="text-muted text-sm mb-3">${esc(u.bio)}</p>`:''}
            <div class="profile-stats flex gap-6 text-sm font-mono">
              <div><span class="font-bold text-lg" style="color:${ac}">${u.totalLikes||0}</span> <span class="text-muted">лайков</span></div>
              <div><span class="font-bold text-lg" style="color:${ac}">${u.totalDownloads||0}</span> <span class="text-muted">скачиваний</span></div>
              <div><span class="font-bold text-lg" style="color:${ac}">${userSaves.length}</span> <span class="text-muted">сейвов</span></div>
              <div class="text-muted hidden sm:block">с ${fmtDate(u.joined)}</div>
            </div>
            ${profileLinks(u)}
          </div>
          <div class="flex flex-wrap gap-2 pt-2">
            ${isOwn ? `<button onclick="openEditProfile()" class="btn btn-ghost px-4 py-2 rounded-lg text-sm flex items-center gap-2"><i data-lucide="pencil" class="w-4 h-4"></i>Редактировать</button>`:''}
            ${isMod() && isOwn ? `<button onclick="go('mod')" class="btn btn-ghost px-4 py-2 rounded-lg text-sm flex items-center gap-2"><i data-lucide="shield-check" class="w-4 h-4"></i>Модерация</button>`:''}
            ${isMod() && !isOwn ? `<button onclick="deleteUser('${u.id}')" class="btn px-4 py-2 rounded-lg text-sm flex items-center gap-2 text-red-400 border border-red-400/40 hover:bg-red-400/10"><i data-lucide="trash-2" class="w-4 h-4"></i>Удалить профиль</button>`:''}
            ${isOwn ? `<button onclick="doLogout()" class="btn btn-ghost px-4 py-2 rounded-lg text-sm flex items-center gap-2"><i data-lucide="log-out" class="w-4 h-4"></i>Выйти</button>`:''}
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-6 border-b border-border">
      <button onclick="setProfileTab('saves')" class="pb-3 text-sm font-medium ${profileTab==='saves'?'tab-active':'text-muted hover:text-zinc-100'}">Сохранения (${userSaves.length})</button>
      ${isOwn ? `<button onclick="setProfileTab('favs')" class="pb-3 text-sm font-medium ${profileTab==='favs'?'tab-active':'text-muted hover:text-zinc-100'}">Избранное (${favSaves.length})</button>`:''}
    </div>

    <!-- Tab content -->
    <div>
      ${profileTab === 'saves'
        ? (userSaves.length
          ? `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">${userSaves.map(s => saveCard(s)).join('')}</div>`
          : `<p class="text-center text-muted py-12">Пользователь ещё не выкладывал сохранения.</p>`)
        : (favSaves.length
          ? `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">${favSaves.map(s => saveCard(s)).join('')}</div>`
          : `<p class="text-center text-muted py-12">В избранном пока пусто.</p>`)
      }
    </div>
  </div>`;
}
let profileTab = 'saves';
function setProfileTab(t) { profileTab = t; mountPage(); }

/* ============================================================ HALL OF FAME */
function hallPage() {
  const saves = getSaves();
  const users = getUsers();
  const weekSaves = [...saves].sort((a,b)=>(b.likes||0)-(a.likes||0)).slice(0,1);
  const benchMonster = [...saves].sort((a,b)=>(b.benchmark||0)-(a.benchmark||0)).slice(0,1);
  const miningKing = [...saves]
    .filter(s => s.featured === 'mining' || (s.tags||[]).includes('#money_glitch'))
    .sort((a,b) => (b.likes||0) - (a.likes||0))[0];
  const topAuthors = [...users].sort((a,b)=>(b.totalLikes||0)-(a.totalLikes||0)).slice(0,5);
  const allTimeTop = [...saves].sort((a,b)=>(b.likes||0)-(a.likes||0)).slice(0,6);

  return `
  <div class="fade-in space-y-10">
    <div class="text-center">
      <h1 class="font-mono font-bold text-3xl md:text-4xl mb-2">Зал <span class="text-primary">Славы</span></h1>
      <p class="text-muted">Номинации и лучшие достижения комьюнити</p>
    </div>

    <!-- Nominations -->
    <section>
      <h2 class="font-mono font-bold text-xl mb-5 flex items-center gap-2"><i data-lucide="award" class="w-5 h-5 text-primary"></i>Номинации</h2>
      <div class="grid md:grid-cols-3 gap-5">
        ${nominationCard('Сборка недели', 'flame', weekSaves[0], 'Самый залайканный сейв')}
        ${nominationCard('Монстр бенчмарков', 'gauge', benchMonster[0], 'Максимальный рекорд очков')}
        ${nominationCard('Король майнинга', 'pickaxe', miningKing, 'Самый прибыльный майнинг-билд')}
      </div>
    </section>

    <!-- Top Authors -->
    <section>
      <h2 class="font-mono font-bold text-xl mb-5 flex items-center gap-2"><i data-lucide="users" class="w-5 h-5 text-secondary"></i>Топ авторов</h2>
      <div class="bg-surface border border-border rounded-xl divide-y divide-border overflow-hidden">
        ${topAuthors.map((u, i) => `
          <button onclick="go('profile/${u.id}')" class="author-row w-full flex items-center gap-4 p-4 hover:bg-elevated text-left">
            <span class="w-8 text-center font-mono font-bold ${i===0?'text-yellow-400':i===1?'text-zinc-400':i===2?'text-orange-400':'text-muted'}">${i+1}</span>
            ${avatarHtml(u, 'w-10 h-10 rounded-full bg-elevated border border-border text-xl')}
            <div class="flex-1">
              <div class="font-mono font-bold">${esc(u.username)}</div>
              <span class="px-1.5 py-0.5 rounded text-xs font-mono ${statusBadgeClass[u.status]}">${statusLabel[u.status]}</span>
            </div>
            <div class="author-stats flex gap-4 text-sm font-mono text-muted">
              <span><span class="text-primary font-bold">${u.totalLikes||0}</span> лайков</span>
              <span><span class="text-primary font-bold">${u.totalDownloads||0}</span> скач.</span>
            </div>
          </button>
        `).join('')}
      </div>
    </section>

    <!-- All time top -->
    <section>
      <h2 class="font-mono font-bold text-xl mb-5 flex items-center gap-2"><i data-lucide="trophy" class="w-5 h-5 text-yellow-400"></i>Топ за всё время</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        ${allTimeTop.map(s => saveCard(s)).join('')}
      </div>
    </section>
  </div>`;
}

function nominationCard(title, icon, save_, subtitle) {
  if (!save_) return `
    <div class="bg-surface border border-border rounded-xl p-5">
      <div class="flex items-center gap-2 mb-2"><i data-lucide="${icon}" class="w-5 h-5 text-primary"></i><h3 class="font-mono font-bold">${title}</h3></div>
      <p class="text-muted text-sm">Нет данных</p>
    </div>`;
  const author = getUser(save_.authorId);
  return `
    <div class="card-hover bg-surface border border-border rounded-xl p-5 cursor-pointer" onclick="go('save/${save_.id}')">
      <div class="flex items-center gap-2 mb-3"><i data-lucide="${icon}" class="w-5 h-5 text-primary"></i><h3 class="font-mono font-bold">${title}</h3></div>
      <p class="text-xs text-muted mb-3">${subtitle}</p>
      <div class="bg-elevated rounded-lg p-4 flex items-center gap-4">
        <span class="text-3xl">${save_.screenshots?.[0]||'💾'}</span>
        <div class="flex-1 min-w-0">
          <div class="font-mono font-bold truncate">${esc(save_.title)}</div>
          <div class="text-xs text-muted mt-0.5">${esc(author?.username||'')}</div>
          <div class="flex gap-3 text-xs font-mono text-muted mt-1">
            <span class="text-primary">${save_.likes||0} лайков</span>
            ${save_.benchmark ? `<span>${save_.benchmark.toLocaleString()} очков</span>`:''}
          </div>
        </div>
      </div>
    </div>`;
}

/* ============================================================ UPLOAD PAGE */
let uploadScreenshots = [];
let uploadFile = null;

function uploadPage() {
  const u = currentUser();
  if (!u) return `
    <div class="text-center py-20">
      <i data-lucide="lock" class="w-12 h-12 mx-auto mb-4 text-muted"></i>
      <h2 class="font-mono font-bold text-xl mb-2">Войдите, чтобы загружать сохранения</h2>
      <button onclick="openAuthModal()" class="btn btn-primary mt-4 px-5 py-2.5 rounded-lg font-medium">Войти / Регистрация</button>
    </div>`;
  return `
  <div class="fade-in max-w-3xl mx-auto space-y-6">
    <h1 class="font-mono font-bold text-2xl flex items-center gap-2"><i data-lucide="upload" class="w-6 h-6 text-primary"></i>Загрузить сохранение</h1>

    <form onsubmit="submitUpload(event)" class="space-y-6">
      <!-- Title -->
      <div>
        <label class="block text-sm font-medium mb-2">Название сборки</label>
        <input id="upTitle" type="text" required placeholder="Apex Predator RTX 5090..."
          class="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
      </div>

      <!-- Category -->
      <div>
        <label class="block text-sm font-medium mb-2">Категория</label>
        <select id="upCategory" class="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary">
          ${['High-End','Mini-ITX','Budget','Retro','Server','Fun'].map(c=>`<option>${c}</option>`).join('')}
        </select>
      </div>

      <!-- File dropzone -->
      <div>
        <label class="block text-sm font-medium mb-2">Файл сохранения (.json / .sav / текст)</label>
        <div id="dropzone" ondragover="event.preventDefault();this.classList.add('dropzone-active')" ondragleave="this.classList.remove('dropzone-active')" ondrop="handleFileDrop(event)"
             class="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer transition" onclick="document.getElementById('fileInput').click()">
          <input id="fileInput" type="file" accept=".json,.sav,.txt" class="hidden" onchange="handleFileSelect(event)" />
          <i data-lucide="upload-cloud" class="w-10 h-10 mx-auto mb-3 text-muted"></i>
          <p class="text-sm text-muted">Перетащите файл сюда или нажмите для выбора</p>
          <p id="fileName" class="text-sm text-primary mt-2 font-mono"></p>
        </div>
      </div>

      <!-- Tags -->
      <div>
        <label class="block text-sm font-medium mb-2">Теги (через запятую)</label>
        <input id="upTags" type="text" placeholder="#rtx, #watercooled, #max_oc"
          class="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary font-mono" />
        <div class="flex flex-wrap gap-1.5 mt-2">
          ${ALL_TAGS.map(t=>`<button type="button" onclick="addTagToInput('${t}')" class="tag-chip px-2 py-0.5 rounded-full text-xs font-mono border border-border text-muted">${t}</button>`).join('')}
        </div>
      </div>

      <!-- PC Specs -->
      <div class="grid sm:grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium mb-2">CPU</label><input id="upCpu" type="text" placeholder="Intel i9-14900K" class="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary" /></div>
        <div><label class="block text-sm font-medium mb-2">GPU</label><input id="upGpu" type="text" placeholder="RTX 5090 32GB" class="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary" /></div>
        <div><label class="block text-sm font-medium mb-2">RAM</label><input id="upRam" type="text" placeholder="DDR5 64GB 7200MHz" class="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary" /></div>
        <div><label class="block text-sm font-medium mb-2">ОС</label><input id="upOs" type="text" placeholder="Windows 11 Pro" class="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary" /></div>
        <div><label class="block text-sm font-medium mb-2">Бенчмарк-очки</label><input id="upBench" type="number" placeholder="28450" class="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary" /></div>
        <div><label class="block text-sm font-medium mb-2">Версия игры</label><input id="upVersion" type="text" value="2.4.1" class="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary" /></div>
      </div>

      <!-- Screenshots -->
      <div>
        <label class="block text-sm font-medium mb-2">Скриншоты (эмодзи-заглушки)</label>
        <div class="flex flex-wrap gap-2 items-center">
          ${uploadScreenshots.map((s,i)=>`<span class="w-16 h-16 bg-elevated border border-border rounded-lg flex items-center justify-center text-2xl relative">${s}<button type="button" onclick="removeScreenshot(${i})" class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">×</button></span>`).join('')}
          <button type="button" onclick="addScreenshot()" class="w-16 h-16 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-muted hover:border-primary hover:text-primary"><i data-lucide="plus" class="w-5 h-5"></i></button>
        </div>
      </div>

      <button type="submit" class="btn btn-primary w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2">
        <i data-lucide="check" class="w-5 h-5"></i>Опубликовать сохранение
      </button>
    </form>
  </div>`;
}

function addTagToInput(t) {
  const inp = document.getElementById('upTags');
  const current = inp.value.split(',').map(x=>x.trim()).filter(Boolean);
  if (!current.includes(t)) current.push(t);
  inp.value = current.join(', ');
}
function addScreenshot() {
  const emojis = ['🎮','🖥️','⚡','💰','🎨','💡','🚀','🔥','💎','🤖'];
  uploadScreenshots.push(emojis[Math.floor(Math.random()*emojis.length)]);
  mountPage();
}
function removeScreenshot(i) { uploadScreenshots.splice(i,1); mountPage(); }

function handleFileDrop(e) {
  e.preventDefault();
  document.getElementById('dropzone').classList.remove('dropzone-active');
  const f = e.dataTransfer.files[0];
  if (f) processUploadFile(f);
}
function handleFileSelect(e) {
  const f = e.target.files[0];
  if (f) processUploadFile(f);
}
function processUploadFile(f) {
  uploadFile = f;
  document.getElementById('fileName').textContent = f.name + ' (' + fmtSize(f.size) + ')';
  const reader = new FileReader();
  reader.onload = (e) => { uploadFile._content = e.target.result; };
  reader.readAsText(f);
}

function submitUpload(e) {
  e.preventDefault();
  const u = currentUser();
  if (!u) { openAuthModal(); return; }
  const title = document.getElementById('upTitle').value.trim();
  if (!title) { toast('Введите название'); return; }
  const tags = document.getElementById('upTags').value.split(',').map(x=>x.trim()).filter(Boolean);
  const newSave = {
    id: uid(), authorId: u.id, title,
    category: document.getElementById('upCategory').value,
    tags: tags.length ? tags : ['#budget'],
    cpu: document.getElementById('upCpu').value || 'Не указано',
    gpu: document.getElementById('upGpu').value || 'Не указано',
    ram: document.getElementById('upRam').value || 'Не указано',
    os: document.getElementById('upOs').value || 'Не указано',
    benchmark: parseInt(document.getElementById('upBench').value) || 0,
    fileContent: uploadFile?._content || '{"pcs_version":"2.4.1","custom_build":true}',
    fileSize: uploadFile?.size || 1024,
    gameVersion: document.getElementById('upVersion').value || '2.4.1',
    publishedAt: new Date().toISOString().slice(0,10),
    screenshots: uploadScreenshots.length ? uploadScreenshots : ['💾'],
    likes: 0, views: 0, downloads: 0, featured: null,
  };
  const saves = getSaves();
  saves.unshift(newSave);
  save(LS.saves, saves);
  uploadScreenshots = []; uploadFile = null;
  toast('Сохранение опубликовано!');
  go('save/' + newSave.id);
}

/* ============================================================ MODERATION */
function modPage() {
  if (!isMod()) return `<div class="text-center py-20 text-muted"><p>Доступ только для модераторов.</p></div>`;
  const users = getUsers();
  const saves = getSaves();
  const comments = getComments();
  return `
  <div class="fade-in space-y-8">
    <div class="flex items-center gap-3 flex-wrap">
      <h1 class="font-mono font-bold text-2xl flex items-center gap-2"><i data-lucide="shield-check" class="w-6 h-6 text-secondary"></i>Панель модератора</h1>
      <span class="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-secondary/15 text-secondary border border-secondary/40">только для модераторов</span>
    </div>

    <section class="bg-surface border border-border rounded-xl overflow-hidden">
      <div class="px-5 py-4 border-b border-border"><h2 class="font-mono font-bold text-lg flex items-center gap-2"><i data-lucide="users" class="w-5 h-5 text-secondary"></i>Профили (${users.length})</h2></div>
      <div class="divide-y divide-border">
        ${users.length ? users.map(u => {
          const count = getSaves().filter(s => s.authorId === u.id).length;
          return `
          <div class="flex items-center gap-3 p-4 flex-wrap">
          ${avatarHtml(u, 'w-10 h-10 rounded-full bg-elevated border border-border text-xl')}
            <div class="flex-1 min-w-0">
              <div class="font-mono font-bold truncate">${esc(u.username)} ${u.role === 'moderator' ? `<span class="text-xs text-secondary ml-1">🛡</span>`:''}</div>
              <div class="text-xs text-muted">${count} сейвов · с ${fmtDate(u.joined)}</div>
            </div>
            ${u.role !== 'moderator'
              ? `<button onclick="deleteUser('${u.id}')" class="btn px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 border border-red-400/40 hover:bg-red-400/10 flex items-center gap-1"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i>Удалить</button>`
              : `<span class="text-xs text-muted font-mono">модератор</span>`}
          </div>`;
        }).join('') : `<p class="text-center text-muted py-8">Профилей пока нет.</p>`}
      </div>
    </section>

    <section class="bg-surface border border-border rounded-xl overflow-hidden">
      <div class="px-5 py-4 border-b border-border"><h2 class="font-mono font-bold text-lg flex items-center gap-2"><i data-lucide="save" class="w-5 h-5 text-primary"></i>Сохранения (${saves.length})</h2></div>
      <div class="divide-y divide-border">
        ${saves.length ? saves.map(s => {
          const au = getUser(s.authorId);
          return `
          <div class="flex items-center gap-3 p-4 flex-wrap">
            <div class="flex-1 min-w-0">
              <div class="font-mono font-bold truncate"><button onclick="go('save/${s.id}')" class="hover:text-primary">${esc(s.title)}</button></div>
              <div class="text-xs text-muted">${esc(au?.username || 'unknown')} · ${s.category} · ▼${s.downloads||0} · ♥${s.likes||0}</div>
            </div>
            <button onclick="deleteSave('${s.id}')" class="btn px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 border border-red-400/40 hover:bg-red-400/10 flex items-center gap-1"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i>Удалить</button>
          </div>`;
        }).join('') : `<p class="text-center text-muted py-8">Сохранений пока нет.</p>`}
      </div>
    </section>

    <section class="bg-surface border border-border rounded-xl overflow-hidden">
      <div class="px-5 py-4 border-b border-border"><h2 class="font-mono font-bold text-lg flex items-center gap-2"><i data-lucide="message-square" class="w-5 h-5 text-yellow-400"></i>Комментарии (${comments.length})</h2></div>
      <div class="divide-y divide-border">
        ${comments.length ? comments.map(c => {
          const au = getUser(c.authorId);
          return `
          <div class="flex items-center gap-3 p-4 flex-wrap">
            <div class="flex-1 min-w-0">
              <div class="text-sm text-zinc-300 truncate">${esc(c.text)}</div>
              <div class="text-xs text-muted">${esc(au?.username || 'unknown')} · ${fmtDate(c.createdAt)}</div>
            </div>
            <button onclick="deleteComment('${c.id}')" class="btn px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 border border-red-400/40 hover:bg-red-400/10 flex items-center gap-1"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i>Удалить</button>
          </div>`;
        }).join('') : `<p class="text-center text-muted py-8">Комментариев пока нет.</p>`}
      </div>
    </section>
  </div>`;
}

function deleteSave(saveId) {
  if (!isMod()) { toast('Недостаточно прав'); return; }
  if (!confirm('Удалить это сохранение?')) return;
  let saves = getSaves().filter(s => s.id !== saveId);
  save(LS.saves, saves);
  const comments = getComments().filter(c => c.saveId !== saveId);
  save(LS.comments, comments);
  const likes = load(LS.likes, {}); delete likes[saveId]; save(LS.likes, likes);
  const views = load(LS.views, {}); delete views[saveId]; save(LS.views, views);
  const downloads = load(LS.downloads, {}); delete downloads[saveId]; save(LS.downloads, downloads);
  const favs = load(LS.favs, {});
  Object.keys(favs).forEach(uuid => favs[uuid] = favs[uuid].filter(id => id !== saveId));
  save(LS.favs, favs);
  toast('Сохранение удалено');
  go('');
}

function deleteUser(userId) {
  if (!isMod()) { toast('Недостаточно прав'); return; }
  const u = getUser(userId);
  if (!u) return;
  if (getSession() === userId) { toast('Нельзя удалить собственный аккаунт'); return; }
  if (!confirm(`Удалить профиль «${u.username}» вместе со всеми сейвами и комментариями?`)) return;
  const saves = getSaves().filter(s => s.authorId !== userId);
  save(LS.saves, saves);
  const comments = getComments().filter(c => c.authorId !== userId);
  save(LS.comments, comments);
  const users = getUsers().filter(x => x.id !== userId);
  save(LS.users, users);
  const likes = load(LS.likes, {});
  Object.keys(likes).forEach(sid => likes[sid] = likes[sid].filter(id => id !== userId));
  save(LS.likes, likes);
  const favs = load(LS.favs, {}); delete favs[userId]; save(LS.favs, favs);
  toast('Профиль удалён');
  go('');
}

function deleteComment(commentId) {
  if (!isMod()) { toast('Недостаточно прав'); return; }
  const comments = getComments().filter(c => c.id !== commentId);
  save(LS.comments, comments);
  toast('Комментарий удалён');
  mountPage();
}

/* ============================================================ AUTH MODAL */
let authMode = 'login';
function openAuthModal() {
  authMode = 'login';
  renderAuthModal();
}
function closeAuthModal() {
  const m = document.getElementById('authModal');
  if (m) m.remove();
}
function toggleAuthMode() { authMode = authMode==='login'?'register':'login'; renderAuthModal(); }

function renderAuthModal() {
  const existing = document.getElementById('authModal');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.id = 'authModal';
  el.className = 'fixed inset-0 z-[90] flex items-center justify-center modal-backdrop p-4';
  el.onclick = (e) => { if (e.target === el) closeAuthModal(); };
  el.innerHTML = `
    <div class="modal-panel bg-surface border border-border rounded-2xl p-8 w-full max-w-md">
      <div class="flex items-center justify-between mb-6">
        <h2 class="font-mono font-bold text-xl">${authMode==='login'?'Вход':'Регистрация'}</h2>
        <button onclick="closeAuthModal()" class="text-muted hover:text-zinc-100"><i data-lucide="x" class="w-5 h-5"></i></button>
      </div>
      <form onsubmit="submitAuth(event)" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1.5">Никнейм</label>
          <input id="authUsername" type="text" required placeholder="Например, mazzzke21" autocomplete="username" class="w-full bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1.5">Пароль</label>
          <input id="authPassword" type="password" required placeholder="••••••" autocomplete="current-password" class="w-full bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
        </div>
        <button type="submit" class="btn btn-primary w-full py-2.5 rounded-lg font-medium">${authMode==='login'?'Войти':'Создать аккаунт'}</button>
      </form>
      <div class="mt-4 text-center text-sm text-muted">
        ${authMode==='login'?'Нет аккаунта?':'Уже есть аккаунт?'}
        <button onclick="toggleAuthMode()" class="text-primary hover:underline font-medium">${authMode==='login'?'Регистрация':'Войти'}</button>
      </div>
      <div class="mt-4 pt-4 border-t border-border text-xs text-muted text-center font-mono">
        Регистрация полностью бесплатная — без e-mail и верификации.
      </div>
    </div>`;
  document.body.appendChild(el);
  if (window.lucide) lucide.createIcons();
}

function submitAuth(e) {
  e.preventDefault();
  const username = document.getElementById('authUsername').value.trim();
  const password = document.getElementById('authPassword').value;
  const users = getUsers();
  if (authMode === 'login') {
    const u = users.find(x => x.username.toLowerCase() === username.toLowerCase() && x.password === password);
    if (!u) { toast('Неверный никнейм или пароль'); return; }
    setSession(u.id);
    closeAuthModal();
    toast('Добро пожаловать, ' + u.username);
    render();
  } else {
    if (!username) { toast('Введите никнейм'); return; }
    if (!password) { toast('Введите пароль'); return; }
    if (users.find(x => x.username.toLowerCase() === username.toLowerCase())) { toast('Никнейм уже занят'); return; }
    const newUser = {
      id: uid(), username, password,
      avatar: ['🎮','🚀','⚡','💎','🔥','🤖','🦝','🦊','🐺'][Math.floor(Math.random()*10)],
      status: 'novice', role: 'user', bio: '', joined: new Date().toISOString().slice(0,10),
      photo: null, banner: 'green', bannerEmoji: '💾', accent: 'green', links: {},
      totalLikes: 0, totalDownloads: 0,
    };
    users.push(newUser);
    save(LS.users, users);
    setSession(newUser.id);
    closeAuthModal();
    toast('Аккаунт создан! Всё бесплатно 🎉');
    render();
  }
}

/* ============================================================ EDIT PROFILE MODAL */
function openEditProfile() {
  renderEditProfileModal();
}
function closeEditProfileModal() {
  const m = document.getElementById('editProfileModal');
  if (m) m.remove();
}
function setAvatarEmoji(e) {
  const inp = document.getElementById('peAvatar');
  if (inp) inp.value = e;
}

/* ---- загрузка своей аватарки 512×512 ---- */
let pendingAvatarPhoto = null; // null = не меняли, строка = новая фотка, false = убрать

function onAvatarFileChange(input) {
  const f = input.files && input.files[0];
  if (!f) return;
  if (!f.type.startsWith('image/')) { toast('Это не изображение'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // обрезка по центру в квадрат + уменьшение до 512×512
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 512;
      const ctx = canvas.getContext('2d');
      const s = Math.min(img.width, img.height);
      const sx = (img.width - s) / 2;
      const sy = (img.height - s) / 2;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, sx, sy, s, s, 0, 0, 512, 512);
      pendingAvatarPhoto = canvas.toDataURL('image/jpeg', 0.85);
      // обновляем превью
      const preview = document.getElementById('peAvatarPreview');
      const ph = document.getElementById('peAvatarPlaceholder');
      if (preview) { preview.src = pendingAvatarPhoto; preview.classList.remove('hidden'); }
      if (ph) ph.remove();
      toast('Аватарка готова (512×512) ✅');
    };
    img.onerror = () => toast('Не удалось прочитать изображение');
    img.src = e.target.result;
  };
  reader.readAsDataURL(f);
}

function clearAvatarPhoto() {
  pendingAvatarPhoto = false;
  const preview = document.getElementById('peAvatarPreview');
  const ph = document.getElementById('peAvatarPlaceholder');
  if (preview && ph) { preview.remove(); ph.classList.remove('hidden'); }
  toast('Аватарка убрана');
}

function renderEditProfileModal() {
  const u = currentUser();
  if (!u) { openAuthModal(); return; }
  pendingAvatarPhoto = null;
  const existing = document.getElementById('editProfileModal');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.id = 'editProfileModal';
  el.className = 'fixed inset-0 z-[90] flex items-center justify-center modal-backdrop p-4';
  el.onclick = (ev) => { if (ev.target === el) closeEditProfileModal(); };
  el.innerHTML = `
  <div class="modal-panel bg-surface border border-border rounded-2xl p-6 md:p-8 w-full max-w-lg modal-scroll">
    <div class="flex items-center justify-between mb-6">
      <h2 class="font-mono font-bold text-xl flex items-center gap-2"><i data-lucide="settings" class="w-5 h-5 text-primary"></i>Настройки профиля</h2>
      <button onclick="closeEditProfileModal()" class="text-muted hover:text-zinc-100"><i data-lucide="x" class="w-5 h-5"></i></button>
    </div>
    <form onsubmit="submitEditProfile(event)" class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-1.5">Никнейм</label>
        <input id="peUsername" type="text" required value="${esc(u.username)}" class="w-full bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1.5">Аватар (эмодзи)</label>
        <input id="peAvatar" type="text" value="${esc(u.avatar)}" maxlength="8" class="w-full bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-primary" />
        <div class="grid grid-cols-6 gap-1.5 mt-2">
          ${AVATAR_EMOJIS.map(e => `<button type="button" onclick="setAvatarEmoji('${e}')" class="w-10 h-10 rounded-lg bg-elevated border border-border flex items-center justify-center text-xl hover:border-primary hover:scale-110 transition">${e}</button>`).join('')}
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1.5">Своя аватарка <span class="text-muted font-normal">(512×512)</span></label>
        <div class="flex items-center gap-4">
          <div class="relative shrink-0">
            ${u.photo
              ? `<img id="peAvatarPreview" src="${u.photo}" class="w-16 h-16 rounded-full object-cover border border-border bg-elevated" />`
              : `<div id="peAvatarPlaceholder" class="w-16 h-16 rounded-full bg-elevated border border-border flex items-center justify-center text-2xl">${u.avatar}</div>`}
          </div>
          <div class="flex flex-col gap-2">
            <label class="btn btn-primary px-4 py-2 rounded-lg text-sm text-center cursor-pointer flex items-center gap-2">
              <i data-lucide="image-plus" class="w-4 h-4"></i>Выбрать файл
              <input id="peAvatarFile" type="file" accept="image/*" class="hidden" onchange="onAvatarFileChange(this)" />
            </label>
            <button type="button" onclick="clearAvatarPhoto()" class="text-xs text-muted hover:text-red-400 text-left">Убрать аватарку</button>
          </div>
        </div>
        <p class="text-xs text-muted mt-1.5 font-mono">Фото автоматически обрезается в квадрат 512×512. Форматы: JPG, PNG, WebP.</p>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1.5">Эмодзи на баннере</label>
        <input id="peBannerEmoji" type="text" value="${esc(u.bannerEmoji||'')}" maxlength="8" placeholder="🚀 (необязательно)" class="w-full bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-primary" />
      </div>
      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1.5">Градиент баннера</label>
          <select id="peBanner" class="w-full bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary">
            ${Object.entries(BANNER_NAMES).map(([k, v]) => `<option value="${k}" ${k===u.banner?'selected':''}>${v}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1.5">Акцентный цвет</label>
          <select id="peAccent" class="w-full bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary">
            ${Object.entries(ACCENT_NAMES).map(([k, v]) => `<option value="${k}" ${k===u.accent?'selected':''}>${v}</option>`).join('')}
          </select>
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1.5">О себе</label>
        <textarea id="peBio" rows="3" maxlength="220" placeholder="Расскажите о себе..." class="w-full bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm placeholder:text-muted focus:outline-none focus:border-primary resize-none">${esc(u.bio||'')}</textarea>
        <p class="text-xs text-muted mt-1 font-mono">До 220 символов</p>
      </div>
      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1.5">Telegram</label>
          <input id="peTg" type="text" value="${esc(u.links?.tg||'')}" placeholder="@nick" class="w-full bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-primary" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1.5">Discord</label>
          <input id="peDc" type="text" value="${esc(u.links?.dc||'')}" placeholder="ID или ник" class="w-full bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-primary" />
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1.5">YouTube</label>
        <input id="peYt" type="text" value="${esc(u.links?.yt||'')}" placeholder="@канал" class="w-full bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-primary" />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1.5">Новый пароль <span class="text-muted font-normal">(необязательно)</span></label>
        <input id="pePassword" type="password" autocomplete="new-password" placeholder="Оставьте пустым, чтобы не менять" class="w-full bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
      </div>
      <button type="submit" class="btn btn-primary w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2"><i data-lucide="check" class="w-4 h-4"></i>Сохранить</button>
    </form>
  </div>`;
  document.body.appendChild(el);
  if (window.lucide) lucide.createIcons();
}

function submitEditProfile(e) {
  e.preventDefault();
  const current = getSession();
  if (!current) { openAuthModal(); return; }
  const users = getUsers();
  const u = users.find(x => x.id === current);
  if (!u) return;
  const username = document.getElementById('peUsername').value.trim();
  if (!username) { toast('Никнейм не может быть пустым'); return; }
  if (users.some(x => x.id !== u.id && x.username.toLowerCase() === username.toLowerCase())) { toast('Никнейм уже занят'); return; }
  const np = document.getElementById('pePassword').value;
  if (np && np.length < 4) { toast('Новый пароль — минимум 4 символа'); return; }
  u.username = username;
  u.avatar = document.getElementById('peAvatar').value.trim() || u.avatar;
  if (pendingAvatarPhoto !== null && pendingAvatarPhoto !== undefined) u.photo = pendingAvatarPhoto ? pendingAvatarPhoto : null;
  pendingAvatarPhoto = null;
  u.banner = document.getElementById('peBanner').value;
  u.accent = document.getElementById('peAccent').value;
  u.bannerEmoji = document.getElementById('peBannerEmoji').value.trim();
  u.bio = document.getElementById('peBio').value.trim();
  u.links = {
    tg: document.getElementById('peTg').value.trim().replace(/^@/, ''),
    dc: document.getElementById('peDc').value.trim(),
    yt: document.getElementById('peYt').value.trim().replace(/^@/, ''),
  };
  if (np) u.password = np;
  save(LS.users, users);
  closeEditProfileModal();
  toast('Профиль обновлён!');
  go('profile/' + u.id);
}

function doLogout() {
  clearSession();
  toast('Вы вышли из аккаунта');
  go('');
}

/* ============================================================ INIT */
render();
