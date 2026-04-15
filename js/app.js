// ── GORILA GYM — app.js ──────────────────────
// Ponto de entrada: navegação, export/import e inicialização

// ── Navegação entre abas ──────────────────────
g('ntabs').addEventListener('click', function(e) {
  var tab = e.target.closest('.ntab'); if (!tab) return;
  var p   = tab.dataset.p;
  document.querySelectorAll('.ntab').forEach(function(t)  { t.classList.remove('on'); });
  document.querySelectorAll('.pg').forEach(function(pg)   { pg.classList.remove('on'); });
  tab.classList.add('on');
  g('pg-' + p).classList.add('on');
  if (p === 'cardio') buildCardioChart();
  if (p === 'periodizacao') setTimeout(scrollToCurrentWeek, 80);
});

// ── Export / Import de dados ──────────────────
function exportData() {
  var data = {
    _version:      1,
    _exportedAt:   new Date().toISOString(),
    rmSupino:      parseFloat(g('rm-supino').value) || BASE_SUP,
    rmAgacha:      parseFloat(g('rm-agacha').value) || BASE_AGA,
    rmTerra:       parseFloat(g('rm-terra').value)  || BASE_TER,
    checks:        checksState,
    rmTests:       rmTestValues,
    board:         board,
    bank:          bank,
    kgHistory:     kgHistory,
    cycleHistory:  cycleHistory,
    rmHistory:       rmHistory,
    cardioExtra:     cardioExtra,
    cardioGoal:      parseInt(g('cardioGoal').value)      || 300,
    cardioDailyGoal: parseInt(g('cardioDailyGoal').value) || 43,
    savedWorkouts: savedWorkouts,
    rpeBlocks:     rpeBlocks,
    customLifts:   customLifts,
    cycleStartDates: cycleStartDates,
  };
  var json  = JSON.stringify(data, null, 2);
  var blob  = new Blob([json], { type:'application/json' });
  var url   = URL.createObjectURL(blob);
  var a     = document.createElement('a');
  var d     = new Date();
  var stamp = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  a.href = url; a.download = 'gorila-gym-' + stamp + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

g('btnExport').addEventListener('click', exportData);

g('inputImport').addEventListener('change', function(e) {
  var file = e.target.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    try {
      var data = JSON.parse(ev.target.result);
      if (typeof data !== 'object' || data === null) throw new Error('invalid');
      customLifts = [];
      applyState(data);
      idbSet(RECORD_KEY, data).catch(function() {});
      g('inputImport').value = '';
      var btn  = g('btnExport');
      var orig = btn.textContent;
      btn.textContent = '✓ Importado!'; btn.style.color = 'var(--green)';
      setTimeout(function() { btn.textContent = orig; btn.style.color = ''; }, 2500);
    } catch(ex) {
      alert('Arquivo inválido. Verifique se é um backup do Gorila Gym.');
    }
  };
  reader.readAsText(file);
});

// ── Init: aplica estado salvo e renderiza tudo ─
function applyState(saved) {
  if (saved) {
    if (saved.rmSupino)       g('rm-supino').value = saved.rmSupino;
    if (saved.rmAgacha)       g('rm-agacha').value = saved.rmAgacha;
    if (saved.rmTerra)        g('rm-terra').value  = saved.rmTerra;
    if (saved.checks)         checksState      = saved.checks;
    if (saved.rmTests)        rmTestValues     = saved.rmTests;
    if (saved.board && saved.board.length === 7) board = saved.board;
    if (saved.bank)           bank             = saved.bank;
    if (saved.kgHistory)      kgHistory        = saved.kgHistory;
    if (saved.cycleHistory)   cycleHistory     = saved.cycleHistory;
    if (saved.rmHistory)        rmHistory                = saved.rmHistory;
    if (saved.cardioExtra)      cardioExtra              = saved.cardioExtra;
    if (saved.cardioGoal)       g('cardioGoal').value      = saved.cardioGoal;
    if (saved.cardioDailyGoal)  g('cardioDailyGoal').value = saved.cardioDailyGoal;
    if (saved.savedWorkouts)  savedWorkouts    = saved.savedWorkouts;
    if (saved.rpeBlocks)      rpeBlocks        = saved.rpeBlocks;
    if (saved.customLifts)    customLifts      = saved.customLifts;
    if (saved.cycleStartDates) cycleStartDates = saved.cycleStartDates;
  }
  buildAllPeriod();
  calcRM();
  renderCustomLifts();
  populateRMLiftSelect();
  renderRMHistory();
  renderKanban(); renderBank(); setupBankDropzone();
  renderPeriodGrid();
  renderProgressCharts();
  renderBuilderSegs();
  renderSavedWorkouts();
  renderCycleHistory();
  renderRPEBlocks();
  // Persiste após cada renderização do kanban
  // Só salva se houver ao menos um exercício no board OU se o estado salvo já foi carregado,
  // para evitar sobrescrever dados válidos com um board vazio em caso de falha no load.
  var _boardLoaded = !!(saved && saved.board);
  var _origRenderKanban = renderKanban;
  renderKanban = function() {
    _origRenderKanban();
    var hasItems = board.some(function(day) { return day.length > 0; });
    if (hasItems || _boardLoaded) saveState();
  };
}

loadState().then(function(saved) {
  if (saved) { applyState(saved); return; }

  // IndexedDB vazio — tenta restaurar do Firebase usando o código salvo
  var localCode = (typeof fbGetCode === 'function') ? fbGetCode() : null;
  if (localCode && typeof fbLoad === 'function') {
    function tryFbRestore() {
      fbLoad(localCode)
        .then(function(fbData) {
          if (fbData) {
            applyState(fbData);
            idbSet(RECORD_KEY, fbData).catch(function() {});
          } else {
            applyState(null);
          }
        })
        .catch(function() { applyState(null); });
    }
    // Firebase pode não estar pronto imediatamente — aguarda até 3 s
    var _tries = 0;
    var _wait = setInterval(function() {
      _tries++;
      if (typeof _fbReady !== 'undefined' && _fbReady) {
        clearInterval(_wait);
        tryFbRestore();
      } else if (_tries >= 6) {
        clearInterval(_wait);
        applyState(null);
      }
    }, 500);
  } else {
    applyState(null);
  }
}).catch(function() { applyState(null); });

// ── Scroll para semana atual na Periodização ──

// Retorna a chave do lift (ex: 'supino') para um nome de exercício do logbook
function liftKeyForExerciseName(name) {
  var n = name.toLowerCase();
  if (n.includes('supino'))                          return 'supino';
  if (n.includes('agachamento') || n.includes('agacha') || n.includes('squat')) return 'agacha';
  if (n.includes('terra') || n.includes('deadlift')) return 'terra';
  if (typeof customLifts !== 'undefined') {
    for (var i = 0; i < customLifts.length; i++) {
      var ln = customLifts[i].name.toLowerCase();
      if (n.includes(ln) || ln.includes(n)) return customLifts[i].id;
    }
  }
  return null;
}

function scrollToCurrentWeek() {
  // board[0]=Segunda … board[6]=Domingo  |  JS getDay(): 0=Dom,1=Seg…6=Sab
  var jsDay   = new Date().getDay();
  var boardIdx = (jsDay + 6) % 7;           // converte para índice do board
  var todayExercises = (typeof board !== 'undefined' && board[boardIdx]) ? board[boardIdx] : [];

  // Lifts do dia de hoje no logbook
  var todayKeys = [];
  todayExercises.forEach(function(ex) {
    var k = liftKeyForExerciseName(ex.name || '');
    if (k && todayKeys.indexOf(k) === -1) todayKeys.push(k);
  });

  // Se não há match hoje, não abre nada
  if (!todayKeys.length) return;
  var keysToOpen = todayKeys;

  var firstTarget = null;
  keysToOpen.forEach(function(k) {
    var psb = g('psb-' + k); if (!psb) return;
    if (!psb.classList.contains('on')) {
      psb.classList.add('on');
      var chev = g('chev-' + k);
      if (chev) chev.textContent = '▲';
    }
    if (!firstTarget) {
      // Prioriza a semana atual; se não existir, rola até o cabeçalho da seção
      firstTarget = psb.querySelector('.current-week') || g('psh-' + k);
    }
  });

  if (firstTarget) {
    setTimeout(function() {
      firstTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  }
}

// ── Service Worker ────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./sw.js')
      .then(function(reg) { console.log('[SW] Registered:', reg.scope); })
      .catch(function(err) { console.warn('[SW] Registration failed:', err); });
  });
}
