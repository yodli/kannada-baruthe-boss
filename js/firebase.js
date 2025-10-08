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
const firebaseConfig = {
  apiKey: "AIzaSyAHGI5U_EDb1lYNt-uPS2dkRaNeyaUX-oI",
  authDomain: "kannada-app-audio-e6901.firebaseapp.com",
  projectId: "kannada-app-audio-e6901",
  storageBucket: "kannada-app-audio-e6901.firebasestorage.app",
  messagingSenderId: "891878140337",
  appId: "1:891878140337:web:8968ebb24ca661aa58f590",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestoreDB = getFirestore(app);
const storage = getStorage(app);

export { firestoreDB, storage };
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

