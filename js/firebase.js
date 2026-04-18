// ── GORILA GYM — firebase.js ──────────────────
// Sincronização em nuvem via Firebase + Google Sign-In.
//
// Fluxo:
//   • Usuário entra com Google (UID é permanente entre reinstalações)
//   • Dados salvos automaticamente no Firestore (debounce 4 s)
//   • Ao reinstalar e fazer login, os dados voltam sozinhos

var FB_COLLECTION  = 'gorila_gym';
var _fbReady       = false;
var _fbDb          = null;
var _fbUser        = null;
var _fbSyncTimer   = null;
var _fbPendingData = null;

// ── Status visual na UI ───────────────────────
function fbSetStatus(status) {
  var el = document.getElementById('fbStatus');
  if (!el) return;
  var map = {
    init:    { icon: '☁', text: 'Conectando…', color: 'var(--muted)' },
    syncing: { icon: '⟳', text: 'Salvando…',   color: 'var(--amber)' },
    synced:  { icon: '☁', text: 'Salvo',        color: 'var(--teal)'  },
    error:   { icon: '☁', text: 'Erro sync',    color: 'var(--red)'   },
    offline: { icon: '☁', text: 'Offline',      color: 'var(--muted)' },
    off:     { icon: '☁', text: 'Sem nuvem',    color: 'var(--muted)' },
  };
  var s = map[status] || map.off;
  el.innerHTML = '<span style="margin-right:3px;">' + s.icon + '</span>' + s.text;
  el.style.color = s.color;
}

// ── UI: exibe avatar/nome do usuário logado ───
function fbUpdateUserDisplay(user) {
  var wrap = document.getElementById('fbUserWrap');
  if (!wrap) return;
  if (user) {
    var name  = (user.displayName || 'Usuário').split(' ')[0];
    var photo = user.photoURL;
    var avatar = photo
      ? '<img src="' + photo + '" style="width:20px;height:20px;border-radius:50%;object-fit:cover;" alt="">'
      : '<span style="width:20px;height:20px;border-radius:50%;background:var(--teal);display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#000;">' + name[0].toUpperCase() + '</span>';
    wrap.innerHTML =
      '<span style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--muted);">' +
        avatar +
        '<span style="color:var(--text);">' + name + '</span>' +
        '<button onclick="fbSignOut()" style="background:transparent;border:none;color:var(--muted);font-size:10px;padding:0 2px;cursor:pointer;" title="Sair">✕</button>' +
      '</span>';
    wrap.style.display = 'flex';
  } else {
    wrap.innerHTML =
      '<button onclick="fbShowSignInModal()" style="background:transparent;border:1px solid var(--border);border-radius:6px;color:var(--muted);font-size:10px;padding:3px 8px;cursor:pointer;white-space:nowrap;">Entrar com Google</button>';
    wrap.style.display = 'flex';
  }
}

// ── Inicialização ─────────────────────────────
function fbInit() {
  if (typeof FIREBASE_CONFIG === 'undefined' || FIREBASE_CONFIG.apiKey === 'COLE_AQUI') {
    fbSetStatus('off');
    document.dispatchEvent(new CustomEvent('gorila-state-loaded', { detail: null }));
    return;
  }
  if (typeof firebase === 'undefined') {
    fbSetStatus('off');
    document.dispatchEvent(new CustomEvent('gorila-state-loaded', { detail: null }));
    return;
  }

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    _fbDb = firebase.firestore();
    fbSetStatus('init');

    var _authFirstFire = true;
    firebase.auth().onAuthStateChanged(function(user) {
      if (user) {
        _fbUser  = user;
        _fbReady = true;
        fbSetStatus('synced');
        fbUpdateUserDisplay(user);
        fbHideSignInModal();

        fbLoadByUid(user.uid).then(function(data) {
          if (_authFirstFire) {
            // Primeiro disparo — resolve via CustomEvent para app.js
            _authFirstFire = false;
            document.dispatchEvent(new CustomEvent('gorila-state-loaded', { detail: { user: user, data: data } }));
          } else if (data) {
            // Login feito DEPOIS do app já ter carregado vazio — aplica os dados
            document.dispatchEvent(new CustomEvent('gorila-state-loaded', { detail: { user: user, data: data } }));
          }
          if (_fbPendingData) {
            fbSave(_fbPendingData);
            _fbPendingData = null;
          }
        }).catch(function() {
          if (_authFirstFire) {
            _authFirstFire = false;
            document.dispatchEvent(new CustomEvent('gorila-state-loaded', { detail: { user: user, data: null } }));
          }
        });

      } else {
        _fbUser  = null;
        _fbReady = false;
        fbSetStatus('off');
        fbUpdateUserDisplay(null);
        if (_authFirstFire) {
          _authFirstFire = false;
          document.dispatchEvent(new CustomEvent('gorila-state-loaded', { detail: null }));
        }
      }
    });

  } catch (err) {
    console.warn('[Firebase] Init falhou:', err.message);
    fbSetStatus('off');
    document.dispatchEvent(new CustomEvent('gorila-state-loaded', { detail: null }));
  }
}

// ── Login / Logout ────────────────────────────
function fbSignIn() {
  if (typeof firebase === 'undefined') return;
  var provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider).catch(function(err) {
    console.warn('[Firebase] Sign-in falhou:', err.message);
  });
}

function fbSignOut() {
  if (typeof firebase === 'undefined') return;
  firebase.auth().signOut();
}

// ── Modal de login ────────────────────────────
function fbShowSignInModal() {
  var m = document.getElementById('mFbLogin');
  if (m) m.classList.add('on');
}

function fbHideSignInModal() {
  var m = document.getElementById('mFbLogin');
  if (m) m.classList.remove('on');
}

// ── Salvar no Firestore (debounced 4 s) ───────
function fbSave(data) {
  if (!_fbReady || !_fbDb || !_fbUser) {
    _fbPendingData = data;
    return;
  }
  clearTimeout(_fbSyncTimer);
  _fbSyncTimer = setTimeout(function() {
    fbSetStatus('syncing');
    var doc = { payload: JSON.stringify(data), savedAt: Date.now() };
    _fbDb.collection(FB_COLLECTION).doc(_fbUser.uid).set(doc)
      .then(function()  { fbSetStatus('synced'); })
      .catch(function(err) {
        console.warn('[Firebase] Save falhou:', err.message);
        fbSetStatus('error');
      });
  }, 4000);
}

// ── Carregar do Firestore pelo UID ────────────
function fbLoadByUid(uid) {
  if (!_fbDb) return Promise.reject(new Error('Firebase não inicializado'));
  return _fbDb.collection(FB_COLLECTION).doc(uid).get()
    .then(function(doc) {
      if (!doc.exists) return null;
      var d = doc.data();
      if (d && d.payload) {
        try { return JSON.parse(d.payload); } catch(e) { return null; }
      }
      return d || null;
    });
}

// fbInit() é chamado explicitamente por app.js após o carregamento dos módulos
