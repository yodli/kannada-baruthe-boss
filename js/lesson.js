// Lesson logic and flashcards
import { firestoreDB, collection, doc, getDoc, getDocs } from './firebase.js';
import { addOrUpdate, getData } from './db.js';
import { showView } from './ui.js';
import { speak, stopCurrentAudio } from './audio.js';
import { showMessage } from './modals.js';

let currentModule = null;
let currentPhraseIndex = 0;
let isFlipped = false;
let currentPhrase = null;

function getFlashcardCanvas() {
  const canvas = document.getElementById('flashcard-canvas');
  return { canvas, ctx: canvas.getContext('2d') };
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, isMobile) {
  const words = (text || '').split(' ');
  let line = '';
  const lines = [];
  const adjustedMaxWidth = isMobile ? maxWidth * 0.9 : maxWidth;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const testWidth = ctx.measureText(testLine).width;
    if (testWidth > adjustedMaxWidth && n > 0) {
      lines.push(line.trim());
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  if (line.trim()) lines.push(line.trim());
  const totalHeight = lines.length * lineHeight;
  const startY = y - totalHeight / 2 + lineHeight / 2;
  for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], x, startY + i * lineHeight);
  return lines.length;
}

function drawFlashcard(phrase, showKannada) {
  const { canvas, ctx } = getFlashcardCanvas();
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  ctx.fillStyle = '#FFFBEB';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const isMobile = window.innerWidth <= 768;
  const padding = isMobile ? 30 : 40;
  const maxWidth = canvas.width - padding * 2;

  if (showKannada) {
    const kannadaFontSize = isMobile ? Math.min(24, canvas.width / 15) : 28;
    const translitFontSize = isMobile ? Math.min(16, canvas.width / 25) : 18;
    const kannadaLineHeight = kannadaFontSize * 1.4;
    const translitLineHeight = translitFontSize * 1.4;
    ctx.font = `bold ${kannadaFontSize}px Inter`;
    ctx.fillStyle = '#10B981';
    const kannadaLines = wrapText(ctx, phrase.kn, centerX, centerY - 20, maxWidth, kannadaLineHeight, isMobile);
    ctx.font = `${translitFontSize}px Inter`;
    ctx.fillStyle = '#6B7280';
    const translitY = centerY + (kannadaLines * kannadaLineHeight) / 2 + 15;
    wrapText(ctx, phrase.translit, centerX, translitY, maxWidth, translitLineHeight, isMobile);
  } else {
    const englishFontSize = isMobile ? Math.min(24, canvas.width / 12) : 28;
    const englishLineHeight = englishFontSize * 1.4;
    ctx.font = `bold ${englishFontSize}px Inter`;
    ctx.fillStyle = '#10B981';
    wrapText(ctx, phrase.en, centerX, centerY, maxWidth, englishLineHeight, isMobile);
  }

  const instructionFontSize = isMobile ? 12 : 14;
  ctx.font = `${instructionFontSize}px Inter`;
  ctx.fillStyle = '#9CA3AF';
  ctx.fillText('Tap to flip', centerX, canvas.height - (isMobile ? 15 : 20));
}

function showFlashcard() {
  document.getElementById('flashcard-activity').classList.remove('hidden');
  isFlipped = false;
  currentPhrase = currentModule.lessonPhrases[currentPhraseIndex];
  drawFlashcard(currentPhrase, isFlipped);
  document.getElementById('replay-audio-btn').classList.add('hidden');
}

async function updateProgress(wasCorrect, phraseId) {
  stopCurrentAudio();
  const profile = (await getData('userData', 'profile')) || { accuracy: { correct: 0, total: 0 }, wordsLearned: [] };
  profile.accuracy.total++;
  let tracking = (await new Promise((res) => res())) || null; // placeholder for potential future tracking fetching
  if (wasCorrect) {
    profile.accuracy.correct++;
    const wasAlreadyLearned = profile.wordsLearned.includes(phraseId);
    if (!wasAlreadyLearned) profile.wordsLearned.push(phraseId);
  }
  await addOrUpdate('userData', profile);
}

async function startLesson(moduleId) {
  stopCurrentAudio();
  const moduleDoc = await getDoc(doc(firestoreDB, 'modules', moduleId));
  currentModule = moduleDoc.data();
  if (!currentModule || (currentModule.phrases || []).length === 0) {
    showMessage('This module has no phrases yet.');
    return;
  }

  const profile = (await getData('userData', 'profile')) || { wordsLearned: [] };
  const learnedIds = profile.wordsLearned || [];
  const unlearnedPhrases = (currentModule.phrases || []).filter((p) => !learnedIds.includes(p.id));
  const learnedPhrases = (currentModule.phrases || []).filter((p) => learnedIds.includes(p.id));

  const priorityPhrases = [];
  for (const phrase of learnedPhrases) {
    // basic priority placeholder
    // could read tracking from IndexedDB 'cardTracking' if needed
  }

  let lessonPhrases = [];
  lessonPhrases.push(...unlearnedPhrases.slice(0, 5));
  if (lessonPhrases.length < 5) {
    const remaining = 5 - lessonPhrases.length;
    lessonPhrases.push(...priorityPhrases.slice(0, remaining));
  }
  if (lessonPhrases.length < 5) {
    const remaining = 5 - lessonPhrases.length;
    const availableLearned = learnedPhrases.filter((p) => !priorityPhrases.includes(p));
    const shuffled = availableLearned.sort(() => 0.5 - Math.random());
    lessonPhrases.push(...shuffled.slice(0, remaining));
  }

  const usedInSession = new Set();
  currentModule.lessonPhrases = lessonPhrases.filter((phrase) => {
    if (usedInSession.has(phrase.id)) return false;
    usedInSession.add(phrase.id);
    return true;
  });

  document.getElementById('lesson-title').textContent = currentModule.title;
  showView('lesson');
  document.getElementById('app-header').classList.add('hidden');
  currentPhraseIndex = 0;
  nextActivity();
}

async function endLesson() {
  stopCurrentAudio();
  document.getElementById('app-header').classList.remove('hidden');
  // show a random trivia modal if available then go dashboard
  try {
    const triviaSnapshot = await getDocs(collection(firestoreDB, 'trivia'));
    const items = [];
    triviaSnapshot.forEach((d) => items.push(d.data()));
    if (items.length) {
      const t = items[Math.floor(Math.random() * items.length)];
      const modal = document.getElementById('trivia-modal');
      modal.innerHTML = `<div class="bg-white p-6 rounded-lg shadow-xl w-96 text-center"><h3 class="text-lg font-bold mb-2">Did you know?</h3><p class="mb-2">${t.q}</p><p class="font-bold text-emerald-600 mb-4">${t.answer}</p><button id="trivia-close" class="bg-emerald-500 text-white font-bold py-2 px-4 rounded">Continue</button></div>`;
      modal.classList.remove('hidden');
      modal.querySelector('#trivia-close').addEventListener('click', () => {
        modal.classList.add('hidden');
        import('./main.js').then(({ renderDashboardEntrypoint }) => renderDashboardEntrypoint());
      });
      return;
    }
  } catch {}
  import('./main.js').then(({ renderDashboardEntrypoint }) => renderDashboardEntrypoint());
}

function nextActivity() {
  stopCurrentAudio();
  if (currentPhraseIndex >= currentModule.lessonPhrases.length) {
    endLesson();
    return;
  }
  showFlashcard();
  currentPhraseIndex++;
}

function wireFlashcardInteractions() {
  const canvas = document.getElementById('flashcard-canvas');
  canvas?.addEventListener('click', () => {
    isFlipped = !isFlipped;
    drawFlashcard(currentPhrase, isFlipped);
    if (isFlipped) {
      speak(currentPhrase);
      document.getElementById('replay-audio-btn').classList.remove('hidden');
    } else {
      stopCurrentAudio();
      document.getElementById('replay-audio-btn').classList.add('hidden');
    }
  });

  document.getElementById('replay-audio-btn')?.addEventListener('click', () => {
    if (isFlipped && currentPhrase) speak(currentPhrase);
  });

  document.getElementById('flashcard-right')?.addEventListener('click', () => {
    updateProgress(true, currentPhrase.id);
    document.getElementById('replay-audio-btn').classList.add('hidden');
    nextActivity();
  });
  document.getElementById('flashcard-wrong')?.addEventListener('click', () => {
    updateProgress(false, currentPhrase.id);
    document.getElementById('replay-audio-btn').classList.add('hidden');
    nextActivity();
  });
}

export { startLesson, endLesson, wireFlashcardInteractions };

