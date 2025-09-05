// UI and dashboard rendering
import { collection, getDocs, doc, getDoc } from './firebase.js';
import { getData } from './db.js';
import { moduleOrder } from './config.js';
import { stopCurrentAudio } from './audio.js';

function getViews() {
  return {
    dashboard: document.getElementById('dashboard-view'),
    lesson: document.getElementById('lesson-view'),
    authorMode: document.getElementById('author-mode-view'),
    game: document.getElementById('game-view'),
  };
}

function showView(viewName) {
  stopCurrentAudio();
  const allViews = getViews();
  Object.values(allViews).forEach((v) => v.classList.add('hidden'));
  allViews[viewName].classList.remove('hidden');
}

async function updateGameLockStatus() {
  const profile = await getData('userData', 'profile');
  const wordsLearned = profile?.wordsLearned?.length || 0;
  const isUnlocked = wordsLearned >= 20;
  const gameButtons = [
    'speed-match-btn',
    'memory-grid-btn',
    'fill-blanks-btn',
    'listen-tap-btn',
    'sentence-builder-btn',
  ];
  gameButtons.forEach((btnId) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    const container = btn.closest('.locked-game-container');
    if (isUnlocked) {
      btn.classList.remove('locked-game');
      container?.querySelector('.lock-message')?.style && (container.querySelector('.lock-message').style.display = 'none');
    } else {
      btn.classList.add('locked-game');
      container?.querySelector('.lock-message')?.style && (container.querySelector('.lock-message').style.display = 'block');
    }
  });
}

async function checkGameAccess() {
  const profile = await getData('userData', 'profile');
  const wordsLearned = profile?.wordsLearned?.length || 0;
  if (wordsLearned < 20) {
    const { showMessage } = await import('./modals.js');
    showMessage('Learn 20 words to unlock games');
    return false;
  }
  return true;
}

async function getLearnedPhrases(firestoreDB) {
  const profile = await getData('userData', 'profile');
  const learnedIds = profile?.wordsLearned || [];

  const modulesSnapshot = await getDocs(collection(firestoreDB, 'modules'));
  const allPhrases = [];
  modulesSnapshot.forEach((d) => {
    const module = d.data();
    const learnedPhrases = (module.phrases || []).filter((p) => learnedIds.includes(p.id));
    allPhrases.push(...learnedPhrases);
  });
  return allPhrases;
}

async function renderDashboard(firestoreDB, startLesson) {
  const modulesGrid = document.getElementById('modules-grid');
  const modulesSnapshot = await getDocs(collection(firestoreDB, 'modules'));
  const modules = [];
  modulesSnapshot.forEach((docSnap) => modules.push(docSnap.data()));
  modules.sort((a, b) => moduleOrder.indexOf(a.id) - moduleOrder.indexOf(b.id));

  modulesGrid.innerHTML = '';
  modules.forEach((module) => {
    const card = document.createElement('div');
    card.className = 'bg-emerald-100 p-4 rounded-xl shadow-md text-center cursor-pointer hover:bg-emerald-200 transition';
    card.innerHTML = `<div class="text-4xl mb-2">${module.icon}</div><h3 class="font-bold">${module.title}</h3>`;
    card.addEventListener('click', () => startLesson(module.id));
    modulesGrid.appendChild(card);
  });

  const profile = await getData('userData', 'profile');
  document.getElementById('username-display').textContent = profile?.name || 'Cara';
  document.getElementById('streak-days').textContent = profile?.streak || 0;
  document.getElementById('words-learned').textContent = profile?.wordsLearned?.length || 0;
  const acc = profile?.accuracy;
  const accPercent = acc && acc.total > 0 ? Math.round((acc.correct / acc.total) * 100) : 0;
  document.getElementById('accuracy-percent').textContent = `${accPercent}%`;

  await updateGameLockStatus();
  showView('dashboard');
}

export { showView, renderDashboard, getLearnedPhrases, checkGameAccess, updateGameLockStatus };

