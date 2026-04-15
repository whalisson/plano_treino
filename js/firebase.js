// ── GORILA GYM — firebase.js ──────────────────
// Sincronização em nuvem via Firebase Firestore.
//
// Estratégia:
//   • Cada usuário tem um Código de Backup de 6 caracteres (ex: "A3X9KM")
//   • O código é o ID do documento no Firestore — guarda-o em local seguro
//   • Ao salvar localmente, sincroniza automaticamente (debounce de 4 s)
//   • Se o app for apagado e o código estiver disponível, os dados voltam

var FB_CODE_KEY    = 'gorila_bkp';
var FB_COLLECTION  = 'gorila_gym';
var _fbReady       = false;
var _fbDb          = null;
var _fbSyncTimer   = null;
var _fbPendingData = null;

// ── Código de backup ──────────────────────────

function fbGenerateCode() {
  // Alfanumérico sem caracteres ambíguos (0/O, 1/I/L)
  var chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  var code  = '';
  for (var i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function fbGetCode() {
  return localStorage.getItem(FB_CODE_KEY) || null;
}

function fbGetOrCreateCode() {
  var code = fbGetCode();
  if (!code) {
    code = fbGenerateCode();
    localStorage.setItem(FB_CODE_KEY, code);
  }
  return code;
}

// ── Status visual na UI ───────────────────────
function fbSetStatus(status) {
  var el = document.getElementById('fbStatus');
  if (!el) return;
  var map = {
    init:    { icon: '☁',  text: 'Conectando…', color: 'var(--muted)'  },
    syncing: { icon: '⟳',  text: 'Salvando…',   color: 'var(--amber)'  },
    synced:  { icon: '☁',  text: 'Salvo',        color: 'var(--teal)'   },
    error:   { icon: '☁',  text: 'Erro sync',    color: 'var(--red)'    },
    offline: { icon: '☁',  text: 'Offline',      color: 'var(--muted)'  },
    off:     { icon: '☁',  text: 'Sem nuvem',    color: 'var(--muted)'  },
  };
  var s = map[status] || map.off;
  el.innerHTML = '<span style="margin-right:3px;">' + s.icon + '</span>' + s.text;
  el.style.color = s.color;
}

// ── Inicialização ─────────────────────────────
function fbInit() {
  // Verifica se a config foi preenchida pelo usuário
  if (typeof FIREBASE_CONFIG === 'undefined' || FIREBASE_CONFIG.apiKey === 'COLE_AQUI') {
    fbSetStatus('off');
    return;
  }

  // Verifica se o SDK foi carregado
  if (typeof firebase === 'undefined') {
    fbSetStatus('off');
    return;
  }

  try {
    // Evita inicializar duas vezes (ex: hot-reload)
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    _fbDb = firebase.firestore();
    fbSetStatus('init');

    // Login anônimo — necessário para as regras de segurança do Firestore
    firebase.auth().signInAnonymously()
      .then(function() {
        _fbReady = true;
        fbSetStatus('synced');
        fbUpdateCodeDisplay();

        // Se havia dados pendentes de sincronizar, envia agora
        if (_fbPendingData) {
          fbSave(_fbPendingData);
          _fbPendingData = null;
        }
      })
      .catch(function(err) {
        console.warn('[Firebase] Auth falhou:', err.message);
        fbSetStatus('offline');
      });

  } catch (err) {
    console.warn('[Firebase] Init falhou:', err.message);
    fbSetStatus('off');
  }
}

// ── Salvar no Firestore (debounced) ───────────
function fbSave(data) {
  if (!_fbReady || !_fbDb) {
    _fbPendingData = data; // guarda para quando conectar
    return;
  }
  clearTimeout(_fbSyncTimer);
  _fbSyncTimer = setTimeout(function() {
    var code = fbGetOrCreateCode();
    fbSetStatus('syncing');
    // Serializa como JSON para evitar limitações do Firestore
    // (arrays aninhados, undefined, objetos com chaves inválidas, etc.)
    var doc = { payload: JSON.stringify(data), savedAt: Date.now() };
    _fbDb.collection(FB_COLLECTION).doc(code).set(doc)
      .then(function()  { fbSetStatus('synced'); })
      .catch(function(err) {
        console.warn('[Firebase] Save falhou:', err.message);
        fbSetStatus('error');
      });
  }, 4000);
}

// ── Carregar do Firestore por código ──────────
function fbLoad(code) {
  if (!_fbDb) return Promise.reject(new Error('Firebase não inicializado'));
  return _fbDb.collection(FB_COLLECTION).doc(code.toUpperCase().trim()).get()
    .then(function(doc) {
      if (!doc.exists) return null;
      var d = doc.data();
      // Suporta formato antigo (objeto direto) e novo (payload JSON)
      if (d.payload) {
        try { return JSON.parse(d.payload); } catch(e) { return null; }
      }
      return d;
    });
}

// ── UI: exibe e gerencia o código de backup ───
function fbUpdateCodeDisplay() {
  var code = fbGetOrCreateCode();

  var display = document.getElementById('fbCodeDisplay');
  if (display) display.textContent = code;

  var wrap = document.getElementById('fbCodeWrap');
  if (wrap) wrap.style.display = 'flex';
}

function fbCopyCode() {
  var code = fbGetOrCreateCode();
  navigator.clipboard.writeText(code).then(function() {
    var btn = document.getElementById('fbCopyBtn');
    if (!btn) return;
    var orig = btn.textContent;
    btn.textContent = '✓';
    btn.style.color = 'var(--green)';
    setTimeout(function() { btn.textContent = orig; btn.style.color = ''; }, 1500);
  });
}

// ── UI: modal de restauração ──────────────────
function fbOpenRestoreModal() {
  var m = document.getElementById('mFbRestore');
  if (m) { m.classList.add('on'); document.getElementById('fbRestoreInput').value = ''; }
}

function fbCloseRestoreModal() {
  var m = document.getElementById('mFbRestore');
  if (m) m.classList.remove('on');
}

function fbConfirmRestore() {
  var input = document.getElementById('fbRestoreInput');
  var code  = input ? input.value.trim().toUpperCase() : '';
  if (code.length !== 6) {
    alert('Código inválido. O código tem 6 caracteres (ex: A3X9KM).');
    return;
  }

  var btn = document.getElementById('fbRestoreBtn');
  if (btn) { btn.textContent = 'Buscando…'; btn.disabled = true; }

  // Espera o Firebase estar pronto (pode não estar se acabou de abrir o app)
  function tryLoad() {
    if (!_fbDb) {
      setTimeout(tryLoad, 500);
      return;
    }
    fbLoad(code)
      .then(function(data) {
        if (!data) {
          alert('Nenhum dado encontrado para o código "' + code + '". Verifique e tente novamente.');
          if (btn) { btn.textContent = 'Restaurar'; btn.disabled = false; }
          return;
        }
        // Salva o novo código localmente
        localStorage.setItem(FB_CODE_KEY, code);

        // Aplica os dados e salva no IndexedDB
        customLifts = [];
        applyState(data);
        idbSet(RECORD_KEY, data).catch(function() {});
        fbCloseRestoreModal();
        fbUpdateCodeDisplay();

        showUndo('Dados restaurados com sucesso!', function() {}, function() {});
      })
      .catch(function(err) {
        console.warn('[Firebase] Restore falhou:', err);
        alert('Erro ao buscar dados. Verifique sua conexão.');
        if (btn) { btn.textContent = 'Restaurar'; btn.disabled = false; }
      });
  }
  tryLoad();
}

// Inicia assim que o DOM estiver pronto
document.addEventListener('DOMContentLoaded', fbInit);
