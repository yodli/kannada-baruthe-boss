// IndexedDB helpers for app progress/state

const DB_NAME = 'KannadaBarutheBossDB_Progress';
const DB_VERSION = 1;
let db;

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = (e) => reject("DB error: " + e.target.errorCode);
    request.onupgradeneeded = (e) => {
      db = e.target.result;
      if (!db.objectStoreNames.contains('userData')) db.createObjectStore('userData', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('srs')) db.createObjectStore('srs', { keyPath: 'phraseId' });
      if (!db.objectStoreNames.contains('progressLog')) db.createObjectStore('progressLog', { keyPath: 'date' });
      if (!db.objectStoreNames.contains('cardTracking')) db.createObjectStore('cardTracking', { keyPath: 'phraseId' });
    };
    request.onsuccess = (e) => {
      db = e.target.result;
      console.log("Progress DB initialized.");
      resolve(db);
    };
  });
}

function getStore(storeName, mode) {
  return db.transaction(storeName, mode).objectStore(storeName);
}

function addOrUpdate(storeName, data) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    store.put(data);
    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) => {
      console.error(`Transaction error on store ${storeName}:`, event.target.error);
      reject("DB Error: " + event.target.error);
    };
  });
}

async function clearStore(storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    store.clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) => {
      console.error(`Transaction error on store ${storeName}:`, event.target.error);
      reject("DB Error: " + event.target.error);
    };
  });
}

function getData(storeName, key) {
  return new Promise((resolve, reject) => {
    const req = getStore(storeName, 'readonly').get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject("DB Error: " + e.target.error);
  });
}

function getAllData(storeName) {
  return new Promise((resolve, reject) => {
    const req = getStore(storeName, 'readonly').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject("DB Error: " + e.target.error);
  });
}

export { initDB, addOrUpdate, clearStore, getData, getAllData };

