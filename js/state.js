// ── GORILA GYM — state.js ────────────────────
// Utilitários, constantes de base e estado global compartilhado

function uid() { return Math.random().toString(36).slice(2, 9); }
function g(id) { return document.getElementById(id); }
function round05(v) { return Math.round(v * 2) / 2; }

// Parse "NxM" → número de séries
function parseSetCount(rStr) {
  var m = rStr.match(/^(\d+)x(\d+)$/);
  if (m) return parseInt(m[1]);
  return 1;
}

// ── Valores-base dos RMs ──────────────────────
var BASE_SUP = 74;
var BASE_AGA = 93;
var BASE_TER = 110;

// ── Estado global ─────────────────────────────
// checksState[lift][weekIdx][serIdx] = bool
var checksState = { supino: {}, agacha: {}, terra: {} };
// rmTestValues[lift][weekIdx] = kg inserido pelo usuário
var rmTestValues = { supino: {}, agacha: {}, terra: {} };
// kgHistory[exId] = [{date, kg, name}]
var kgHistory = {};
// cycleHistory = [{lift, rmStart, rmEnd, dateStart, dateEnd, gain, id}]
var cycleHistory = [];
// customLifts = [{id, name, rm}]
var customLifts = [];
// cycleStartDates[liftKey] = 'dd/mm/yyyy' — primeiro check do ciclo
var cycleStartDates = {};

// ── Persistência ──────────────────────────────
var _saveTimer = null;

function saveState() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(function() {
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
      cardioExtra:     cardioExtra,
      cardioGoal:      parseInt(g('cardioGoal').value)      || 300,
      cardioDailyGoal: parseInt(g('cardioDailyGoal').value) || 43,
      savedWorkouts: savedWorkouts,
      rpeBlocks:     rpeBlocks,
      customLifts:   customLifts,
      cycleStartDates: cycleStartDates,
    };
    idbSet(RECORD_KEY, data).catch(function() {
      try { localStorage.setItem('gorila_fallback', JSON.stringify(data)); } catch(ex) {}
    });
  }, 400);
}

function loadState() {
  return idbGet(RECORD_KEY).then(function(data) {
    if (data) return data;
    // Migrar de localStorage antigo
    try {
      var raw = localStorage.getItem('treino_v2') || localStorage.getItem('gorila_fallback');
      if (raw) {
        var parsed = JSON.parse(raw);
        idbSet(RECORD_KEY, parsed).then(function() {
          localStorage.removeItem('treino_v2');
          localStorage.removeItem('gorila_fallback');
        });
        return parsed;
      }
    } catch(ex) {}
    return null;
  }).catch(function() {
    try {
      var raw = localStorage.getItem('treino_v2');
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  });
}
