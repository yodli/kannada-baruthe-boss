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