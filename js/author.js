// Admin/Author mode: edit content and manage audio uploads
import {
  firestoreDB,
  storage,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  ref,
  uploadBytes,
  getDownloadURL,
} from './firebase.js';
import { moduleOrder } from './config.js';
import { addOrUpdate, clearStore, getData } from './db.js';
import { showMessage, showConfirm, showPrompt } from './modals.js';
import { stopCurrentAudio } from './audio.js';
import { computeModuleSync, normalizeUserDataRecords } from './import-utils.js';

let mediaRecorder = null;
let audioChunks = [];
let activeStream = null;

function stopActiveMicrophone() {
  if (activeStream) {
    activeStream.getTracks().forEach((t) => t.stop());
    activeStream = null;
  }
}

async function handleAuthorInputChange(e) {
  stopCurrentAudio();
  const { moduleId, field, phraseIndex } = e.target.dataset;
  const moduleDoc = await getDoc(doc(firestoreDB, 'modules', moduleId));
  const module = moduleDoc.data();
  if (phraseIndex !== undefined && phraseIndex !== null && phraseIndex !== '') {
    module.phrases[parseInt(phraseIndex)][field] = e.target.value;
  } else {
    module[field] = e.target.value;
  }
  await setDoc(doc(firestoreDB, 'modules', moduleId), module);
}

async function addPhrase(moduleId) {
  stopCurrentAudio();
  const moduleDoc = await getDoc(doc(firestoreDB, 'modules', moduleId));
  const module = moduleDoc.data();
  const newId = module.phrases.length > 0 ? Math.max(...module.phrases.map((p) => p.id)) + 1 : Date.now();
  module.phrases.push({ id: newId, en: '', kn: '', translit: '' });
  await setDoc(doc(firestoreDB, 'modules', moduleId), module);
  renderAuthorEditor();
}

async function deletePhrase(moduleId, phraseIndex) {
  stopCurrentAudio();
  const confirmed = await showConfirm('Are you sure?');
  if (confirmed) {
    const moduleDoc = await getDoc(doc(firestoreDB, 'modules', moduleId));
    const module = moduleDoc.data();
    module.phrases.splice(phraseIndex, 1);
    await setDoc(doc(firestoreDB, 'modules', moduleId), module);
    renderAuthorEditor();
  }
}

async function exportToJson() {
  const modulesSnapshot = await getDocs(collection(firestoreDB, 'modules'));
  const modules = [];
  modulesSnapshot.forEach((d) => modules.push(d.data()));
  const userData = await getData('userData', 'profile');
  const blob = new Blob([JSON.stringify({ modules, userData }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'kbb_export.json';
  a.click();
  URL.revokeObjectURL(url);
}

async function resetAllProgress() {
  const confirmed = await showConfirm('Are you sure you want to reset ALL progress? This cannot be undone.');
  if (!confirmed) return;
  await clearStore('userData');
  await clearStore('srs');
  await clearStore('progressLog');
  await clearStore('cardTracking');
  await addOrUpdate('userData', { key: 'profile', name: 'Cara', streak: 0, wordsLearned: [], accuracy: { correct: 0, total: 0 }, useGoogleTTS: false });
  showMessage('All progress has been reset.');
  import('./main.js').then(({ renderDashboardEntrypoint }) => renderDashboardEntrypoint());
}

async function toggleRecording(button, moduleId, phraseIndex) {
  stopCurrentAudio();
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    return;
  }
  try {
    stopActiveMicrophone();
    activeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const options = { mimeType: 'audio/webm; codecs=opus' };
    mediaRecorder = MediaRecorder.isTypeSupported(options.mimeType) ? new MediaRecorder(activeStream, options) : new MediaRecorder(activeStream);
    audioChunks = [];
    mediaRecorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) audioChunks.push(event.data);
    });
    mediaRecorder.onstop = async () => {
      stopActiveMicrophone();
      button.innerHTML = '🎙️';
      button.classList.remove('recording', 'text-red-500');
      button.disabled = false;
      if (audioChunks.length === 0) {
        showMessage('No audio data was recorded.');
        return;
      }
      const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
      if (audioBlob.size < 1000) {
        showMessage('Recording was too short or empty. Please try again.');
        return;
      }
      showMessage('Uploading audio...');
      try {
        const timestamp = Date.now();
        const fileName = `audio/${moduleId}_phrase_${phraseIndex}_${timestamp}.webm`;
        const storageRef = ref(storage, fileName);
        await uploadBytes(storageRef, audioBlob);
        const downloadURL = await getDownloadURL(storageRef);
        const moduleDocRef = doc(firestoreDB, 'modules', moduleId);
        const moduleDoc = await getDoc(moduleDocRef);
        if (!moduleDoc.exists()) throw new Error(`Module ${moduleId} not found`);
        const moduleData = moduleDoc.data();
        if (!moduleData.phrases?.[phraseIndex]) throw new Error(`Phrase at index ${phraseIndex} not found`);
        moduleData.phrases[phraseIndex].audioData = downloadURL;
        await setDoc(moduleDocRef, moduleData);
        const phraseElement = document.getElementById(`author-phrase-${moduleId}-${phraseIndex}`);
        if (phraseElement) {
          const audioContainer = phraseElement.querySelector('.audio-placeholder, audio');
          if (audioContainer) {
            const newAudio = document.createElement('audio');
            newAudio.controls = true;
            newAudio.className = 'w-24 h-8';
            newAudio.src = downloadURL;
            audioContainer.replaceWith(newAudio);
          }
        }
        document.getElementById('message-modal').classList.add('hidden');
        showMessage('Audio saved successfully!');
        document.getElementById('message-modal').classList.add('hidden');
      } catch (err) {
        console.error('Firebase upload/update error:', err);
        document.getElementById('message-modal').classList.add('hidden');
        showMessage(`Upload failed: ${err.message}. Check console and CORS settings.`);
      }
    };
    mediaRecorder.start();
    button.classList.add('recording', 'text-red-500');
    button.innerHTML = '⏹️';
  } catch (err) {
    console.error('Error accessing microphone:', err);
    showMessage('Microphone access denied. Please allow microphone access in your browser settings.');
    stopActiveMicrophone();
    button.innerHTML = '🎙️';
    button.classList.remove('recording', 'text-red-500');
  }
}

async function renderAuthorEditor() {
  const editor = document.getElementById('author-mode-view');
  const profile = (await getData('userData', 'profile')) || {};
  const isTtsEnabled = !!profile.useGoogleTTS;
  editor.innerHTML = `<div class="flex justify-between items-center mb-4"><h2 class="text-2xl font-bold">Admin Mode</h2><button id="exit-author-mode-btn" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg">Exit</button></div>
    <div class="mb-6 border-b pb-4">
      <h3 class="text-xl font-bold mb-2">Settings</h3>
      <div class="flex items-center justify-between">
        <label for="google-tts-toggle" class="font-semibold">Enable Google Text-To-Speech</label>
        <div class="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
          <input type="checkbox" name="google-tts-toggle" id="google-tts-toggle" class="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" ${isTtsEnabled ? 'checked' : ''}/>
          <label for="google-tts-toggle" class="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
        </div>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <button id="import-json-btn" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">Import JSON</button>
      <input type="file" id="json-file-input" class="hidden" accept=".json">
      <button id="export-json-btn" class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">Export JSON</button>
    </div>
    <h3 class="text-xl font-bold mb-2">Edit Modules & Phrases</h3>
    <div id="author-content-editor" class="space-y-4"></div>
    <button id="add-module-btn" class="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg">Add New Module</button>
    <div class="mt-6 border-t pt-4"><h3 class="text-xl font-bold mb-2 text-red-600">Danger Zone</h3><button id="reset-progress-btn" class="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg">Reset All Progress</button></div>`;

  const contentEditor = document.getElementById('author-content-editor');
  const modulesSnapshot = await getDocs(collection(firestoreDB, 'modules'));
  const modules = [];
  modulesSnapshot.forEach((d) => modules.push(d.data()));
  modules.sort((a, b) => moduleOrder.indexOf(a.id) - moduleOrder.indexOf(b.id));

  contentEditor.innerHTML = '';
  modules.forEach((module) => {
    const container = document.createElement('div');
    container.className = 'p-4 border rounded-lg';
    container.innerHTML = `<div class="flex justify-between items-center mb-2">
        <input class="text-xl font-bold border-b-2 flex-1 mr-2" value="${module.title}" data-module-id="${module.id}" data-field="title" />
        <input class="w-12 text-center border-b-2" value="${module.icon}" data-module-id="${module.id}" data-field="icon" />
      </div>
      <div class="phrases-container space-y-2">
        ${(module.phrases || [])
          .map(
            (p, i) => `<div id="author-phrase-${module.id}-${i}" class="grid grid-cols-6 gap-2 items-center p-2 bg-gray-50 rounded">
              <input class="border rounded px-2 py-1" placeholder="English" value="${p.en}" data-module-id="${module.id}" data-phrase-index="${i}" data-field="en" />
              <input class="border rounded px-2 py-1" placeholder="Kannada" value="${p.kn}" data-module-id="${module.id}" data-phrase-index="${i}" data-field="kn" />
              <input class="border rounded px-2 py-1 col-span-2" placeholder="Transliteration" value="${p.translit || ''}" data-module-id="${module.id}" data-phrase-index="${i}" data-field="translit" />
              ${p.audioData ? `<audio controls class=\"w-24 h-8\" src=\"${p.audioData}\"></audio>` : `<div class=\"w-24 h-8 audio-placeholder\"></div>`}
              <div class="flex items-center gap-2">
                <button class="text-xl" data-record-btn data-module-id="${module.id}" data-phrase-index="${i}">🎙️</button>
                <button class="text-red-500 hover:font-bold" data-delete-btn data-module-id="${module.id}" data-phrase-index="${i}">X</button>
              </div>
            </div>`
          )
          .join('')}
      </div>
      <button class="mt-2 text-blue-500 hover:font-bold" data-add-phrase-btn data-module-id="${module.id}">Add Phrase</button>`;
    contentEditor.appendChild(container);
  });
  contentEditor.querySelectorAll('input').forEach((input) => input.addEventListener('change', handleAuthorInputChange));
  contentEditor.querySelectorAll('[data-add-phrase-btn]').forEach((btn) => btn.addEventListener('click', (e) => addPhrase(e.currentTarget.dataset.moduleId)));
  contentEditor.querySelectorAll('[data-delete-btn]').forEach((btn) => btn.addEventListener('click', (e) => deletePhrase(e.currentTarget.dataset.moduleId, parseInt(e.currentTarget.dataset.phraseIndex))));
  contentEditor.querySelectorAll('[data-record-btn]').forEach((btn) => btn.addEventListener('click', (e) => toggleRecording(e.currentTarget, e.currentTarget.dataset.moduleId, parseInt(e.currentTarget.dataset.phraseIndex))));

  document.getElementById('exit-author-mode-btn').addEventListener('click', () => {
    document.getElementById('app-header').classList.remove('hidden');
    import('./main.js').then(({ renderDashboardEntrypoint }) => renderDashboardEntrypoint());
  });
  document.getElementById('add-module-btn').addEventListener('click', async () => {
    stopCurrentAudio();
    const title = await showPrompt('Enter new module title:');
    if (title) {
      const newModule = { id: title.toLowerCase().replace(/\s+/g, '-'), title, icon: '✨', phrases: [] };
      await setDoc(doc(firestoreDB, 'modules', newModule.id), newModule);
      renderAuthorEditor();
    }
  });
  document.getElementById('export-json-btn').addEventListener('click', exportToJson);
  const jsonFileInput = document.getElementById('json-file-input');
  document.getElementById('import-json-btn').addEventListener('click', () => jsonFileInput.click());
  jsonFileInput.addEventListener('change', (e) => {
    stopCurrentAudio();
    const fileInput = e.target;
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    const resetFileInput = () => {
      fileInput.value = '';
    };
    reader.onload = async (re) => {
      try {
        const data = JSON.parse(re.target.result);
        const modulesPayload = data.modules ?? [];

        const existingModulesSnapshot = await getDocs(collection(firestoreDB, 'modules'));
        const existingModuleIds = existingModulesSnapshot.docs.map((docSnap) => docSnap.id);
        const { toUpsert, toDelete } = computeModuleSync(existingModuleIds, modulesPayload);

        for (const module of toUpsert) {
          await setDoc(doc(firestoreDB, 'modules', module.id), module);
        }

        for (const moduleId of toDelete) {
          await deleteDoc(doc(firestoreDB, 'modules', moduleId));
        }

        const userRecords = normalizeUserDataRecords(data.userData);
        for (const record of userRecords) {
          await addOrUpdate('userData', record);
        }

        showMessage('Data imported successfully!');
        renderAuthorEditor();
      } catch (err) {
        console.error('Error importing JSON:', err);
        showMessage('Error importing JSON: ' + err.message);
      } finally {
        resetFileInput();
      }
    };
    reader.onerror = () => {
      console.error('Error reading JSON file:', reader.error);
      showMessage('Error reading JSON file: ' + (reader.error?.message || 'Unknown error'));
      resetFileInput();
    };
    reader.readAsText(file);
  });
  document.getElementById('reset-progress-btn').addEventListener('click', resetAllProgress);
  document.getElementById('google-tts-toggle').addEventListener('change', async (e) => {
    const profile = (await getData('userData', 'profile')) || {};
    profile.useGoogleTTS = e.target.checked;
    await addOrUpdate('userData', profile);
  });
}

export { renderAuthorEditor };

