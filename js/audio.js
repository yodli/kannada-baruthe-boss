// Audio management and TTS helpers
import { getData } from './db.js';
import { GOOGLE_API_KEY } from './config.js';
import { showMessage } from './modals.js';

let currentAudio = null;
let audioUnlocked = false;

function stopCurrentAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }
}

function unlockAudioContext() {
  if (audioUnlocked) return;
  const sound = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
  sound
    .play()
    .then(() => {
      audioUnlocked = true;
      document.body.removeEventListener('click', unlockAudioContext);
      console.log('Audio unlocked.');
    })
    .catch((e) => console.error('Audio unlock failed.', e));
}

async function speakTTS(phrase) {
  const profile = await getData('userData', 'profile');
  if (!profile?.useGoogleTTS || !GOOGLE_API_KEY) {
    if (profile?.useGoogleTTS) console.warn("Google API Key not set. Using browser's default TTS.");
    const utterance = new SpeechSynthesisUtterance(phrase.kn);
    utterance.lang = 'kn-IN';
    window.speechSynthesis.speak(utterance);
    return;
  }

  const ttsApiUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_API_KEY}`;
  const requestBody = {
    input: { text: phrase.kn },
    voice: { languageCode: 'kn-IN', name: 'kn-IN-Wavenet-A' },
    audioConfig: { audioEncoding: 'MP3' },
  };

  const response = await fetch(ttsApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
  if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
  const data = await response.json();
  if (data.audioContent) {
    stopCurrentAudio();
    currentAudio = new Audio('data:audio/mp3;base64,' + data.audioContent);
    await currentAudio.play();
  }
}

async function speak(phrase) {
  stopCurrentAudio();
  const profile = await getData('userData', 'profile');

  // 1) Try custom audio data
  if (phrase?.audioData) {
    try {
      currentAudio = new Audio(phrase.audioData);
      await currentAudio.play();
      return;
    } catch (e) {
      console.error('Custom audio playback failed:', e.name, e.message);
      if (e.name === 'NotSupportedError') {
        console.warn("Recorded audio format not supported, falling back to TTS.");
        showMessage("Couldn't play recording, using voice synthesis.");
      }
      // Fallthrough
    }
  }

  // 2) Try Google TTS
  if (profile?.useGoogleTTS && GOOGLE_API_KEY) {
    try {
      await speakTTS(phrase);
      return;
    } catch (err) {
      console.error('Google TTS failed, falling back to browser TTS:', err);
    }
  }

  // 3) Fallback
  try {
    const utterance = new SpeechSynthesisUtterance(phrase.kn);
    utterance.lang = 'kn-IN';
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.error('Browser TTS also failed:', error);
    showMessage('Audio playback is not available on this device.');
  }
}

export { speak, speakTTS, stopCurrentAudio, unlockAudioContext };

