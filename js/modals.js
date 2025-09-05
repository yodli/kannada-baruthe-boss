// Modal helpers: showMessage, showConfirm, showPrompt
import { stopCurrentAudio } from './audio.js';

function showMessage(text) {
  stopCurrentAudio();
  const modal = document.getElementById('message-modal');
  modal.innerHTML = `<div class="bg-white p-6 rounded-lg shadow-xl w-80 text-center">
      <p class="mb-4">${DOMPurify.sanitize(text)}</p>
      <button id="message-close" class="bg-emerald-500 text-white font-bold py-2 px-4 rounded">OK</button>
    </div>`;
  modal.classList.remove('hidden');
  modal.querySelector('#message-close').addEventListener('click', () => modal.classList.add('hidden'));
}

function showConfirm(message) {
  stopCurrentAudio();
  return new Promise((resolve) => {
    const modal = document.getElementById('confirm-modal');
    modal.innerHTML = `<div class="bg-white p-6 rounded-lg shadow-xl w-96 text-center">
        <p class="mb-4">${DOMPurify.sanitize(message)}</p>
        <div class="flex justify-center gap-4">
          <button id="confirm-yes" class="bg-red-500 text-white font-bold py-2 px-4 rounded">Yes</button>
          <button id="confirm-no" class="bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded">No</button>
        </div>
      </div>`;
    modal.classList.remove('hidden');
    modal.querySelector('#confirm-yes').addEventListener('click', () => { modal.classList.add('hidden'); resolve(true); });
    modal.querySelector('#confirm-no').addEventListener('click', () => { modal.classList.add('hidden'); resolve(false); });
  });
}

function showPrompt(text) {
  stopCurrentAudio();
  return new Promise((resolve) => {
    const modal = document.getElementById('prompt-modal');
    modal.innerHTML = `<div class="bg-white p-6 rounded-lg shadow-xl w-96 text-center">
        <p class="mb-2">${DOMPurify.sanitize(text)}</p>
        <input id="prompt-input" class="w-full p-2 border rounded mb-4" />
        <div class="flex justify-center gap-4">
          <button id="prompt-ok" class="bg-emerald-500 text-white font-bold py-2 px-4 rounded">OK</button>
          <button id="prompt-cancel" class="bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded">Cancel</button>
        </div>
      </div>`;
    modal.classList.remove('hidden');
    const input = modal.querySelector('#prompt-input');
    input.focus();
    const close = (val) => { modal.classList.add('hidden'); resolve(val); };
    modal.querySelector('#prompt-ok').addEventListener('click', () => close(input.value));
    modal.querySelector('#prompt-cancel').addEventListener('click', () => close(null));
    input.addEventListener('keyup', (e) => { if (e.key === 'Enter') close(input.value); });
  });
}

export { showMessage, showConfirm, showPrompt };

