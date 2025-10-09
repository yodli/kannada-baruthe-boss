// Firebase initialization and exports
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";

// --- FIREBASE CONFIG ---
const globalScope = typeof window !== 'undefined' ? window : globalThis;
const runtimeConfig = (globalScope && globalScope.__APP_CONFIG__) || {};
const firebaseConfig = runtimeConfig.firebase;

const hasValidFirebaseConfig =
  firebaseConfig &&
  typeof firebaseConfig === 'object' &&
  typeof firebaseConfig.apiKey === 'string' &&
  firebaseConfig.apiKey.trim() !== '' &&
  typeof firebaseConfig.projectId === 'string' &&
  firebaseConfig.projectId.trim() !== '';

let app = null;
let firestoreDB = null;
let storage = null;

if (hasValidFirebaseConfig) {
  app = initializeApp(firebaseConfig);
  firestoreDB = getFirestore(app);
  storage = getStorage(app);
} else if (typeof console !== 'undefined') {
  console.warn(
    'Firebase credentials were not provided via window.__APP_CONFIG__. Cloud sync and authoring features are disabled.'
  );
}

export { firestoreDB, storage };
export const isFirebaseConfigured = hasValidFirebaseConfig;
export {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  ref,
  uploadBytes,
  getDownloadURL,
};

