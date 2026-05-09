// ── GORILA GYM — app.js ──────────────────────
// Ponto de entrada: navegação, export/import e inicialização

import { uid, g, round05, saveState, loadState, BASE_SUP, BASE_AGA, BASE_TER,
  checksState, setChecksState, rmTestValues, setRmTestValues,
  kgHistory, setKgHistory, cycleHistory, setCycleHistory,
  customLifts, setCustomLifts, cycleStartDates, setCycleStartDates,
  rmHistory, setRmHistory, parseSetCount, periodLog, setPeriodLog,
  amrapReps, setAmrapReps } from './state.js';
import { idbSet, RECORD_KEY } from './db.js';
import { board, bank, boardNames, altBoards, setBoard, setBank, setBoardNames, setAltBoards,
  renderKanban, renderBank, setupBankDropzone, renderPeriodGrid, renderProgressCharts,
  renderAltBoards, deloadMode, setDeloadMode } from './logbook.js';
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
import { buildAllPeriod, renderCustomLifts, renderCycleHistory, periodBase, resetCycle } from './periodizacao.js';
import { renderAnilhas } from './anilhas.js';
import { renderFeeder } from './feeder.js';
import { picoCompDate, setPicoCompDate, renderPico, picoOpenLogModal, picoSetDate, picoConfirmLog } from './pico.js';
import { updateFadigaBar, checkDeload, checkOverreaching } from './fadiga.js';
import { renderVolumeBars } from './volume.js';

// ── Expor render functions no globalThis para que applyState as encontre ──────
// (testes substituem via global.* no beforeEach; produção usa as funções reais)
globalThis.buildAllPeriod       = buildAllPeriod;
globalThis.openResetCycleModal  = function() {
  var body = document.getElementById('mResetCycleBody');
  if (!body) return;
  body.innerHTML = '';

  var LIFT_LABEL_MAP = { supino: 'Supino', agacha: 'Agachamento', terra: 'Terra' };
  var LIFT_COLOR_MAP = { supino: 'var(--teal)', agacha: 'var(--lime)', terra: 'var(--mag)' };

  var allLifts = ['supino', 'agacha', 'terra']
    .map(function(k) { return { key: k, label: LIFT_LABEL_MAP[k], color: LIFT_COLOR_MAP[k] }; })
    .concat(customLifts.map(function(l) { return { key: l.id, label: l.name, color: 'var(--accent)' }; }));

  allLifts.forEach(function(lft) {
    var btn = document.createElement('button');
    btn.className = 'sec';
    btn.style.cssText = 'width:100%;text-align:left;padding:9px 13px;display:flex;justify-content:space-between;align-items:center;';
    btn.innerHTML = '<span style="color:' + lft.color + ';font-weight:600;">' + lft.label + '</span>'
      + '<span style="font-size:11px;color:var(--muted);">↺ resetar</span>';
    btn.onclick = function() {
      document.getElementById('mResetCycle').classList.remove('on');
      resetCycle(lft.key);
    };
    body.appendChild(btn);
  });

  var divider = document.createElement('div');
  divider.style.cssText = 'height:1px;background:var(--border);margin:6px 0;';
  body.appendChild(divider);

  var btnAll = document.createElement('button');
  btnAll.style.cssText = 'width:100%;background:rgba(255,107,107,.12);border:1px solid rgba(255,107,107,.28);color:var(--red);';
  btnAll.textContent = '↺ Resetar todos';
  btnAll.onclick = function() {
    document.getElementById('mResetCycle').classList.remove('on');
    resetCycle();
  };
  body.appendChild(btnAll);

  document.getElementById('mResetCycle').classList.add('on');
};
globalThis.renderAnilhas        = renderAnilhas;
globalThis.renderFeeder         = renderFeeder;
globalThis.renderPico           = renderPico;
globalThis.picoOpenLogModal     = picoOpenLogModal;
globalThis.picoSetDate          = picoSetDate;
globalThis.picoConfirmLog       = picoConfirmLog;
globalThis.calcRM               = calcRM;
globalThis.renderCustomLifts    = renderCustomLifts;
globalThis.populateRMLiftSelect = populateRMLiftSelect;
globalThis.renderRMHistory      = renderRMHistory;
globalThis.renderKanban         = renderKanban;
globalThis.renderBank           = renderBank;
globalThis.setupBankDropzone    = setupBankDropzone;
globalThis.renderPeriodGrid     = renderPeriodGrid;
globalThis.renderProgressCharts = renderProgressCharts;
globalThis.renderAltBoards      = renderAltBoards;
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
globalThis.renderVolumeBars = renderVolumeBars;
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

// ── Deload banner ─────────────────────────────
var _deloadDismissedDay = null;
function updateDeloadBanner() {
  var banner  = document.getElementById('deloadBanner');
  var subEl   = document.getElementById('deloadBannerSub');
  var dismiss = document.getElementById('deloadBannerDismiss');
  if (!banner) return;
  var today = new Date().toDateString();
  if (_deloadDismissedDay === today) { banner.style.display = 'none'; return; }
  var info = checkDeload();
  if (!info.needed) { banner.style.display = 'none'; return; }
  if (subEl) subEl.textContent =
    'ATL ' + info.atlPct + '% há ' + info.days + ' dias · reduza volume para ~' + info.suggestedPct + '% do normal';
  banner.style.display = 'flex';
  if (dismiss && !dismiss._bound) {
    dismiss._bound = true;
    dismiss.addEventListener('click', function() {
      _deloadDismissedDay = today;
      banner.style.display = 'none';
    });
  }
}
globalThis.updateDeloadBanner = updateDeloadBanner;

// ── Overreaching banner ───────────────────────
var _overreachDismissedDay = null;
function updateOverreachingBanner() {
  var banner  = document.getElementById('overreachingBanner');
  var subEl   = document.getElementById('overreachingBannerSub');
  var dismiss = document.getElementById('overreachingBannerDismiss');
  if (!banner) return;
  var today = new Date().toDateString();
  if (_overreachDismissedDay === today) { banner.style.display = 'none'; return; }
  var info = checkOverreaching();
  if (!info.needed) { banner.style.display = 'none'; return; }
  if (subEl) subEl.textContent =
    'TSB ' + info.tsbPct + '% há ' + info.days + ' dias · reduza volume 40–50% por 3–5 dias antes de retomar';
  banner.style.display = 'flex';
  if (dismiss && !dismiss._bound) {
    dismiss._bound = true;
    dismiss.addEventListener('click', function() {
      _overreachDismissedDay = today;
      banner.style.display = 'none';
    });
  }
}
globalThis.updateOverreachingBanner = updateOverreachingBanner;

// ── gorila-save event handler ─────────────────
document.addEventListener('gorila-save', function() {
  setSyncStatus('saving');

  // Renders defensivos — um erro aqui não deve bloquear o save
  try { updateFadigaBar(); } catch(e) {}
  try { updateOverreachingBanner(); } catch(e) {}
  try { renderVolumeBars(); } catch(e) {}

  var data;
  try {
    data = {
      rmSupino:      parseFloat(g('rm-supino').value) || BASE_SUP,
      rmAgacha:      parseFloat(g('rm-agacha').value) || BASE_AGA,
      rmTerra:       parseFloat(g('rm-terra').value)  || BASE_TER,
      userAge:       parseInt((g('user-age') || {}).value) || 28,
      userExp:       parseInt((g('user-exp') || {}).value) || 3,
      checks:        checksState,
      rmTests:       rmTestValues,
      board:         board,
      boardNames:    boardNames,
      altBoards:     altBoards,
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
      picoCompDate:  picoCompDate,
      amrapReps:     amrapReps,
    };
  } catch(e) {
    setSyncStatus('error');
    return;
  }

  // Backup imediato no localStorage — garante que o dado não se perde
  // se o app for fechado antes do IDB confirmar (especialmente no iOS Safari)
  try { localStorage.setItem('gorila_fallback', JSON.stringify(data)); } catch(e) {}

  // IDB com timeout de 5s para evitar travar em "Salvando..." no Safari
  var saved = false;
  var idbTimeout = setTimeout(function() {
    if (!saved) { saved = true; setSyncStatus('saved'); }
  }, 5000);

  idbSet(RECORD_KEY, data)
    .then(function() {
      if (!saved) { saved = true; clearTimeout(idbTimeout); setSyncStatus('saved'); }
    })
    .catch(function() {
      if (!saved) { saved = true; clearTimeout(idbTimeout); setSyncStatus('error'); }
    });

  try {
    if (document.getElementById('pg-feeder') && document.getElementById('pg-feeder').classList.contains('on')) {
      if (typeof globalThis.renderFeeder === 'function') globalThis.renderFeeder();
    }
  } catch(e) {}
});

// ── Navegação entre abas ──────────────────────
var TAB_ORDER = ['periodizacao','logbook','rm','cardio','rpe','anilhas','feeder','pico']; // ordem original

function switchTab(p, dir) {
  if (!g('pg-' + p)) return;
  document.querySelectorAll('.ntab,.bntab').forEach(function(t) { t.classList.remove('on'); });
  document.querySelectorAll('.pg').forEach(function(pg) { pg.classList.remove('on','pg-enter-r','pg-enter-l'); });
  document.querySelectorAll('[data-p="' + p + '"]').forEach(function(t) { t.classList.add('on'); });
  var newPg = g('pg-' + p);
  newPg.classList.add('on');
  if (dir) {
    var cls = dir === 'r' ? 'pg-enter-r' : 'pg-enter-l';
    newPg.classList.add(cls);
    setTimeout(function() { newPg.classList.remove(cls); }, 280);
  }
  if (p === 'cardio')       buildCardioChart();
  if (p === 'periodizacao') setTimeout(scrollToCurrentWeek, 80);
  if (p === 'anilhas')      renderAnilhas();
  if (p === 'feeder')       renderFeeder();
  if (p === 'pico')         renderPico();
  if (p === 'logbook')      renderVolumeBars();
}
globalThis.switchTab = switchTab;

g('ntabs').addEventListener('click', function(e) {
  var tab = e.target.closest('.ntab'); if (!tab) return;
  switchTab(tab.dataset.p);
});

// ── Bottom nav ──
var _maisOpen = false;
function closeMaisMenu() {
  _maisOpen = false;
  var m = g('maisMenu'); if (m) m.classList.remove('on');
  var b = g('btnMais');  if (b) b.classList.remove('on');
}
function toggleMaisMenu() {
  _maisOpen = !_maisOpen;
  var m = g('maisMenu'); if (m) m.classList.toggle('on', _maisOpen);
  var b = g('btnMais');  if (b) b.classList.toggle('on', _maisOpen);
}
var bnav = g('bottomnav');
if (bnav) {
  bnav.addEventListener('click', function(e) {
    var tab = e.target.closest('.bntab'); if (!tab) return;
    var p = tab.dataset.p;
    if (p === 'mais') { toggleMaisMenu(); return; }
    switchTab(p);
    closeMaisMenu();
  });
}
var maisMenu = g('maisMenu');
if (maisMenu) {
  maisMenu.addEventListener('click', function(e) {
    var btn = e.target.closest('.mais-item'); if (!btn) return;
    switchTab(btn.dataset.p);
    closeMaisMenu();
  });
}
document.addEventListener('click', function(e) {
  if (!_maisOpen) return;
  if (e.target.closest('#maisMenu') || e.target.closest('#btnMais')) return;
  closeMaisMenu();
});

// ── Swipe entre abas ──
(function() {
  var sx = 0, sy = 0, sTime = 0;
  document.addEventListener('touchstart', function(e) {
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    sTime = Date.now();
  }, { passive: true });
  document.addEventListener('touchend', function(e) {
    if (document.querySelector('.mbg.on')) return; // modal aberto
    if (e.target.closest('#bottomnav') || e.target.closest('#maisMenu')) return;
    if (e.target.closest('.kboard')) return; // kanban drag-drop
    var dx = e.changedTouches[0].clientX - sx;
    var dy = e.changedTouches[0].clientY - sy;
    var dt = Date.now() - sTime;
    if (Math.abs(dx) < 60 || Math.abs(dy) > 80 || dt > 500) return;
    var cur = document.querySelector('.ntab.on,.bntab.on[data-p]');
    if (!cur || cur.dataset.p === 'mais') return;
    var idx = TAB_ORDER.indexOf(cur.dataset.p);
    if (idx < 0) return;
    var next = dx < 0 ? TAB_ORDER[idx + 1] : TAB_ORDER[idx - 1];
    if (next) switchTab(next, dx < 0 ? 'r' : 'l');
  }, { passive: true });
})();

// ── Export / Import de dados ──────────────────
export function exportData() {
  var data = {
    _version:      1,
    _exportedAt:   new Date().toISOString(),
    rmSupino:      parseFloat(g('rm-supino').value) || BASE_SUP,
    rmAgacha:      parseFloat(g('rm-agacha').value) || BASE_AGA,
    rmTerra:       parseFloat(g('rm-terra').value)  || BASE_TER,
    userAge:       parseInt((g('user-age') || {}).value) || 28,
    userExp:       parseInt((g('user-exp') || {}).value) || 3,
    checks:        checksState,
    rmTests:       rmTestValues,
    board:         board,
    boardNames:    boardNames,
    altBoards:     altBoards,
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
    amrapReps:     amrapReps,
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
    if (saved.rmSupino)       g('rm-supino').value  = saved.rmSupino;
    if (saved.rmAgacha)       g('rm-agacha').value  = saved.rmAgacha;
    if (saved.rmTerra)        g('rm-terra').value   = saved.rmTerra;
    if (saved.userAge        && g('user-age'))  g('user-age').value  = saved.userAge;
    if (saved.userExp != null && g('user-exp')) g('user-exp').value  = saved.userExp;
    if (saved.checks)         setChecksState(saved.checks);
    if (saved.rmTests)        setRmTestValues(saved.rmTests);
    if (saved.board && saved.board.length === 7) setBoard(saved.board);
    if (saved.boardNames && saved.boardNames.length === 7) setBoardNames(saved.boardNames);
    if (saved.altBoards && Array.isArray(saved.altBoards)) setAltBoards(saved.altBoards);
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
    if (saved.picoCompDate) setPicoCompDate(saved.picoCompDate);
    if (saved.amrapReps && typeof saved.amrapReps === 'object') setAmrapReps(saved.amrapReps);
  }
  syncDeloadBtn();
  // Fila de renders — iterar aqui garante que nenhuma função seja esquecida.
  // Para adicionar um novo render: inclua o nome string abaixo e registre a
  // função via globalThis no módulo correspondente (igual às demais).
  var RENDER_QUEUE = [
    'buildAllPeriod', 'calcRM', 'renderCustomLifts', 'populateRMLiftSelect',
    'renderRMHistory', 'renderRatioCard', 'renderKanban', 'renderBank', 'setupBankDropzone',
    'renderPeriodGrid', 'renderProgressCharts', 'renderAltBoards', 'renderBuilderSegs',
    'renderSavedWorkouts', 'renderCycleHistory', 'renderRPEBlocks',
    'renderWorkoutHistory', 'updateFadigaBar', 'updateDeloadBanner', 'updateOverreachingBanner', 'updateRestCounters', 'renderPico',
    'renderVolumeBars',
  ];
  RENDER_QUEUE.forEach(function(fn) {
    if (typeof globalThis[fn] === 'function') globalThis[fn]();
  });
  // Persiste após cada renderização do kanban (instala o wrapper apenas uma vez)
  // _boardLoaded vive em globalThis para ser atualizado em chamadas subsequentes de applyState
  globalThis._boardLoaded = globalThis._boardLoaded || !!(saved && saved.board);
  if (!globalThis._kanbanSaveWrapInstalled) {
    globalThis._kanbanSaveWrapInstalled = true;
    var _origRenderKanban = globalThis.renderKanban;
    globalThis.renderKanban = function() {
      if (typeof _origRenderKanban === 'function') _origRenderKanban();
      var hasItems = board.some(function(day) { return day.length > 0; });
      if (hasItems || globalThis._boardLoaded) saveState();
    };
  }
  if (saved && saved.board) globalThis._boardLoaded = true;
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

// gorila-state-loaded event (re-login ou dados mais recentes do Firebase)
// Só aplica se trouxer dados reais — nunca chama applyState(null) aqui
// para não sobrescrever dados locais já carregados
document.addEventListener('gorila-state-loaded', function(e) {
  var result = e.detail;
  if (result && result.data) {
    applyState(result.data);
    idbSet(RECORD_KEY, result.data).catch(function() {});
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
makeDraggable(document.getElementById('ntabs'));

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
  altBoards.forEach(function(ab) {
    ab.exercises.forEach(function(item) {
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
  renderAltBoards();
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
