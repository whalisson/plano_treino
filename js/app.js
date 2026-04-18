// ── GORILA GYM — app.js ──────────────────────
// Ponto de entrada: navegação, export/import e inicialização

import { uid, g, round05, saveState, loadState, BASE_SUP, BASE_AGA, BASE_TER,
  checksState, setChecksState, rmTestValues, setRmTestValues,
  kgHistory, setKgHistory, cycleHistory, setCycleHistory,
  customLifts, setCustomLifts, cycleStartDates, setCycleStartDates } from './state.js';
import { idbSet, RECORD_KEY } from './db.js';
import { board, bank, setBoard, setBank } from './logbook.js';
import { rmHistory, setRmHistory } from './rm.js';
import { cardioExtra, setCardioExtra, savedWorkouts, setSavedWorkouts } from './cardio.js';
import { rpeBlocks, setRpeBlocks } from './rpe.js';
import { workoutLog, setWorkoutLog } from './workoutlog.js';

// ── gorila-save event handler ─────────────────
document.addEventListener('gorila-save', function() {
  var data = {
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
    workoutLog:    workoutLog,
  };
  idbSet(RECORD_KEY, data).catch(function() {
    try { localStorage.setItem('gorila_fallback', JSON.stringify(data)); } catch(ex) {}
  });
});

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
export function exportData() {
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
    workoutLog:    workoutLog,
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
globalThis.exportData = exportData;

g('btnExport').addEventListener('click', exportData);

g('inputImport').addEventListener('change', function(e) {
  var file = e.target.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    try {
      var data = JSON.parse(ev.target.result);
      if (typeof data !== 'object' || data === null) throw new Error('invalid');
      setCustomLifts([]);
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
export function applyState(saved) {
  if (saved) {
    if (saved.rmSupino)       g('rm-supino').value = saved.rmSupino;
    if (saved.rmAgacha)       g('rm-agacha').value = saved.rmAgacha;
    if (saved.rmTerra)        g('rm-terra').value  = saved.rmTerra;
    if (saved.checks)         setChecksState(saved.checks);
    if (saved.rmTests)        setRmTestValues(saved.rmTests);
    if (saved.board && saved.board.length === 7) setBoard(saved.board);
    if (saved.bank)           setBank(saved.bank);
    if (saved.kgHistory)      setKgHistory(saved.kgHistory);
    if (saved.cycleHistory)   setCycleHistory(saved.cycleHistory);
    if (saved.rmHistory)        setRmHistory(saved.rmHistory);
    if (saved.cardioExtra)      setCardioExtra(saved.cardioExtra);
    if (saved.cardioGoal)       g('cardioGoal').value      = saved.cardioGoal;
    if (saved.cardioDailyGoal)  g('cardioDailyGoal').value = saved.cardioDailyGoal;
    if (saved.savedWorkouts)  setSavedWorkouts(saved.savedWorkouts);
    if (saved.rpeBlocks)      setRpeBlocks(saved.rpeBlocks);
    if (saved.customLifts)    setCustomLifts(saved.customLifts);
    if (saved.cycleStartDates) setCycleStartDates(saved.cycleStartDates);
    if (saved.workoutLog && Array.isArray(saved.workoutLog)) setWorkoutLog(saved.workoutLog);
  }
  // Call render functions — use globalThis lookups so tests can mock them
  if (typeof globalThis.buildAllPeriod === 'function') globalThis.buildAllPeriod();
  if (typeof globalThis.calcRM === 'function') globalThis.calcRM();
  if (typeof globalThis.renderCustomLifts === 'function') globalThis.renderCustomLifts();
  if (typeof globalThis.populateRMLiftSelect === 'function') globalThis.populateRMLiftSelect();
  if (typeof globalThis.renderRMHistory === 'function') globalThis.renderRMHistory();
  if (typeof globalThis.renderKanban === 'function') globalThis.renderKanban();
  if (typeof globalThis.renderBank === 'function') globalThis.renderBank();
  if (typeof globalThis.setupBankDropzone === 'function') globalThis.setupBankDropzone();
  if (typeof globalThis.renderPeriodGrid === 'function') globalThis.renderPeriodGrid();
  if (typeof globalThis.renderProgressCharts === 'function') globalThis.renderProgressCharts();
  if (typeof globalThis.renderBuilderSegs === 'function') globalThis.renderBuilderSegs();
  if (typeof globalThis.renderSavedWorkouts === 'function') globalThis.renderSavedWorkouts();
  if (typeof globalThis.renderCycleHistory === 'function') globalThis.renderCycleHistory();
  if (typeof globalThis.renderRPEBlocks === 'function') globalThis.renderRPEBlocks();
  // Persiste após cada renderização do kanban
  var _boardLoaded = !!(saved && saved.board);
  var _origRenderKanban = globalThis.renderKanban;
  globalThis.renderKanban = function() {
    if (typeof _origRenderKanban === 'function') _origRenderKanban();
    var hasItems = board.some(function(day) { return day.length > 0; });
    if (hasItems || _boardLoaded) saveState();
  };
}
globalThis.applyState = applyState;

loadState().then(function(saved) {
  if (saved) { applyState(saved); return; }

  // No local data — wait for gorila-state-loaded (from firebase.js) or timeout
  var timeout = setTimeout(function() {
    applyState(null);
    if (typeof fbShowSignInModal === 'function') fbShowSignInModal();
  }, 5000);
  document.addEventListener('gorila-state-loaded', function handler(e) {
    clearTimeout(timeout);
    document.removeEventListener('gorila-state-loaded', handler);
    var result = e.detail;
    if (result && result.data) {
      applyState(result.data);
      idbSet(RECORD_KEY, result.data).catch(function() {});
    } else if (result && result.user) {
      applyState(null);
    } else {
      applyState(null);
    }
  }, { once: true });
}).catch(function() { applyState(null); });

// gorila-state-loaded event (for firebase integration)
document.addEventListener('gorila-state-loaded', function(e) {
  var result = e.detail;
  if (result && result.data) {
    applyState(result.data);
    idbSet(RECORD_KEY, result.data).catch(function() {});
  } else if (result && result.user) {
    applyState(null);
  }
});

// ── Scroll para semana atual na Periodização ──

// Retorna a chave do lift (ex: 'supino') para um nome de exercício do logbook
export function liftKeyForExerciseName(name) {
  var n = name.toLowerCase();
  if (n.includes('supino'))                          return 'supino';
  if (n.includes('agachamento') || n.includes('agacha') || n.includes('squat')) return 'agacha';
  if (n.includes('terra') || n.includes('deadlift')) return 'terra';
  var _customLifts = customLifts;
  if (_customLifts) {
    for (var i = 0; i < _customLifts.length; i++) {
      var ln = _customLifts[i].name.toLowerCase();
      if (n.includes(ln) || ln.includes(n)) return _customLifts[i].id;
    }
  }
  return null;
}
globalThis.liftKeyForExerciseName = liftKeyForExerciseName;

export function scrollToCurrentWeek() {
  // board[0]=Segunda … board[6]=Domingo  |  JS getDay(): 0=Dom,1=Seg…6=Sab
  var jsDay   = new Date().getDay();
  var boardIdx = (jsDay + 6) % 7;           // converte para índice do board
  var todayExercises = board[boardIdx] ? board[boardIdx] : [];

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
globalThis.scrollToCurrentWeek = scrollToCurrentWeek;

// ── Nav drag-to-scroll ────────────────────────
(function() {
  var el = document.getElementById('navInner');
  if (!el) return;
  var down = false, startX, scrollLeft;

  el.addEventListener('mousedown', function(e) {
    // Ignora cliques em botões/inputs dentro da nav
    if (e.target.closest('button, input, label, a')) return;
    down = true;
    startX    = e.pageX - el.offsetLeft;
    scrollLeft = el.scrollLeft;
    el.classList.add('dragging');
  });
  document.addEventListener('mouseup',   function() { down = false; el.classList.remove('dragging'); });
  document.addEventListener('mouseleave', function() { down = false; el.classList.remove('dragging'); });
  el.addEventListener('mousemove', function(e) {
    if (!down) return;
    e.preventDefault();
    var x    = e.pageX - el.offsetLeft;
    var walk = (x - startX) * 1.2;
    el.scrollLeft = scrollLeft - walk;
  });

  // Touch: já funciona nativamente via overflow-x:auto + -webkit-overflow-scrolling:touch
})();

// ── Service Worker ────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./sw.js')
      .then(function(reg) { console.log('[SW] Registered:', reg.scope); })
      .catch(function(err) { console.warn('[SW] Registration failed:', err); });
  });
}

// Call fbInit if available (firebase.js is a regular script)
if (typeof fbInit === 'function') fbInit();
