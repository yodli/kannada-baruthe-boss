// Entrypoint wiring app modules
import {
  firestoreDB,
  collection,
  getDocs,
  doc,
  setDoc,
  isFirebaseConfigured,
} from './firebase.js';
import { initDB, addOrUpdate, getData } from './db.js';
import { moduleOrder, seedModules } from './config.js';
import { showView, renderDashboard } from './ui.js';
import { unlockAudioContext, stopCurrentAudio } from './audio.js';
import { showPrompt } from './modals.js';
import { startLesson, wireFlashcardInteractions } from './lesson.js';
import {
  startSpeedMatchGame,
  startMemoryGridGame,
  startListenTapGame,
  startFillBlanksGame,
  startSentenceBuilderGame,
  startTriviaGame,
} from './games.js';
import { renderAuthorEditor } from './author.js';
import { registerServiceWorker } from './sw-register.js';

async function seedDatabase() {
  if (!isFirebaseConfigured) return;
  const modulesSnapshot = await getDocs(collection(firestoreDB, 'modules'));
  if (modulesSnapshot.empty) {
    console.log('Seeding Firestore with new module data...');
    for (const module of seedModules) {
      await setDoc(doc(firestoreDB, 'modules', module.id), module);
    }
  }
  if (!(await getData('userData', 'profile'))) {
    await addOrUpdate('userData', { key: 'profile', name: 'Cara', streak: 0, wordsLearned: [], accuracy: { correct: 0, total: 0 }, useGoogleTTS: false });
  }
}

async function initApp() {
  await initDB();
  if (!isFirebaseConfigured) {
    document.getElementById('loading-indicator')?.classList.add('hidden');
    document.getElementById('app').innerHTML = `
      <div class="bg-white border border-amber-200 text-amber-700 rounded-xl p-6 shadow-md">
        <h2 class="text-xl font-semibold mb-2">Cloud sync is disabled</h2>
        <p class="mb-2">Firebase credentials were not supplied. Authoring mode and remote modules require a runtime configuration.</p>
        <p class="text-sm text-amber-600">Add your keys to <code>config/runtime-config.js</code> (see <code>config/runtime-config.example.js</code>) and reload the app.</p>
      </div>
    `;
    return;
  }
  await seedDatabase();
  wireFlashcardInteractions();

  // dashboard
  await renderDashboard(firestoreDB, startLesson);

  // Header actions
  document.getElementById('home-btn')?.addEventListener('click', () => renderDashboardEntrypoint());
  document.getElementById('author-mode-btn')?.addEventListener('click', () => {
    stopCurrentAudio();
    const modal = document.getElementById('passcode-modal');
    modal.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-xl w-80"><h3 class="text-xl font-bold mb-4 text-center">Enter Passcode</h3><input type="password" id="passcode-input" maxlength="4" class="w-full p-3 text-center text-2xl tracking-[1em] border-2 rounded-lg mb-2"><p id="passcode-error" class="text-red-500 h-5 text-center mb-4"></p><button id="passcode-submit" class="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg">Enter</button><button id="passcode-close" class="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg mt-2">Cancel</button></div>`;
    modal.classList.remove('hidden');
    const input = modal.querySelector('#passcode-input');
    input.focus();
    modal.querySelector('#passcode-close').addEventListener('click', () => modal.classList.add('hidden'));
    modal.querySelector('#passcode-submit').addEventListener('click', () => {
      if (input.value === '1104') {
        modal.classList.add('hidden');
        showView('authorMode');
        renderAuthorEditor();
      } else {
        modal.querySelector('#passcode-error').textContent = 'Incorrect passcode.';
      }
    });
    input.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') modal.querySelector('#passcode-submit').click();
    });
  });

  // Games
  document.getElementById('speed-match-btn')?.addEventListener('click', startSpeedMatchGame);
  document.getElementById('memory-grid-btn')?.addEventListener('click', startMemoryGridGame);
  document.getElementById('listen-tap-btn')?.addEventListener('click', startListenTapGame);
  document.getElementById('fill-blanks-btn')?.addEventListener('click', startFillBlanksGame);
  document.getElementById('sentence-builder-btn')?.addEventListener('click', startSentenceBuilderGame);
  document.getElementById('trivia-game-btn')?.addEventListener('click', startTriviaGame);

  // Lesson exit
  document.getElementById('exit-lesson-btn')?.addEventListener('click', () => {
    stopCurrentAudio();
    document.getElementById('app-header').classList.remove('hidden');
    renderDashboardEntrypoint();
  });

  // Exit game button
  document.getElementById('exit-game-btn')?.addEventListener('click', async () => {
    const { exitGame } = await import('./games.js');
    exitGame();
  });

  // Profile interactions
  const profilePic = document.getElementById('profile-pic');
  const profilePicInput = document.getElementById('profile-pic-input');
  document.getElementById('user-profile')?.addEventListener('click', async (e) => {
    if (e.target.id === 'username-display') {
      stopCurrentAudio();
      const newName = await showPrompt("What's your name?");
      if (newName) {
        const profile = (await getData('userData', 'profile')) || {};
        profile.name = newName;
        await addOrUpdate('userData', profile);
        document.getElementById('username-display').textContent = newName;
      }
    } else {
      profilePicInput.click();
    }
  });
  profilePicInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (re) => {
        const imageData = re.target.result;
        localStorage.setItem('profilePic', imageData);
        profilePic.src = imageData;
      };
      reader.readAsDataURL(file);
    }
  });
  const savedPic = localStorage.getItem('profilePic');
  if (savedPic) profilePic.src = savedPic;

  // Unlock audio
  document.body.addEventListener('click', unlockAudioContext);

  // Hide loading indicator
  document.getElementById('loading-indicator')?.classList.add('hidden');
}

async function renderDashboardEntrypoint() {
  if (!isFirebaseConfigured) return;
  await renderDashboard(firestoreDB, startLesson);
}

registerServiceWorker();
initApp();

export { renderDashboardEntrypoint };
