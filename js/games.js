// Games logic
import { showView, getLearnedPhrases, checkGameAccess } from './ui.js';
import { speak, stopCurrentAudio } from './audio.js';
import { showMessage } from './modals.js';
import { firestoreDB, collection, getDocs } from './firebase.js';

const gameContainer = () => document.getElementById('game-container');
let activeGame = null;
let gameLoopId = null;
let timerIntervalId = null;
let gameState = {};

function resetGameRuntime() {
  if (gameLoopId) cancelAnimationFrame(gameLoopId);
  gameLoopId = null;
  if (timerIntervalId) clearInterval(timerIntervalId);
  timerIntervalId = null;
  gameState = {};
  const gc = gameContainer();
  if (gc) gc.innerHTML = '';
}

function exitGame() {
  stopCurrentAudio();
  if (gameLoopId) cancelAnimationFrame(gameLoopId);
  if (timerIntervalId) clearInterval(timerIntervalId);
  activeGame = null;
  import('./main.js').then(({ renderDashboardEntrypoint }) => renderDashboardEntrypoint());
}

class Card {
  constructor(id, text, type, x, y, width, height) {
    this.id = id;
    this.text = text;
    this.type = type;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.state = 'hidden';
    this.selected = false;
  }
  draw(ctx) {
    const isMobile = window.innerWidth <= 768;
    ctx.strokeStyle = this.selected ? '#4F46E5' : '#34D399';
    ctx.lineWidth = this.selected ? 5 : 3;
    ctx.fillStyle = this.state === 'matched' ? '#A7F3D0' : this.state === 'revealed' ? '#FFFBEB' : '#10B981';
    ctx.beginPath();
    const r = 10;
    ctx.moveTo(this.x + r, this.y);
    ctx.arcTo(this.x + this.width, this.y, this.x + this.width, this.y + this.height, r);
    ctx.arcTo(this.x + this.width, this.y + this.height, this.x, this.y + this.height, r);
    ctx.arcTo(this.x, this.y + this.height, this.x, this.y, r);
    ctx.arcTo(this.x, this.y, this.x + this.width, this.y, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Hide text when card is hidden (for Memory Grid). Show text only when revealed or matched.
    if (this.state !== 'hidden') {
      const centerX = this.x + this.width / 2;
      const centerY = this.y + this.height / 2;
      const maxWidth = this.width - 16;
      let fontSize = Math.max(10, Math.min(18, Math.floor(this.width / 10)));
      ctx.font = `bold ${fontSize}px Inter`;
      ctx.fillStyle = '#065F46';
      ctx.textAlign = 'center';

      const words = (this.text || '').split(' ');
      if (words.length > 1 && this.text.length > 15) {
        const firstLine = words.slice(0, Math.ceil(words.length / 2)).join(' ');
        const secondLine = words.slice(Math.ceil(words.length / 2)).join(' ');
        const firstWidth = ctx.measureText(firstLine).width;
        const secondWidth = ctx.measureText(secondLine).width;
        if (firstWidth > maxWidth || secondWidth > maxWidth) {
          const smaller = Math.max(8, fontSize - 2);
          ctx.font = `bold ${smaller}px Inter`;
        }
        ctx.fillText(firstLine, centerX, centerY - fontSize / 2);
        ctx.fillText(secondLine, centerX, centerY + fontSize / 2);
      } else {
        const width = ctx.measureText(this.text).width;
        if (width > maxWidth) {
          const smaller = Math.max(8, fontSize - 2);
          ctx.font = `bold ${smaller}px Inter`;
        }
        ctx.fillText(this.text, centerX, centerY);
      }
    }
  }
  isClicked(mx, my) {
    return mx > this.x && mx < this.x + this.width && my > this.y && my < this.y + this.height;
  }
}

async function getPhrasesForGame(count) {
  const phrases = await getLearnedPhrases(firestoreDB);
  if ((phrases || []).length < count) {
    showMessage(`You need at least ${count} learned phrases to play.`);
    return [];
  }
  return phrases.sort(() => 0.5 - Math.random()).slice(0, count);
}

function gameLoop() {
  const canvas = gameContainer().querySelector('#game-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  (gameState.cards || []).forEach((c) => c.draw(ctx));
  if (!gameState.gameOver) gameLoopId = requestAnimationFrame(gameLoop);
}

function updateTimer() {
  gameState.timeLeft--;
  gameContainer().querySelector('#game-timer').textContent = `Time: ${gameState.timeLeft}s`;
  if (gameState.timeLeft <= 0) {
    gameState.gameOver = true;
    clearInterval(timerIntervalId);
    showMessage(`Time's up! Final Score: ${gameState.score}`);
    exitGame();
  }
}

function checkWinCondition() {
  const allMatched = gameState.cards.every((c) => c.state === 'matched');
  if (allMatched) {
    clearInterval(timerIntervalId);
    gameState.gameOver = true;
    gameState.score += gameState.timeLeft || 0;
    setTimeout(() => {
      showMessage(`You won! Final Score: ${gameState.score}`);
      exitGame();
    }, 500);
  }
}

function setupGameCanvas() {
  const timerHTML = activeGame !== 'MemoryGrid' ? `<div id="game-timer">Time: ${gameState.timeLeft}s</div>` : '';
  gameContainer().innerHTML = `<div class="flex justify-around mb-2 text-lg font-bold">${timerHTML}<div id="game-score">Score: 0</div></div><canvas id="game-canvas" class="w-full h-96 rounded-lg bg-gray-100 cursor-pointer"></canvas>`;
  const canvas = gameContainer().querySelector('#game-canvas');
  requestAnimationFrame(() => {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    canvas.addEventListener('click', (e) => {
      if (activeGame === 'SpeedMatch' || activeGame === 'MemoryGrid') handleCardGameClick(e);
    });
    if (activeGame === 'SpeedMatch' || activeGame === 'MemoryGrid') {
      const phrases = gameState.phrases;
      let cardData = [];
      phrases.forEach((p) => {
        cardData.push({ id: p.id, text: p.en, type: 'en' });
        cardData.push({ id: p.id, text: p.kn, type: 'kn' });
      });
      cardData.sort(() => 0.5 - Math.random());
      const cols = 4,
        rows = 4;
      const cardWidth = (canvas.width - (cols + 1) * 10) / cols;
      const cardHeight = (canvas.height - (rows + 1) * 10) / rows;
      for (let i = 0; i < cardData.length; i++) {
        const row = Math.floor(i / cols),
          col = i % cols;
        const x = col * (cardWidth + 10) + 10,
          y = row * (cardHeight + 10) + 10;
        const card = new Card(cardData[i].id, cardData[i].text, cardData[i].type, x, y, cardWidth, cardHeight);
        if (activeGame === 'SpeedMatch') card.state = 'revealed';
        gameState.cards.push(card);
      }
      gameLoopId = requestAnimationFrame(gameLoop);
    }
  });
}

function handleCardGameClick(e) {
  stopCurrentAudio();
  if (gameState.gameOver || gameState.selected.length === 2) return;
  // Disable clicks during Memory Grid memorize phase
  if (activeGame === 'MemoryGrid' && gameState.memorizeUntil && Date.now() < gameState.memorizeUntil) {
    return;
  }
  const canvas = gameContainer().querySelector('#game-canvas');
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  for (const card of gameState.cards) {
    if (card.state !== 'matched' && !card.selected && card.isClicked(mouseX, mouseY)) {
      if (activeGame === 'MemoryGrid' && card.state === 'hidden') card.state = 'revealed';
      card.selected = true;
      gameState.selected.push(card);
      break;
    }
  }
  if (gameState.selected.length === 2) {
    const [c1, c2] = gameState.selected;
    if (c1.id === c2.id && c1.type !== c2.type) {
      c1.state = 'matched';
      c2.state = 'matched';
      gameState.score += 10;
      gameContainer().querySelector('#game-score').textContent = `Score: ${gameState.score}`;
      gameState.selected = [];
      checkWinCondition();
    } else {
      setTimeout(() => {
        if (activeGame === 'MemoryGrid') {
          c1.state = 'hidden';
          c2.state = 'hidden';
        }
        c1.selected = false;
        c2.selected = false;
        gameState.selected = [];
      }, 500);
    }
  }
}

async function startSpeedMatchGame() {
  resetGameRuntime();
  if (!(await checkGameAccess())) return;
  stopCurrentAudio();
  const phrases = await getPhrasesForGame(8);
  if (phrases.length === 0) return;
  activeGame = 'SpeedMatch';
  document.getElementById('game-title').textContent = 'Speed Match';
  // Clear container before showing to avoid flicker of previous game UI
  gameContainer().innerHTML = '';
  showView('game');
  gameState = { cards: [], selected: [], score: 0, gameOver: false, timeLeft: 60, phrases };
  setupGameCanvas();
  timerIntervalId = setInterval(updateTimer, 1000);
}

async function startMemoryGridGame() {
  resetGameRuntime();
  if (!(await checkGameAccess())) return;
  stopCurrentAudio();
  const phrases = await getPhrasesForGame(8);
  if (phrases.length === 0) return;
  activeGame = 'MemoryGrid';
  document.getElementById('game-title').textContent = 'Memory Grid';
  // Clear container before showing to avoid flicker of previous game UI
  gameContainer().innerHTML = '';
  showView('game');
  gameState = { cards: [], selected: [], score: 0, gameOver: false, phrases, memorizeUntil: 0 };
  setupGameCanvas();

  // Run memorize phase after cards are created in setupGameCanvas's rAF
  requestAnimationFrame(() => {
    // Memorization phase: reveal all for 5 seconds with countdown, then hide
    const banner = document.createElement('div');
    banner.id = 'memorize-banner';
    banner.className = 'text-center mb-2 text-lg font-bold text-emerald-700';
    banner.innerHTML = `Memorize the cards: <span id="memorize-countdown">5</span>s`;
    const header = gameContainer().firstElementChild; // header with score (and maybe timer)
    header.parentNode.insertBefore(banner, header.nextSibling);

    // Reveal all cards and set block-click window
    (gameState.cards || []).forEach((c) => (c.state = 'revealed'));
    gameState.memorizeUntil = Date.now() + 5000;

    let remaining = 5;
    const cd = setInterval(() => {
      remaining -= 1;
      const el = document.getElementById('memorize-countdown');
      if (el) el.textContent = String(remaining);
      if (remaining <= 0) {
        clearInterval(cd);
        banner.remove();
        (gameState.cards || []).forEach((c) => {
          if (c.state !== 'matched') c.state = 'hidden';
        });
      }
    }, 1000);
  });
}

async function startListenTapGame() {
  resetGameRuntime();
  if (!(await checkGameAccess())) return;
  stopCurrentAudio();
  activeGame = 'ListenTap';
  document.getElementById('game-title').textContent = 'Listen & Tap';
  gameContainer().innerHTML = '';
  showView('game');
  const phrases = await getPhrasesForGame(20);
  if (phrases.length < 4) return;
  gameState = { questions: phrases.slice(0, 5), currentQuestionIndex: 0, score: 0 };
  renderListenTapQuestion();
}

async function renderListenTapQuestion() {
  if (gameState.currentQuestionIndex >= gameState.questions.length) {
    showMessage(`Game Over! Your score: ${gameState.score} / 5`);
    exitGame();
    return;
  }
  const correctPhrase = gameState.questions[gameState.currentQuestionIndex];
  const allPhrases = await getLearnedPhrases(firestoreDB);
  const wrongOptions = allPhrases.filter((p) => p.id !== correctPhrase.id).sort(() => 0.5 - Math.random()).slice(0, 3);
  const options = [correctPhrase, ...wrongOptions].sort(() => 0.5 - Math.random());
  gameContainer().innerHTML = `<div class="text-center mb-6"><button id="play-audio-btn" class="p-4 bg-blue-500 text-white rounded-full shadow-lg text-3xl">🔊</button><p class="mt-2 text-gray-600">Tap to hear the phrase</p></div><div id="listen-options" class="grid grid-cols-1 gap-3">${options
    .map((opt) => `<button class="game-option p-4 bg-gray-100 hover:bg-gray-200 rounded-lg border-2 border-transparent shadow-sm text-lg text-container">${opt.en}</button>`)
    .join('')}</div><div class="mt-4 text-center font-bold text-lg">Score: ${gameState.score} | Question: ${gameState.currentQuestionIndex + 1} / 5</div>`;
  document.getElementById('play-audio-btn').onclick = () => speak(correctPhrase);
  document.querySelectorAll('.game-option').forEach((btn) => (btn.onclick = (e) => handleListenTapAnswer(e, correctPhrase)));
}

function handleListenTapAnswer(e, correctPhrase) {
  stopCurrentAudio();
  const isCorrect = e.target.textContent === correctPhrase.en;
  if (isCorrect) {
    gameState.score++;
    e.target.classList.add('correct-answer');
  } else {
    e.target.classList.add('incorrect-answer');
  }
  document.querySelectorAll('.game-option').forEach((btn) => {
    btn.disabled = true;
    if (btn.textContent === correctPhrase.en) btn.classList.add('correct-answer');
  });
  gameState.currentQuestionIndex++;
  setTimeout(renderListenTapQuestion, 1500);
}

async function startFillBlanksGame() {
  resetGameRuntime();
  if (!(await checkGameAccess())) return;
  stopCurrentAudio();
  activeGame = 'FillBlanks';
  document.getElementById('game-title').textContent = 'Fill in the Blanks';
  gameContainer().innerHTML = '';
  showView('game');
  const allPhrases = await getPhrasesForGame(100);
  const suitablePhrases = allPhrases.filter((p) => p.kn.split(' ').length > 1);
  if (suitablePhrases.length < 5) {
    showMessage('Not enough multi-word phrases unlocked. Learn 100 words to play this game.');
    exitGame();
    return;
  }
  gameState = { questions: suitablePhrases.slice(0, 5), currentQuestionIndex: 0, score: 0 };
  renderFillBlanksQuestion();
}

async function renderFillBlanksQuestion() {
  if (gameState.currentQuestionIndex >= gameState.questions.length) {
    showMessage(`Game Over! Your score: ${gameState.score} / 5`);
    exitGame();
    return;
  }
  const questionData = gameState.questions[gameState.currentQuestionIndex];
  const words = questionData.kn.split(' ');
  const blankIndex = Math.floor(Math.random() * words.length);
  const correctWord = words[blankIndex];
  words[blankIndex] = '______';
  const questionText = words.join(' ');
  const allPhrases = await getLearnedPhrases(firestoreDB);
  const wrongWords = [...new Set(allPhrases.flatMap((p) => p.kn.split(' ')))].filter((w) => w !== correctWord).sort(() => 0.5 - Math.random()).slice(0, 3);
  const options = [correctWord, ...wrongWords].sort(() => 0.5 - Math.random());
  gameContainer().innerHTML = `<div class="text-center mb-4"><p class="text-lg text-gray-600 break-words text-container">${questionData.en}</p><p class="text-2xl font-semibold my-4 break-words text-container">${questionText}</p></div><div id="fill-options" class="grid grid-cols-2 gap-3">${options
    .map((opt) => `<button class="game-option p-4 bg-gray-100 hover:bg-gray-200 rounded-lg border-2 border-transparent shadow-sm text-lg">${opt}</button>`)
    .join('')}</div><div class="mt-4 text-center font-bold text-lg">Score: ${gameState.score} | Question: ${gameState.currentQuestionIndex + 1} / 5</div>`;
  document.querySelectorAll('.game-option').forEach((btn) => (btn.onclick = (e) => handleFillBlanksAnswer(e, correctWord)));
}

function handleFillBlanksAnswer(e, correctWord) {
  stopCurrentAudio();
  const isCorrect = e.target.textContent === correctWord;
  if (isCorrect) {
    gameState.score++;
    e.target.classList.add('correct-answer');
  } else {
    e.target.classList.add('incorrect-answer');
  }
  document.querySelectorAll('.game-option').forEach((btn) => {
    btn.disabled = true;
    if (btn.textContent === correctWord) btn.classList.add('correct-answer');
  });
  gameState.currentQuestionIndex++;
  setTimeout(renderFillBlanksQuestion, 1500);
}

async function startSentenceBuilderGame() {
  resetGameRuntime();
  if (!(await checkGameAccess())) return;
  stopCurrentAudio();
  activeGame = 'SentenceBuilder';
  document.getElementById('game-title').textContent = 'Sentence Builder';
  gameContainer().innerHTML = '';
  showView('game');
  const phrases = await getPhrasesForGame(20);
  const longPhrases = phrases.filter((p) => p.translit && p.translit.split('-').length > 2);
  if (longPhrases.length < 5) {
    showMessage('Not enough complex phrases to play.');
    exitGame();
    return;
  }
  gameState = { questions: longPhrases.slice(0, 5), currentQuestionIndex: 0, score: 0 };
  renderSentenceBuilderQuestion();
}

function renderSentenceBuilderQuestion() {
  if (gameState.currentQuestionIndex >= gameState.questions.length) {
    showMessage(`Game Over! Your score: ${gameState.score} / 5`);
    exitGame();
    return;
  }
  const phrase = gameState.questions[gameState.currentQuestionIndex];
  const words = phrase.translit.split('-');
  const shuffledWords = [...words].sort(() => 0.5 - Math.random());
  gameContainer().innerHTML = `<div class="text-center mb-4"><p class="text-lg text-gray-600 text-container">Translate this sentence:</p><p class="text-2xl font-semibold my-2 break-words text-container">"${phrase.en}"</p></div><div id="sentence-answer" class="p-4 bg-gray-200 rounded-lg min-h-[50px] mb-4 text-center text-xl font-semibold break-words text-container"></div><div id="word-bank" class="flex flex-wrap justify-center gap-2">${shuffledWords
    .map((w) => `<button class="word-tile p-2 bg-indigo-100 rounded-md shadow-sm">${w}</button>`)
    .join('')}</div><div class="mt-6 flex justify-center gap-4"><button id="check-sentence-btn" class="bg-green-500 text-white font-bold py-2 px-6 rounded-lg">Check</button><button id="clear-sentence-btn" class="bg-gray-400 text-white font-bold py-2 px-6 rounded-lg">Clear</button></div><div class="mt-4 text-center font-bold text-lg">Score: ${gameState.score} | Question: ${gameState.currentQuestionIndex + 1} / 5</div>`;
  const answerArea = document.getElementById('sentence-answer');
  const wordBank = document.getElementById('word-bank');
  wordBank.addEventListener('click', (e) => {
    if (e.target.matches('.word-tile')) {
      stopCurrentAudio();
      answerArea.textContent = `${answerArea.textContent} ${e.target.textContent}`.trim();
    }
  });
  document.getElementById('clear-sentence-btn').addEventListener('click', () => {
    stopCurrentAudio();
    answerArea.textContent = '';
  });
  document.getElementById('check-sentence-btn').addEventListener('click', () => {
    stopCurrentAudio();
    const isCorrect = answerArea.textContent.trim() === phrase.translit.replace(/\s+/g, ' ').trim().split('-').join(' ');
    if (isCorrect) gameState.score++;
    showMessage(isCorrect ? 'Correct!' : `Correct answer: ${phrase.translit.split('-').join(' ')}`);
    gameState.currentQuestionIndex++;
    setTimeout(renderSentenceBuilderQuestion, 1000);
  });
}

async function startTriviaGame() {
  resetGameRuntime();
  if (!(await checkGameAccess())) return;
  stopCurrentAudio();
  activeGame = 'Trivia';
  document.getElementById('game-title').textContent = 'Karnataka Trivia';
  gameContainer().innerHTML = '';
  showView('game');
  const triviaSnapshot = await getDocs(collection(firestoreDB, 'trivia'));
  const items = [];
  triviaSnapshot.forEach((d) => items.push(d.data()));
  if (items.length < 3) {
    showMessage('Not enough trivia questions to play yet. Need at least 3.');
    exitGame();
    return;
  }
  const shuffled = [...items].sort(() => 0.5 - Math.random());
  const state = { questions: shuffled.slice(0, 3), currentQuestionIndex: 0, score: 0 };
  function renderTriviaQuestion() {
    if (state.currentQuestionIndex >= state.questions.length) {
      showMessage(`Trivia Complete! Your score: ${state.score} / ${state.questions.length}`);
      exitGame();
      return;
    }
    const q = state.questions[state.currentQuestionIndex];
    const options = [...q.options].sort(() => 0.5 - Math.random());
    gameContainer().innerHTML = `<div class="text-center">
      <p class="text-xl mb-4">${q.q}</p>
      <div class="grid grid-cols-1 gap-3">
        ${options.map((o) => `<button class="game-option p-4 bg-gray-100 hover:bg-gray-200 rounded-lg border-2 border-transparent shadow-sm text-lg text-container">${o}</button>`).join('')}
      </div>
      <div class="mt-4 text-center font-bold text-lg">Score: ${state.score} | Question: ${state.currentQuestionIndex + 1} / ${state.questions.length}</div>
    </div>`;
    document.querySelectorAll('.game-option').forEach((btn) => {
      btn.onclick = (e) => {
        const isCorrect = e.target.textContent === q.answer;
        if (isCorrect) state.score++;
        state.currentQuestionIndex++;
        renderTriviaQuestion();
      };
    });
  }
  renderTriviaQuestion();
}

export {
  startSpeedMatchGame,
  startMemoryGridGame,
  startListenTapGame,
  startFillBlanksGame,
  startSentenceBuilderGame,
  startTriviaGame,
  exitGame,
};
