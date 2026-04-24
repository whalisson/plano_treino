// ── GORILA GYM — app.js ──────────────────────
// Ponto de entrada: navegação, export/import e inicialização

import { uid, g, round05, saveState, loadState, BASE_SUP, BASE_AGA, BASE_TER,
  checksState, setChecksState, rmTestValues, setRmTestValues,
  kgHistory, setKgHistory, cycleHistory, setCycleHistory,
  customLifts, setCustomLifts, cycleStartDates, setCycleStartDates,
  rmHistory, setRmHistory, parseSetCount, periodLog, setPeriodLog } from './state.js';
import { idbSet, RECORD_KEY } from './db.js';
import { board, bank, setBoard, setBank,
  renderKanban, renderBank, setupBankDropzone, renderPeriodGrid, renderProgressCharts,
  deloadMode, setDeloadMode } from './logbook.js';
import { calcRM, populateRMLiftSelect, renderRMHistory } from './rm.js';
import { cardioExtra, setCardioExtra, savedWorkouts, setSavedWorkouts,
  buildCardioChart, renderBuilderSegs, renderSavedWorkouts,
  addWktSegment, addMWktSegment } from './cardio.js';
import { rpeBlocks, setRpeBlocks, renderRPEBlocks,
  toggleRPETable, concludeExecRPE } from './rpe.js';
import { workoutLog, setWorkoutLog,
  openWorkoutLogModal, wlAddSet, wlRemoveSet,
  renderWorkoutHistory, deleteExerciseHistory,
  openExLog, exLogAddSet, exLogSave } from './workoutlog.js';
import { buildAllPeriod, renderCustomLifts, renderCycleHistory, periodBase } from './periodizacao.js';
import { renderAnilhas } from './anilhas.js';
import { renderFeeder } from './feeder.js';

// ── Expor render functions no globalThis para que applyState as encontre ──────
// (testes substituem via global.* no beforeEach; produção usa as funções reais)
globalThis.buildAllPeriod       = buildAllPeriod;
globalThis.renderAnilhas        = renderAnilhas;
globalThis.renderFeeder         = renderFeeder;
globalThis.calcRM               = calcRM;
globalThis.renderCustomLifts    = renderCustomLifts;
globalThis.populateRMLiftSelect = populateRMLiftSelect;
globalThis.renderRMHistory      = renderRMHistory;
globalThis.renderKanban         = renderKanban;
globalThis.renderBank           = renderBank;
globalThis.setupBankDropzone    = setupBankDropzone;
globalThis.renderPeriodGrid     = renderPeriodGrid;
globalThis.renderProgressCharts = renderProgressCharts;
globalThis.renderBuilderSegs    = renderBuilderSegs;
globalThis.renderSavedWorkouts  = renderSavedWorkouts;
globalThis.renderCycleHistory   = renderCycleHistory;
globalThis.renderRPEBlocks      = renderRPEBlocks;
globalThis.buildCardioChart     = buildCardioChart;
// Funções chamadas via onclick="" no HTML
globalThis.toggleRPETable       = toggleRPETable;
globalThis.concludeExecRPE      = concludeExecRPE;
globalThis.addWktSegment        = addWktSegment;
globalThis.addMWktSegment       = addMWktSegment;
// Registro de treino
globalThis.openWorkoutLogModal  = function(dayIdx) { openWorkoutLogModal(board, dayIdx); };
globalThis.wlAddSet             = wlAddSet;
globalThis.wlRemoveSet          = wlRemoveSet;
globalThis.renderWorkoutHistory = renderWorkoutHistory;
globalThis.deleteExerciseHistory = deleteExerciseHistory;
globalThis.openExLog            = function(di, ei) { openExLog(board, di, ei); };
globalThis.exLogAddSet          = exLogAddSet;
globalThis.exLogSave            = exLogSave;

// ── Indicador SYNC ────────────────────────────
var _syncResetTimer = null;
function setSyncStatus(status) {
  var led = document.querySelector('.nav-led');
  var txt = g('navSyncStatus');
  if (!led || !txt) return;
  clearTimeout(_syncResetTimer);
  led.className = 'nav-led';
  if (status === 'saving') {
    led.classList.add('nav-led--saving');
    txt.textContent = 'Salvando…';
  } else if (status === 'saved') {
    led.classList.add('nav-led--saved');
    txt.textContent = 'Salvo';
    _syncResetTimer = setTimeout(function() {
      led.className = 'nav-led';
      txt.textContent = '—';
    }, 2000);
  } else if (status === 'error') {
    led.classList.add('nav-led--error');
    txt.textContent = 'Erro';
    _syncResetTimer = setTimeout(function() {
      led.className = 'nav-led';
      txt.textContent = '—';
    }, 3000);
  } else if (status === 'connecting') {
    led.classList.add('nav-led--saving');
    txt.textContent = 'Conectando…';
  } else if (status === 'offline') {
    led.classList.add('nav-led--offline');
    txt.textContent = 'Offline';
  }
  // 'idle': LED e texto já resetados acima
}
globalThis.setSyncStatus = setSyncStatus;

// ── Detecção offline/online ───────────────────
window.addEventListener('offline', function() { setSyncStatus('offline'); });
window.addEventListener('online',  function() { setSyncStatus('idle'); });
if (!navigator.onLine) setSyncStatus('offline');

// ── gorila-save event handler ─────────────────
document.addEventListener('gorila-save', function() {
  setSyncStatus('saving');
  updateFadigaBar();
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
    deloadMode:    deloadMode,
    periodLog:     periodLog,
  };
  idbSet(RECORD_KEY, data)
    .then(function() { setSyncStatus('saved'); })
    .catch(function() {
      setSyncStatus('error');
      try { localStorage.setItem('gorila_fallback', JSON.stringify(data)); } catch(ex) {}
    });
  if (document.getElementById('pg-feeder') && document.getElementById('pg-feeder').classList.contains('on')) {
    if (typeof globalThis.renderFeeder === 'function') globalThis.renderFeeder();
  }
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
  if (p === 'anilhas') renderAnilhas();
  if (p === 'feeder')  renderFeeder();
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

// ── Menu salvar (exportar / importar) ─────────
var _saveMenu   = g('saveMenu');
var _btnSaveMenu = g('btnSaveMenu');
if (_btnSaveMenu && _saveMenu) {
  _btnSaveMenu.addEventListener('click', function(e) {
    e.stopPropagation();
    var opening = !_saveMenu.classList.contains('on');
    _saveMenu.classList.toggle('on');
    if (opening) {
      var r = _btnSaveMenu.getBoundingClientRect();
      _saveMenu.style.top   = (r.bottom + 6) + 'px';
      _saveMenu.style.right = (window.innerWidth - r.right) + 'px';
    }
  });
  document.addEventListener('click', function() { _saveMenu.classList.remove('on'); });
  var _btnExport   = g('btnExport');
  var _labelImport = g('labelImport');
  if (_btnExport)   _btnExport.addEventListener('click',   function() { _saveMenu.classList.remove('on'); exportData(); });
  if (_labelImport) _labelImport.addEventListener('click', function() { _saveMenu.classList.remove('on'); });
}

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
    if (saved.deloadMode !== undefined) setDeloadMode(saved.deloadMode);
    if (saved.periodLog && Array.isArray(saved.periodLog)) setPeriodLog(saved.periodLog);
  }
  syncDeloadBtn();
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
  if (typeof globalThis.renderWorkoutHistory === 'function') globalThis.renderWorkoutHistory();
  if (typeof globalThis.updateFadigaBar === 'function') globalThis.updateFadigaBar();
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

// Detecta qual lift é o "principal" do dia para direcionar o scroll da periodização.
// Critérios em ordem de prioridade:
//   1. Nome contém "principal", "periodiz" ou "perio" → sinal explícito
//   2. Nome contém abreviatura de levantamento: SQ/SB/BP/DL/SBD (case-insensitive, palavra inteira)
//   3. Primeiro exercício do dia que possui uma liftKey (comportamento anterior)
export function detectMainLiftKey(exercises) {
  var KEYWORD_RE = /principal|periodiz|perio\b/;
  var ABBREV_RE  = /\b(sbd|sbs|sbdt?|sq|sqt|bp|bpc|dl|dlt|rd|rdt)\b/;
  var strip = function(s) {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  };

  var firstKey    = null;
  var keywordKey  = null;
  var abbrevKey   = null;

  for (var i = 0; i < exercises.length; i++) {
    var k = liftKeyForExerciseName(exercises[i].name || '');
    if (!k) continue;
    var norm = strip(exercises[i].name || '');
    if (firstKey === null)                          firstKey   = k;
    if (keywordKey === null && KEYWORD_RE.test(norm)) keywordKey = k;
    if (abbrevKey  === null && ABBREV_RE.test(norm))  abbrevKey  = k;
  }
  return keywordKey || abbrevKey || firstKey;
}
globalThis.detectMainLiftKey = detectMainLiftKey;

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

  // Exercício principal: rola para a seção dele; demais seções também abrem
  var mainKey = detectMainLiftKey(todayExercises);

  var scrollTarget = null;
  todayKeys.forEach(function(k) {
    var psb = g('psb-' + k); if (!psb) return;
    if (!psb.classList.contains('on')) {
      psb.classList.add('on');
      var chev = g('chev-' + k);
      if (chev) chev.textContent = '▲';
    }
    if (k === mainKey && scrollTarget === null) {
      // Prioriza a semana atual; se não existir, rola até o cabeçalho da seção
      scrollTarget = psb.querySelector('.current-week') || g('psh-' + k);
    }
  });

  if (scrollTarget) {
    setTimeout(function() {
      scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  }
}
globalThis.scrollToCurrentWeek = scrollToCurrentWeek;

// ── Drag-to-scroll genérico ───────────────────
function makeDraggable(el) {
  if (!el) return;
  var down = false, startX, scrollLeft;
  el.addEventListener('mousedown', function(e) {
    if (e.target.closest('button, input, label, a')) return;
    down = true; startX = e.pageX - el.offsetLeft; scrollLeft = el.scrollLeft;
    el.classList.add('dragging');
  });
  document.addEventListener('mouseup',    function() { down = false; el.classList.remove('dragging'); });
  document.addEventListener('mouseleave', function() { down = false; el.classList.remove('dragging'); });
  el.addEventListener('mousemove', function(e) {
    if (!down) return;
    e.preventDefault();
    el.scrollLeft = scrollLeft - (e.pageX - el.offsetLeft - startX) * 1.2;
  });
}
makeDraggable(document.getElementById('customRmCards'));

// ── Nav drag-to-scroll ────────────────────────
makeDraggable(document.getElementById('navInner'));

// ── Service Worker ────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./sw.js')
      .then(function(reg) { console.log('[SW] Registered:', reg.scope); })
      .catch(function(err) { console.warn('[SW] Registration failed:', err); });
  });
}

// ── Progressão automática de carga ───────────────────────────────────────────

var _progressionPending = null; // { exName, bankEx }

globalThis.checkExerciseProgression = function(exName, sets) {
  var ex = bank.find(function(b) { return b.name === exName; });
  if (!ex || !ex.repGoal || ex.repGoal <= 0) return;
  if (!sets || sets.length === 0) return;
  var allMet = sets.every(function(s) { return s.reps >= ex.repGoal; });
  if (!allMet) return;

  _progressionPending = { exName: exName, bankEx: ex };
  var msg = g('mProgressionMsg');
  if (msg) msg.innerHTML =
    '<strong>' + ex.name + '</strong><br>Meta de <strong>' + ex.repGoal + ' reps</strong> atingida em todas as séries!<br>' +
    '<span style="font-size:11px;opacity:.7;">Carga atual: ' + ex.kg + ' kg</span>';
  var inc = g('mProgressionInc');
  if (inc) inc.value = '2.5';
  g('mProgression').classList.add('on');
  setTimeout(function() { if (inc) inc.focus(); }, 80);
};

globalThis.applyProgressionIncrease = function() {
  if (!_progressionPending) { g('mProgression').classList.remove('on'); return; }
  var inc = parseFloat(g('mProgressionInc').value);
  if (!inc || inc <= 0) { g('mProgression').classList.remove('on'); _progressionPending = null; return; }

  var ex    = _progressionPending.bankEx;
  var oldKg = ex.kg;
  var newKg = round05(oldKg + inc);
  var now   = new Date().toLocaleDateString('pt-BR');

  ex.kg = newKg;

  board.forEach(function(day) {
    day.forEach(function(item) {
      if (item.name === ex.name || item.srcId === ex.id) item.kg = newKg;
    });
  });

  if (!kgHistory[ex.id]) kgHistory[ex.id] = [];
  var hist = kgHistory[ex.id];
  if (hist.length === 0 && oldKg > 0) hist.push({ date: now, kg: oldKg, name: ex.name, note: 'inicial' });
  hist.push({ date: now, kg: newKg, name: ex.name, note: 'progressão automática' });

  saveState();
  renderKanban();
  renderBank();
  renderPeriodGrid();
  renderProgressCharts();

  g('mProgression').classList.remove('on');
  _progressionPending = null;
};

var _btnSkip = g('btnProgressionSkip');
var _btnConfirm = g('btnProgressionConfirm');
var _incInput = g('mProgressionInc');
if (_btnSkip) _btnSkip.addEventListener('click', function() {
  g('mProgression').classList.remove('on');
  _progressionPending = null;
});
if (_btnConfirm) _btnConfirm.addEventListener('click', globalThis.applyProgressionIncrease);
if (_incInput) _incInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') globalThis.applyProgressionIncrease();
});

// ── Fadiga acumulada — Modelo Banister (decaimento exponencial) ──
// TL = reps × kg × (kg/1RM)  — pondera intensidade relativa, não só volume
// τ por categoria: terra/agacha têm recuperação de SNC ~5 dias; supino ~7; demais ~10
// Baseline SS = Σ(avgDailyTL_lift × τ_lift)  (últimos 42 dias, por lift)
var SS_WIN_MS = 42 * 24 * 3600 * 1000;  // janela de 42 dias para estimar baseline
var SS_FLOOR  = 7500;                    // piso de estado estacionário (usuários novos)

// τ = persistência da fadiga: terra/agacha ~14d, supino ~9d, acessórios ~6d
var _TAU_MS = { agacha: 14 * 86400000, terra: 14 * 86400000, supino: 9 * 86400000 };
var _TAU_DEF_MS = 6 * 86400000;

function _tauMs(lk)  { return _TAU_MS[lk] || _TAU_DEF_MS; }
function _tauDay(lk) { return (_TAU_MS[lk] || _TAU_DEF_MS) / 86400000; }
function _lkOf(name) {
  if (typeof globalThis.liftKeyForExerciseName === 'function')
    return globalThis.liftKeyForExerciseName(name || '') || '_other';
  return '_other';
}

// Aceita refTime opcional para projetar fadiga futura (sem alterar SS)
function getFatigaRaw(refTime) {
  var t   = (refTime !== undefined) ? refTime : Date.now();
  var now = Date.now();

  var oneRMs = {
    supino: parseFloat((g('rm-supino') || {}).value) || BASE_SUP,
    agacha: parseFloat((g('rm-agacha') || {}).value) || BASE_AGA,
    terra:  parseFloat((g('rm-terra')  || {}).value) || BASE_TER,
  };
  customLifts.forEach(function(cl) { oneRMs[cl.id] = cl.rm || 1; });
  function rmFor(lk) { return oneRMs[lk] || 100; }

  var fatigue = 0;
  workoutLog.forEach(function(s) {
    if (!s.startedAt) return;
    s.exercises.forEach(function(ex) {
      var lk    = _lkOf(ex.name);
      var decay = Math.exp(-(t - s.startedAt) / _tauMs(lk));
      if (decay < 0.001) return;
      var rm = rmFor(lk);
      ex.sets.forEach(function(set) {
        var kg = set.kg || 0;
        fatigue += (set.reps || 0) * kg * (kg / rm) * decay;
      });
    });
  });
  periodLog.forEach(function(e) {
    if (!e.ts) return;
    var lk    = e.liftKey || '_other';
    var decay = Math.exp(-(t - e.ts) / _tauMs(lk));
    if (decay < 0.001) return;
    fatigue += (e.vol || 0) * (e.pct || 0.75) * decay;
  });

  // Steady-state ancorado no momento real (não se desloca com refTime)
  var cutoff   = now - SS_WIN_MS;
  var tlByLift = {};
  workoutLog.forEach(function(s) {
    if (!s.startedAt || s.startedAt < cutoff) return;
    s.exercises.forEach(function(ex) {
      var lk = _lkOf(ex.name);
      var rm = rmFor(lk);
      ex.sets.forEach(function(set) {
        var kg = set.kg || 0;
        tlByLift[lk] = (tlByLift[lk] || 0) + (set.reps || 0) * kg * (kg / rm);
      });
    });
  });
  periodLog.forEach(function(e) {
    if (!e.ts || e.ts < cutoff) return;
    var lk = e.liftKey || '_other';
    tlByLift[lk] = (tlByLift[lk] || 0) + (e.vol || 0) * (e.pct || 0.75);
  });
  var ss = 0;
  Object.keys(tlByLift).forEach(function(lk) { ss += (tlByLift[lk] / 42) * _tauDay(lk); });

  return { fatigue: fatigue, steadyState: Math.max(ss, SS_FLOOR) };
}

function calcFadiga() {
  var r = getFatigaRaw();
  return Math.round(r.fatigue / r.steadyState * 100);
}

// Projeta fadiga dia a dia até cair abaixo de 80% do SS (compatível com τ múltiplos)
function calcRestDays() {
  var base   = getFatigaRaw();
  var target = 0.8 * base.steadyState;
  if (base.fatigue <= target) return 0;
  var now = Date.now();
  for (var d = 1; d <= 60; d++) {
    if (getFatigaRaw(now + d * 86400000).fatigue <= target) return d;
  }
  return 60;
}
globalThis.calcRestDays = calcRestDays;

function updateFadigaBar() {
  var fill  = g('fatigaFill');
  var label = g('fatigaLabel');
  if (!fill || !label) return;
  var pct = calcFadiga();
  fill.style.width      = Math.min(100, pct) + '%';
  fill.style.background = pct < 80 ? 'var(--lime)' : pct < 120 ? 'var(--amber)' : 'var(--red)';
  label.style.color     = pct < 80 ? 'var(--muted)' : pct < 120 ? 'var(--amber)' : 'var(--red)';
}
globalThis.updateFadigaBar = updateFadigaBar;

// ── Modo Deload ───────────────────────────────
function syncDeloadBtn() {
  var btn = g('btnDeload');
  if (!btn) return;
  btn.classList.toggle('deload-on', deloadMode);
}
var _btnDeload = g('btnDeload');
if (_btnDeload) {
  _btnDeload.addEventListener('click', function() {
    setDeloadMode(!deloadMode);
    syncDeloadBtn();
    renderKanban();
    renderPeriodGrid();
    saveState();
  });
}

// Call fbInit if available (firebase.js is a regular script)
if (typeof fbInit === 'function') fbInit();
