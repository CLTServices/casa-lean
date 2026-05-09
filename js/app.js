// Casa Lean — app.js

// ─── Estado ────────────────────────────────────────────────
const state = {
  user: null,
  userName: '',
  rooms: [],
  currentRoom: null,
  currentTab: 'cleaning',
  cleaningTasks: [],
  orgHistory: [],
  recTasks: [],
  editingTask: null,
  editingRecTask: null
};

// ─── DOM ───────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const show = id => $( id)?.classList.remove('hidden');
const hide = id => $( id)?.classList.add('hidden');

function irPara(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(screen)?.classList.add('active');
  $(screen).scrollTop = 0;
}

function toast(msg, tipo = 'info') {
  const el = $('toast');
  el.textContent = msg;
  el.className = 'toast toast--' + tipo + ' visible';
  setTimeout(() => el.classList.remove('visible'), 3000);
}

// ─── Auth ──────────────────────────────────────────────────
auth.onAuthStateChanged(async user => {
  if (user) {
    state.user = user;
    const snap = await db.collection('users').doc(user.uid).get();
    state.userName = snap.exists ? snap.data().nome : user.email.split('@')[0];
    renderAll();
    await loadRooms();
    irPara('screen-home');
  } else {
    state.user = null;
    irPara('screen-auth');
    renderAuthScreen();
  }
});

let authMode = 'login';

function renderAuthScreen() {
  $('auth-title').textContent   = authMode === 'login' ? t('welcomeBack') : t('createAccount');
  $('auth-btn').textContent     = authMode === 'login' ? t('login') : t('register');
  $('auth-switch-text').textContent = authMode === 'login' ? t('noAccount') : t('hasAccount');
  $('auth-switch-link').textContent = authMode === 'login' ? t('registerHere') : t('loginHere');
  authMode === 'register' ? show('auth-name-group') : hide('auth-name-group');
}

$('auth-switch-link').addEventListener('click', () => {
  authMode = authMode === 'login' ? 'register' : 'login';
  renderAuthScreen();
});

$('auth-btn').addEventListener('click', async () => {
  const email    = $('auth-email').value.trim();
  const password = $('auth-password').value;
  const nome     = $('auth-name').value.trim();

  if (!email || !password) { toast(t('authError'), 'erro'); return; }
  $('auth-btn').disabled = true;

  try {
    if (authMode === 'register') {
      if (!nome) { toast(t('authError'), 'erro'); $('auth-btn').disabled = false; return; }
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await db.collection('users').doc(cred.user.uid).set({
        nome, email, criadoEm: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      await auth.signInWithEmailAndPassword(email, password);
    }
  } catch (err) {
    let msg = t('authError');
    if (err.code === 'auth/email-already-in-use') msg = t('emailInUse');
    if (err.code === 'auth/weak-password') msg = t('weakPassword');
    toast(msg, 'erro');
    $('auth-btn').disabled = false;
  }
});

$('btn-logout').addEventListener('click', () => auth.signOut());
$('btn-logout-profile').addEventListener('click', () => auth.signOut());

// ─── Render global ─────────────────────────────────────────
function renderAll() {
  // Textos estáticos
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (I18N[lang][key]) el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.dataset.i18nPh;
    if (I18N[lang][key]) el.placeholder = t(key);
  });
  // Language toggle
  $('lang-pt').classList.toggle('active', lang === 'pt');
  $('lang-en').classList.toggle('active', lang === 'en');
  $('lang-pt-profile').classList.toggle('active', lang === 'pt');
  $('lang-en-profile').classList.toggle('active', lang === 'en');
  // Username
  if ($('home-username')) $('home-username').textContent = state.userName;
  if ($('profile-name')) $('profile-name').textContent = state.userName;
  if ($('profile-email')) $('profile-email').textContent = state.user?.email || '';
}

$('lang-pt').addEventListener('click', () => setLang('pt'));
$('lang-en').addEventListener('click', () => setLang('en'));
$('lang-pt-profile').addEventListener('click', () => setLang('pt'));
$('lang-en-profile').addEventListener('click', () => setLang('en'));

// ─── Rooms ─────────────────────────────────────────────────
async function loadRooms() {
  const snap = await db.collection('users').doc(state.user.uid)
    .collection('rooms').orderBy('ordem').get();
  state.rooms = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderRooms();
}

function renderRooms() {
  const grid = $('rooms-grid');
  if (!state.rooms.length) {
    grid.innerHTML = `<div class="no-rooms">${t('noRooms')}</div>`;
    return;
  }
  grid.innerHTML = state.rooms.map(r => `
    <div class="room-card" onclick="openRoom('${r.id}')">
      <div class="room-icon">${r.icon || '🏠'}</div>
      <div class="room-name">${r.nome}</div>
    </div>`).join('');
}

// Add/Edit Room Modal
$('btn-add-room').addEventListener('click', () => openRoomModal());
$('btn-edit-room').addEventListener('click', () => openRoomModal(state.currentRoom));

function openRoomModal(room = null) {
  $('modal-room-title').textContent = room ? t('editRoom') : t('addRoomTitle');
  $('modal-room-name').value = room ? room.nome : '';
  $('modal-room-delete').style.display = room ? 'block' : 'none';
  renderIconPicker(room?.icon || '🏠');
  show('modal-room');
}

function renderIconPicker(selected) {
  $('icon-picker').innerHTML = ROOM_ICONS.map(ic =>
    `<button class="icon-opt ${ic === selected ? 'selected' : ''}" onclick="selectIcon('${ic}')">${ic}</button>`
  ).join('');
}

window.selectIcon = function(ic) {
  document.querySelectorAll('.icon-opt').forEach(b => b.classList.remove('selected'));
  event.target.classList.add('selected');
};

$('modal-room-cancel').addEventListener('click', () => hide('modal-room'));

$('modal-room-save').addEventListener('click', async () => {
  const nome = $('modal-room-name').value.trim();
  if (!nome) return;
  const icon = document.querySelector('.icon-opt.selected')?.textContent || '🏠';
  const ref = db.collection('users').doc(state.user.uid).collection('rooms');
  if (state.currentRoom?.id && $('modal-room-delete').style.display !== 'none' && $('modal-room-title').textContent === t('editRoom')) {
    await ref.doc(state.currentRoom.id).update({ nome, icon });
    state.currentRoom.nome = nome;
    state.currentRoom.icon = icon;
    $('room-title').textContent = nome;
    $('room-icon-display').textContent = icon;
  } else {
    await ref.add({ nome, icon, ordem: state.rooms.length, criadoEm: firebase.firestore.FieldValue.serverTimestamp() });
  }
  hide('modal-room');
  await loadRooms();
  toast(t('saved'), 'sucesso');
});

$('modal-room-delete').addEventListener('click', async () => {
  if (!confirm(t('deleteRoomConfirm'))) return;
  await db.collection('users').doc(state.user.uid).collection('rooms').doc(state.currentRoom.id).delete();
  hide('modal-room');
  await loadRooms();
  irPara('screen-home');
  toast(t('deleted'));
});

// Open Room
window.openRoom = async function(roomId) {
  state.currentRoom = state.rooms.find(r => r.id === roomId);
  $('room-title').textContent = state.currentRoom.nome;
  $('room-icon-display').textContent = state.currentRoom.icon || '🏠';
  state.currentTab = 'cleaning';
  irPara('screen-room');
  switchTab('cleaning');
};

$('btn-back-home').addEventListener('click', () => irPara('screen-home'));
$('btn-back-home-profile').addEventListener('click', () => irPara('screen-home'));
$('btn-profile').addEventListener('click', () => { renderProfile(); irPara('screen-profile'); });

// ─── Tabs ──────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

async function switchTab(tab) {
  state.currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('hidden', c.dataset.tab !== tab));

  if (tab === 'cleaning') await loadCleaningTasks();
  if (tab === 'org')      await loadOrgHistory();
  if (tab === 'tasks')    await loadRecTasks();
}

// ─── Cleaning ──────────────────────────────────────────────
async function loadCleaningTasks() {
  const snap = await db.collection('users').doc(state.user.uid)
    .collection('rooms').doc(state.currentRoom.id)
    .collection('cleaning').orderBy('criadoEm').get();
  state.cleaningTasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderCleaningTasks();
}

function renderCleaningTasks() {
  const list = $('cleaning-list');
  if (!state.cleaningTasks.length) {
    list.innerHTML = `<p class="empty-state">${t('noCleaningTasks')}</p>`;
    return;
  }
  const freqOrder = ['daily','weekly','biweekly','monthly','quarterly'];
  const freqLabels = { daily: t('freqDaily'), weekly: t('freqWeekly'), biweekly: t('freqBiweekly'), monthly: t('freqMonthly'), quarterly: t('freqQuarterly') };

  const grouped = {};
  freqOrder.forEach(f => { grouped[f] = []; });
  state.cleaningTasks.forEach(task => { (grouped[task.freq] || grouped['monthly']).push(task); });

  list.innerHTML = freqOrder.map(freq => {
    if (!grouped[freq].length) return '';
    return `
      <div class="freq-group">
        <div class="freq-label">${freqLabels[freq]}</div>
        ${grouped[freq].map(task => renderCleaningTask(task)).join('')}
      </div>`;
  }).join('');
}

function renderCleaningTask(task) {
  const status = getTaskStatus(task);
  const lastDone = task.lastDone ? formatDate(task.lastDone.toDate ? task.lastDone.toDate() : new Date(task.lastDone)) : t('never');
  return `
    <div class="cleaning-task ${status.cls}">
      <div class="task-left">
        <button class="check-btn ${task.done ? 'checked' : ''}" onclick="toggleCleaningDone('${task.id}')">
          ${task.done ? '✓' : ''}
        </button>
        <div class="task-info">
          <div class="task-name ${task.done ? 'done' : ''}">${task.nome}</div>
          <div class="task-meta">${t('lastDone')}: ${lastDone} · <span class="status-badge status--${status.cls}">${status.label}</span></div>
        </div>
      </div>
      <button class="task-delete-btn" onclick="deleteCleaningTask('${task.id}')">×</button>
    </div>`;
}

function getTaskStatus(task) {
  if (!task.lastDone) return { cls: 'overdue', label: t('never') };
  const last = task.lastDone.toDate ? task.lastDone.toDate() : new Date(task.lastDone);
  const days = FREQ_DAYS[task.freq] || 30;
  const diff = Math.floor((Date.now() - last.getTime()) / 86400000);
  if (diff > days) return { cls: 'overdue', label: t('overdue') };
  if (diff === days) return { cls: 'due', label: t('dueToday') };
  return { cls: 'ok', label: t('upcoming') };
}

window.toggleCleaningDone = async function(id) {
  const task = state.cleaningTasks.find(t => t.id === id);
  if (!task) return;
  const now = new Date();
  await db.collection('users').doc(state.user.uid)
    .collection('rooms').doc(state.currentRoom.id)
    .collection('cleaning').doc(id)
    .update({ done: !task.done, lastDone: now });
  await loadCleaningTasks();
};

window.deleteCleaningTask = async function(id) {
  if (!confirm(t('deleteTask') + '?')) return;
  await db.collection('users').doc(state.user.uid)
    .collection('rooms').doc(state.currentRoom.id)
    .collection('cleaning').doc(id).delete();
  await loadCleaningTasks();
  toast(t('deleted'));
};

$('btn-add-cleaning').addEventListener('click', () => {
  $('modal-cleaning-name').value = '';
  $('modal-cleaning-freq').value = 'weekly';
  show('modal-cleaning');
});

$('modal-cleaning-cancel').addEventListener('click', () => hide('modal-cleaning'));

$('modal-cleaning-save').addEventListener('click', async () => {
  const nome = $('modal-cleaning-name').value.trim();
  const freq = $('modal-cleaning-freq').value;
  if (!nome) return;
  await db.collection('users').doc(state.user.uid)
    .collection('rooms').doc(state.currentRoom.id)
    .collection('cleaning').add({ nome, freq, done: false, lastDone: null, criadoEm: firebase.firestore.FieldValue.serverTimestamp() });
  hide('modal-cleaning');
  await loadCleaningTasks();
  toast(t('saved'), 'sucesso');
});

// ─── Organisation ──────────────────────────────────────────
const ORG_CATS = 4;
let orgScores = [3, 3, 3, 3];

async function loadOrgHistory() {
  const snap = await db.collection('users').doc(state.user.uid)
    .collection('rooms').doc(state.currentRoom.id)
    .collection('org').orderBy('data', 'desc').limit(10).get();
  state.orgHistory = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  orgScores = state.orgHistory.length ? [...state.orgHistory[0].scores] : [3,3,3,3];
  renderOrg();
}

function renderOrg() {
  const cats = t('orgCategories');
  const descs = t('orgDescriptors');
  $('org-categories').innerHTML = cats.map((cat, i) => `
    <div class="org-cat">
      <div class="org-cat-header">
        <span class="org-cat-name">${cat}</span>
        <span class="org-score-val" id="org-val-${i}">${orgScores[i]}/5</span>
      </div>
      <div class="score-selector">
        ${[1,2,3,4,5].map(n => `
          <button class="score-btn ${orgScores[i] === n ? 'active' : ''}"
            onclick="setOrgScore(${i}, ${n}, this)">${n}</button>`).join('')}
      </div>
      <div class="org-desc" id="org-desc-${i}">${descs[i][orgScores[i]-1]}</div>
    </div>`).join('');

  // History
  $('org-history-list').innerHTML = state.orgHistory.length
    ? state.orgHistory.map(h => `
        <div class="hist-item">
          <span class="hist-date">${formatDate(h.data.toDate ? h.data.toDate() : new Date(h.data))}</span>
          <div class="hist-scores">
            ${h.scores.map((s,i) => `<span class="hist-score" style="color:${scoreColor(s)}">${s}</span>`).join('')}
          </div>
          <span class="hist-avg" style="color:${scoreColor(avg(h.scores))}">${avg(h.scores).toFixed(1)}</span>
        </div>`).join('')
    : `<p class="empty-state">${t('orgNoHistory')}</p>`;
}

window.setOrgScore = function(catIdx, score, btn) {
  orgScores[catIdx] = score;
  btn.closest('.score-selector').querySelectorAll('.score-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  $('org-val-' + catIdx).textContent = score + '/5';
  $('org-desc-' + catIdx).textContent = t('orgDescriptors')[catIdx][score - 1];
};

$('btn-save-org').addEventListener('click', async () => {
  await db.collection('users').doc(state.user.uid)
    .collection('rooms').doc(state.currentRoom.id)
    .collection('org').add({ scores: orgScores, data: new Date() });
  await loadOrgHistory();
  toast(t('saved'), 'sucesso');
});

function scoreColor(s) {
  const colors = ['#E53E3E','#DD6B20','#D69E2E','#38A169','#3182CE'];
  return colors[Math.round(s) - 1] || '#888';
}
function avg(arr) { return arr.reduce((a,b) => a+b, 0) / arr.length; }

// ─── Recurring Tasks ───────────────────────────────────────
async function loadRecTasks() {
  const snap = await db.collection('users').doc(state.user.uid)
    .collection('rooms').doc(state.currentRoom.id)
    .collection('rectasks').orderBy('nextDue').get();
  state.recTasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderRecTasks();
}

function renderRecTasks() {
  const list = $('rectasks-list');
  if (!state.recTasks.length) {
    list.innerHTML = `<p class="empty-state">${t('noRecTasks')}</p>`;
    return;
  }
  list.innerHTML = state.recTasks.map(task => {
    const due = task.nextDue ? (task.nextDue.toDate ? task.nextDue.toDate() : new Date(task.nextDue)) : null;
    const isOverdue = due && due < new Date();
    return `
      <div class="rectask-card ${isOverdue ? 'overdue' : ''}">
        <div class="rectask-info">
          <div class="rectask-name">${task.nome}</div>
          <div class="rectask-due">${t('nextDue')}: ${due ? formatDate(due) : '—'} ${isOverdue ? '⚠️' : ''}</div>
        </div>
        <div class="rectask-actions">
          <button class="btn-sm btn-success" onclick="completeRecTask('${task.id}')">${t('complete')} ✓</button>
          <button class="btn-sm btn-ghost" onclick="deleteRecTask('${task.id}')">×</button>
        </div>
      </div>`;
  }).join('');
}

window.completeRecTask = async function(id) {
  const task = state.recTasks.find(t => t.id === id);
  if (!task) return;
  const days = FREQ_DAYS[task.freq] || 30;
  const nextDue = new Date(Date.now() + days * 86400000);
  await db.collection('users').doc(state.user.uid)
    .collection('rooms').doc(state.currentRoom.id)
    .collection('rectasks').doc(id)
    .update({ nextDue, lastDone: new Date() });
  await loadRecTasks();
  toast(t('saved'), 'sucesso');
};

window.deleteRecTask = async function(id) {
  if (!confirm(t('deleteTask') + '?')) return;
  await db.collection('users').doc(state.user.uid)
    .collection('rooms').doc(state.currentRoom.id)
    .collection('rectasks').doc(id).delete();
  await loadRecTasks();
  toast(t('deleted'));
};

$('btn-add-rectask').addEventListener('click', () => {
  $('modal-rectask-name').value = '';
  $('modal-rectask-freq').value = 'monthly';
  $('modal-rectask-date').value = new Date().toISOString().split('T')[0];
  show('modal-rectask');
});

$('modal-rectask-cancel').addEventListener('click', () => hide('modal-rectask'));

$('modal-rectask-save').addEventListener('click', async () => {
  const nome = $('modal-rectask-name').value.trim();
  const freq = $('modal-rectask-freq').value;
  const dateVal = $('modal-rectask-date').value;
  if (!nome || !dateVal) return;
  const nextDue = new Date(dateVal);
  await db.collection('users').doc(state.user.uid)
    .collection('rooms').doc(state.currentRoom.id)
    .collection('rectasks').add({ nome, freq, nextDue, criadoEm: firebase.firestore.FieldValue.serverTimestamp() });
  hide('modal-rectask');
  await loadRecTasks();
  toast(t('saved'), 'sucesso');
});

// ─── Profile ───────────────────────────────────────────────
function renderProfile() {
  $('profile-name').textContent = state.userName;
  $('profile-email').textContent = state.user?.email || '';
  $('profile-rooms').textContent = state.rooms.length;
  renderAll();
}

// ─── Utils ─────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '';
  return d.toLocaleDateString(lang === 'pt' ? 'pt-PT' : 'en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

// ─── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderAll();
  renderAuthScreen();
});
