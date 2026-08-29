// Smoke test for 512x512 avatar upload (browser APIs stubbed).
const fs = require('fs');
const vm = require('vm');

const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { for (const k in store) delete store[k]; },
  key: (i) => Object.keys(store)[i],
  get length() { return Object.keys(store).length; },
};

const makeEl = (trackId) => {
  const el = {
    innerHTML: '', className: '', style: {}, value: '', textContent: '', src: '',
    files: null, width: 0, height: 0, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, appendChild() {}, remove() {}, click() {},
  };
  if (trackId) {
    Object.defineProperty(el, 'id', {
      get() { return el._id; },
      set(v) { el._id = v; docEls[v] = el; },
    });
  }
  return el;
};
const docEls = {};
global.document = {
  getElementById: (id) => docEls[id] || (docEls[id] = makeEl(false)),
  createElement: (tag) => {
    if (tag === 'canvas') {
      const c = makeEl(false);
      c.getContext = () => ({ imageSmoothingQuality: '', drawImage() {}, });
      c.toDataURL = () => 'data:image/jpeg;base64,FAKEAVATAR';
      return c;
    }
    if (tag === 'img') {
      const i = makeEl(false);
      return i;
    }
    return makeEl(true);
  },
  body: { appendChild() {} },
};

global.window = { addEventListener() {}, scrollTo() {}, lucide: { createIcons() {} } };
global.lucide = { createIcons() {} };
global.location = { hash: '' };
global.navigator = { clipboard: { writeText: () => Promise.resolve() } };
global.confirm = () => true;
global.history = { back() {} };
global.Image = function () {
  const self = this;
  this.src = '';
  this.onload = null;
  this.onerror = null;
  Object.defineProperty(this, 'src', {
    get() { return this._src; },
    set(v) {
      this._src = v;
      this.width = 1000; this.height = 600;
      setTimeout(() => { if (typeof self.onload === 'function') self.onload(); }, 0);
    },
  });
};
global.FileReader = function () {
  this.result = '';
  this.onload = null;
  this.readAsDataURL = function () {
    this.result = 'data:image/png;base64,FAKE';
    setTimeout(() => { if (typeof this.onload === 'function') this.onload({ target: { result: this.result } }); }, 0);
  };
};

const code = fs.readFileSync('c:\\site\\app.js', 'utf8');
vm.runInThisContext(code, { filename: 'app.js' });

let passed = 0, failed = 0;
function check(name, cond, extra) {
  if (cond) { passed++; console.log('PASS:', name); }
  else { failed++; console.log('FAIL:', name, extra !== undefined ? JSON.stringify(extra) : ''); }
}

// 1. avatarHtml returns emoji span for emoji user
const mod = getUsers()[0];
const htmlEmoji = avatarHtml(mod, 'w-9 h-9 rounded-full');
check('avatarHtml emoji span', htmlEmoji.includes('<span') && htmlEmoji.includes('🛡️'));
check('no photo by default', mod.photo === null);

// 2. avatarHtml returns img for photo user
const uPhoto = { username: 'P', avatar: '😎', photo: 'data:image/jpeg;base64,xxx' };
const htmlImg = avatarHtml(uPhoto, 'w-9 h-9');
check('avatarHtml img', htmlImg.includes('<img') && htmlImg.includes('object-cover') && htmlImg.includes('data:image'));

// 3. edit modal renders photo upload block
setSession('mod1');
renderEditProfileModal();
const modal = docEls['editProfileModal'];
console.log('MODAL INNERHTML LENGTH:', modal ? modal.innerHTML.length : 'NO MODAL');
console.log('MODAL HEAD:', modal ? modal.innerHTML.slice(0, 400) : '');
check('modal has file input', modal.innerHTML.includes('peAvatarFile'));
check('modal has 512x512 label', modal.innerHTML.includes('512×512'));
check('modal has clear button', modal.innerHTML.includes('clearAvatarPhoto'));

// 4. onAvatarFileChange resizes to 512x512 and stores pending
pendingAvatarPhoto = null;
const fakeInput = { files: [{ type: 'image/png', name: 'me.png', size: 100000 }] };
const wait = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  onAvatarFileChange(fakeInput);
  await wait(20);
  check('pendingAvatarPhoto set to jpeg data url', typeof pendingAvatarPhoto === 'string' && pendingAvatarPhoto.startsWith('data:image/jpeg'), pendingAvatarPhoto);

  // 5. submit saves photo
  document.getElementById('peUsername').value = 'mazzzke21';
  document.getElementById('pePassword').value = '';
  submitEditProfile({ preventDefault() {} });
  const saved = getUsers()[0];
  check('photo persisted', saved.photo === 'data:image/jpeg;base64,FAKEAVATAR', saved.photo);

  // 6. clear removes photo
  pendingAvatarPhoto = false;
  document.getElementById('peUsername').value = 'mazzzke21';
  document.getElementById('pePassword').value = '';
  submitEditProfile({ preventDefault() {} });
  const cleared = getUsers()[0];
  check('photo cleared to null', cleared.photo === null);

  // 7. profile page shows img when photo set
  const loadedUsers = getUsers();
  loadedUsers[0].photo = 'data:image/jpeg;base64,PHOTO';
  save(LS.users, loadedUsers);
  console.log('PHOTO TYPE:', typeof getUsers()[0].photo, getUsers()[0].photo);
  console.log('AVATARHTML RESULT:', avatarHtml(getUsers()[0], 'w-24 h-24'));
  const ph = profilePage('mod1');
  console.log('FULL PROFILE PAGE:\n' + ph);
  console.log('PROFILE PAGE LENGTH:', ph.length);
  console.log('PROFILE HEAD:', ph.slice(0, 300));
  check('profile page renders photo img', ph.includes('<img') && ph.includes('PHOTO'));
  check('profile page no emoji avatar span', ph.includes('🛡️'));

  console.log('\nRESULT: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();