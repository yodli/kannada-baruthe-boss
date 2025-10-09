# Kannada Baruthe, Boss

**Kannada Baruthe, Boss** is a lightweight Progressive Web App that teaches basic spoken Kannada through interactive flashcards and mini‑games. The app runs entirely in the browser, works offline, and stores progress locally so learners can pick up where they left off.

## Features

- 📚 **Phrase Modules** – Structured lessons with English, Kannada, and transliterated text (see `data/kbb_modules*.json`).
- 🃏 **Flashcards & SRS** – Spaced‑repetition flashcards with text‑to‑speech playback.
- 🎮 **Mini‑games** – Speed Match, Memory Grid, Trivia, Fill‑in‑the‑Blanks, Listen & Tap, and Sentence Builder.
- 📈 **Progress Tracking** – Accuracy stats, learned words count, and calendar heat‑map.
- 👤 **User Profile** – Editable display name and profile picture stored in the browser.
- 📱 **PWA Support** – `manifest.json` and `service-worker.js` enable installation and offline usage.
- 🎨 **Tailwind CSS** – Rapid styling with the Tailwind CDN.

## Project Structure

kannada-baruthe-boss/
├── index.html # Main app interface and all JS logic
├── manifest.json # PWA manifest and embedded icons
├── service-worker.js # Caching and offline support
├── data/
│ ├── kbb_modules.json # Lesson data (English transliteration)
│ └── kbb_modules_kannada.json # Lesson data (with Kannada script)
├── docs/
│ ├── notes.txt
│ └── specs.docx

## Test on localhost:8000 server:

python3 -m http.server 8000

## Getting Started

1. **Clone the repository**

   git clone https://github.com/<your-user>/kannada-baruthe-boss.git
   cd kannada-baruthe-boss

## Runtime configuration

The app expects Firebase and Google Cloud Text-to-Speech credentials at runtime. This repository no longer ships with real keys.

1. Copy `config/runtime-config.example.js` to `config/runtime-config.js`.
2. Fill in the Firebase project settings and optional Google TTS key.
3. Keep `config/runtime-config.js` out of source control—it's listed in `.gitignore` to help prevent accidental commits.

Without these credentials the UI will load a warning message and skip all Firestore-backed features.

For GitHub Pages deployments, add the credentials as a repository secret so the Pages workflow can reconstruct `config/runtime-config.js` at publish time. See [`docs/github-pages-deployment.md`](docs/github-pages-deployment.md) for detailed steps.

