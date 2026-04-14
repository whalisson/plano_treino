// ── GORILA GYM — db.js ───────────────────────
// IndexedDB persistence layer

var DB_NAME    = 'gorila-gym';
var DB_VERSION = 1;
var STORE_NAME = 'state';
var RECORD_KEY = 'main';
var _db        = null;

function openDB() {
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

function idbSet(key, value) {
  return openDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx  = db.transaction(STORE_NAME, 'readwrite');
      var st  = tx.objectStore(STORE_NAME);
      var req = st.put(value, key);
      req.onsuccess = function() { resolve(); };
      req.onerror   = function() { reject(req.error); };
    });
  });
}

function idbGet(key) {
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
