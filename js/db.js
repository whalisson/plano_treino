// ── GORILA GYM — db.js ───────────────────────
// IndexedDB persistence layer

export var DB_NAME    = 'gorila-gym';
export var DB_VERSION = 1;
export var STORE_NAME = 'state';
export var RECORD_KEY = 'main';
var _db        = null;

export function openDB() {
  return new Promise(function(resolve, reject) {
    if (_db) { resolve(_db); return; }
    var req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = function(e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = function(e) { _db = e.target.result; resolve(_db); };
    req.onerror   = function()  { reject(req.error); };
  });
}

export function idbSet(key, value) {
  return openDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx  = db.transaction(STORE_NAME, 'readwrite');
      var st  = tx.objectStore(STORE_NAME);
      var req = st.put(value, key);
      req.onsuccess = function() {
        resolve();
        // Sincroniza com Firebase em segundo plano (fire-and-forget)
        if (typeof fbSave === 'function') fbSave(value);
      };
      req.onerror = function() { reject(req.error); };
    });
  });
}

export function idbGet(key) {
  return openDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx  = db.transaction(STORE_NAME, 'readonly');
      var st  = tx.objectStore(STORE_NAME);
      var req = st.get(key);
      req.onsuccess = function() { resolve(req.result); };
      req.onerror   = function() { reject(req.error); };
    });
  });
}
