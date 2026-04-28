// ── GORILA GYM — workoutlog.js ────────────────
// Registro de execucao de treinos: sessoes, sets realizados e historico

import { uid, g, saveState } from './state.js';
import { DAYS } from './constants.js';

// ── Estado ────────────────────────────────────
export let workoutLog = [];
export function setWorkoutLog(v) { workoutLog = v; }

// ── Funcoes puras ──────────────────────────────

/**
 * Cria uma sessao nova a partir dos exercicios planejados em board[dayIdx].
 * Nao muta o board.
 */
export function createWorkoutSession(board, dayIdx, dateStr) {
  var day = board[dayIdx] || [];
  return {
    id: uid(),
    date: dateStr,
    dayIdx: dayIdx,
    dayLabel: DAYS[dayIdx] || 'Dia ' + (dayIdx + 1),
    startedAt: Date.now(),
    finishedAt: null,
    exercises: day.map(function(item) {
      return {
        srcId:        item.srcId || item.id,
        name:         item.name,
        group:        item.group || '',
        plannedKg:    item.kg,
        plannedReps:  item.reps,
        sets:         [],
      };
    }),
  };
}

/**
 * Adiciona um set {reps, kg} ao exercicio pelo nome.
 * Retorna nova sessao (imutavel).
 */
export function addSet(session, exerciseName, setData) {
  var exIdx = session.exercises.findIndex(function(e) {
    return e.name === exerciseName;
  });
  if (exIdx === -1) {
    throw new Error('Exercicio "' + exerciseName + '" nao encontrado na sessao');
  }
  var newSet = { reps: setData.reps, kg: setData.kg, completedAt: Date.now() };
  var newExercises = session.exercises.map(function(ex, i) {
    if (i !== exIdx) return ex;
    return Object.assign({}, ex, { sets: ex.sets.concat(newSet) });
  });
  return Object.assign({}, session, { exercises: newExercises });
}

/**
 * Remove um set pelo indice dentro do exercicio.
 * Retorna nova sessao (imutavel).
 */
export function removeSet(session, exerciseName, setIdx) {
  var exIdx = session.exercises.findIndex(function(e) {
    return e.name === exerciseName;
  });
  if (exIdx === -1) {
    throw new Error('Exercicio "' + exerciseName + '" nao encontrado na sessao');
  }
  var ex = session.exercises[exIdx];
  if (setIdx < 0 || setIdx >= ex.sets.length) {
    throw new Error('setIdx ' + setIdx + ' fora do intervalo (0..' + (ex.sets.length - 1) + ')');
  }
  var newSets = ex.sets.filter(function(_, i) { return i !== setIdx; });
  var newExercises = session.exercises.map(function(e, i) {
    if (i !== exIdx) return e;
    return Object.assign({}, e, { sets: newSets });
  });
  return Object.assign({}, session, { exercises: newExercises });
}

/**
 * Marca a sessao como finalizada.
 * Retorna nova sessao (imutavel).
 */
export function finishSession(session) {
  return Object.assign({}, session, { finishedAt: Date.now() });
}

/**
 * Calcula volume total da sessao: soma de (kg * reps) de todos os sets.
 */
export function calcSessionVolume(session) {
  var total = 0;
  session.exercises.forEach(function(ex) {
    ex.sets.forEach(function(s) { total += s.kg * s.reps; });
  });
  return Math.round(total * 100) / 100;
}

/**
 * Retorna array de { date, dayLabel, sets } para o exercicio, apenas sessoes
 * finalizadas, ordenadas da mais antiga para a mais recente.
 */
export function getExerciseHistory(log, exerciseName) {
  return log
    .filter(function(s) { return s.finishedAt !== null; })
    .map(function(s) {
      var ex = s.exercises.find(function(e) { return e.name === exerciseName; });
      if (!ex || ex.sets.length === 0) return null;
      return { date: s.date, dayLabel: s.dayLabel, sets: ex.sets, startedAt: s.startedAt };
    })
    .filter(Boolean)
    .sort(function(a, b) { return a.startedAt - b.startedAt; });
}

/**
 * Retorna a sessao mais recente para o dayIdx (incluindo em andamento).
 * Retorna null se nenhuma sessao encontrada.
 */
export function getLastSessionForDay(log, dayIdx) {
  var filtered = log.filter(function(s) { return s.dayIdx === dayIdx; });
  if (filtered.length === 0) return null;
  return filtered.reduce(function(best, s) {
    return s.startedAt >= best.startedAt ? s : best;
  });
}

/**
 * Retorna o set com maior kg registrado para o exercicio (apenas sessoes finalizadas).
 * Retorna { kg, reps, date } ou null.
 */
export function getPersonalRecord(log, exerciseName) {
  var best = null;
  log
    .filter(function(s) { return s.finishedAt !== null; })
    .forEach(function(s) {
      var ex = s.exercises.find(function(e) { return e.name === exerciseName; });
      if (!ex) return;
      ex.sets.forEach(function(set) {
        if (!best || set.kg > best.kg) {
          best = { kg: set.kg, reps: set.reps, date: s.date };
        }
      });
    });
  return best;
}

// ── Acoes com efeito (state + persist) ────────────────────────────────────────

/**
 * Inicia um treino: cria sessao e adiciona ao workoutLog.
 */
export function startWorkout(board, dayIdx, dateStr) {
  var session = createWorkoutSession(board, dayIdx, dateStr);
  workoutLog = workoutLog.concat(session);
  saveState();
  return session;
}

/**
 * Atualiza uma sessao existente no workoutLog pelo id.
 */
export function updateSession(session) {
  workoutLog = workoutLog.map(function(s) {
    return s.id === session.id ? session : s;
  });
  saveState();
}

// ── UI do Modal de Registro ───────────────────────────────────────────────────

var _activeSession = null; // sessao em andamento no modal

function todayStr() {
  var d = new Date();
  return String(d.getDate()).padStart(2,'0') + '/' +
         String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
}

export function openWorkoutLogModal(board, dayIdx) {
  var last = getLastSessionForDay(workoutLog, dayIdx);
  _activeSession = createWorkoutSession(board, dayIdx, todayStr());
  g('mWorkoutLogTitle').textContent = 'Registrar — ' + _activeSession.dayLabel;
  g('mWorkoutLogDate').value = todayStr();
  renderWorkoutLogBody(last);
  g('mWorkoutLog').classList.add('on');
}

function renderWorkoutLogBody(lastSession) {
  var body = g('mWorkoutLogBody');
  if (!_activeSession || !_activeSession.exercises.length) {
    body.innerHTML = '<p style="color:var(--muted);font-size:13px;">Nenhum exercício planejado para este dia.</p>';
    return;
  }
  body.innerHTML = _activeSession.exercises.map(function(ex, idx) {
    var lastEx = lastSession && lastSession.exercises.find(function(e) { return e.name === ex.name; });
    var lastSets = lastEx && lastEx.sets.length
      ? lastEx.sets.map(function(s) { return s.kg + 'kg×' + s.reps; }).join(' · ')
      : null;
    var setsHtml = ex.sets.map(function(s, si) {
      return '<span class="wl-set-chip" data-ex="' + idx + '" data-set="' + si + '">' +
        s.kg + 'kg×' + s.reps +
        '<button class="wl-del-set" onclick="wlRemoveSet(' + idx + ',' + si + ')">×</button></span>';
    }).join('');
    return '<div class="wl-ex-block" id="wl-ex-' + idx + '">' +
      '<div class="wl-ex-name">' + ex.name +
        '<span class="wl-planned"> (' + ex.plannedReps + ' · ' + ex.plannedKg + 'kg planejado)</span>' +
      '</div>' +
      (lastSets ? '<div class="wl-last">Última vez: ' + lastSets + '</div>' : '') +
      '<div class="wl-sets" id="wl-sets-' + idx + '">' + setsHtml + '</div>' +
      '<div class="wl-add-row">' +
        '<input type="number" class="wl-kg" id="wl-kg-' + idx + '" step="0.5" placeholder="kg" value="' + (ex.plannedKg || '') + '" style="width:70px;">' +
        '<span style="color:var(--muted);">×</span>' +
        '<input type="number" class="wl-reps" id="wl-reps-' + idx + '" placeholder="reps" style="width:60px;">' +
        '<button class="wl-add-btn" onclick="wlAddSet(' + idx + ')">+ Série</button>' +
      '</div>' +
    '</div>';
  }).join('<hr style="border:none;border-top:1px solid var(--border);margin:8px 0;">');
}

export function wlAddSet(exIdx) {
  var ex   = _activeSession.exercises[exIdx];
  var kg   = parseFloat(g('wl-kg-' + exIdx).value);
  var reps = parseInt(g('wl-reps-' + exIdx).value, 10);
  if (!kg || !reps) return;
  _activeSession = addSet(_activeSession, ex.name, { kg: kg, reps: reps });
  var lastSession = getLastSessionForDay(workoutLog, _activeSession.dayIdx);
  renderWorkoutLogBody(lastSession);
}

export function wlRemoveSet(exIdx, setIdx) {
  var ex = _activeSession.exercises[exIdx];
  _activeSession = removeSet(_activeSession, ex.name, setIdx);
  var lastSession = getLastSessionForDay(workoutLog, _activeSession.dayIdx);
  renderWorkoutLogBody(lastSession);
}

export function finishWorkoutLog() {
  if (!_activeSession) return;
  var dateInput = g('mWorkoutLogDate').value.trim();
  if (dateInput) _activeSession = Object.assign({}, _activeSession, { date: dateInput });
  _activeSession = finishSession(_activeSession);
  workoutLog = workoutLog.concat(_activeSession);
  _activeSession = null;
  saveState();
  if (typeof globalThis.updateFadigaBar === 'function') globalThis.updateFadigaBar();
  g('mWorkoutLog').classList.remove('on');
  renderWorkoutHistory();
}

export function deleteExerciseHistory(name) {
  workoutLog = workoutLog.map(function(s) {
    var newExercises = s.exercises.map(function(ex) {
      if (ex.name !== name) return ex;
      return Object.assign({}, ex, { sets: [] });
    });
    return Object.assign({}, s, { exercises: newExercises });
  });
  saveState();
  renderWorkoutHistory();
}

export function renderWorkoutHistory() {
  var section = g('wlHistorySection');
  var container = g('wlHistoryCharts');
  if (!section || !container) return;

  // Coleta nomes únicos de exercícios de todas as sessões finalizadas
  var names = [];
  workoutLog.filter(function(s) { return s.finishedAt !== null; }).forEach(function(s) {
    s.exercises.forEach(function(ex) {
      if (ex.sets.length && names.indexOf(ex.name) === -1) names.push(ex.name);
    });
  });

  if (!names.length) { section.style.display = 'none'; return; }
  section.style.display = '';

  container.innerHTML = names.map(function(name) {
    var hist = getExerciseHistory(workoutLog, name).slice(-5);
    var safeId = name.replace(/[^a-z0-9]/gi, '_');
    var rows = hist.map(function(entry) {
      var setsStr = entry.sets.map(function(s) { return s.kg + 'kg×' + s.reps; }).join(' · ');
      return '<tr><td>' + entry.date + '</td><td>' + setsStr + '</td>' +
        '<td style="font-family:var(--mono);color:var(--teal);">' +
          Math.round(entry.sets.reduce(function(t,s){ return t + s.kg*s.reps; }, 0)) + ' kg</td></tr>';
    }).join('');
    return '<div class="wlh-card">' +
      '<div class="wlh-header">' +
        '<span class="wlh-name">' + name + '</span>' +
        '<button class="wlh-del" onclick="wlDeleteExHistory(\'' + safeId + '\')" data-name="' + name + '" title="Apagar histórico">🗑</button>' +
      '</div>' +
      '<table class="wlh-table"><thead><tr><th>Data</th><th>Séries</th><th>Volume</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';
  }).join('');

  // Wires up delete buttons (safer than inline — avoids quoting issues with special chars)
  container.querySelectorAll('.wlh-del').forEach(function(btn) {
    btn.onclick = function() {
      var n = btn.getAttribute('data-name');
      if (confirm('Apagar todo o histórico de "' + n + '"?')) deleteExerciseHistory(n);
    };
  });
}

// ── Modal focado: um exercício por vez ───────────────────────────────────────

var _exLog = null; // { dayIdx, exIdx, exName, plannedKg, sets: [] }

export function openExLog(board, dayIdx, exIdx) {
  var ex = board[dayIdx] && board[dayIdx][exIdx];
  if (!ex) return;
  var last = getLastSessionForDay(workoutLog, dayIdx);
  var lastEx = last && last.exercises.find(function(e) { return e.name === ex.name; });
  _exLog = { dayIdx: dayIdx, exIdx: exIdx, exName: ex.name, plannedKg: ex.kg, group: ex.group || '', bilateral: ex.bilateral || false, sets: [] };

  g('mExLogTitle').textContent = ex.name;
  g('mExLogPlanned').textContent = ex.reps + ' · ' + ex.kg + 'kg planejado';
  g('mExLogLast').textContent = lastEx && lastEx.sets.length
    ? 'Última: ' + lastEx.sets.map(function(s){ return s.kg+'kg×'+s.reps; }).join(' · ')
    : '';
  g('mExLogKg').value  = ex.kg || '';
  g('mExLogReps').value = '';
  _renderExLogSets();
  g('mExLog').classList.add('on');
  g('mExLogReps').focus();
}

function _renderExLogSets() {
  var el = g('mExLogSets');
  if (!el) return;
  el.innerHTML = _exLog.sets.map(function(s, i) {
    return '<span class="wl-set-chip">' + s.kg + 'kg×' + s.reps +
      '<button class="wl-del-set" data-i="' + i + '">×</button></span>';
  }).join('');
  el.querySelectorAll('.wl-del-set').forEach(function(btn) {
    btn.onclick = function() {
      var i = parseInt(btn.getAttribute('data-i'), 10);
      _exLog.sets.splice(i, 1);
      _renderExLogSets();
    };
  });
}

export function exLogAddSet() {
  var kg   = parseFloat(g('mExLogKg').value);
  var reps = parseInt(g('mExLogReps').value, 10);
  if (!kg || !reps) return;
  _exLog.sets.push({ kg: kg, reps: reps, completedAt: Date.now() });
  _renderExLogSets();
  g('mExLogReps').value = '';
  g('mExLogReps').focus();
}

export function exLogSave() {
  if (!_exLog || !_exLog.sets.length) { g('mExLog').classList.remove('on'); _exLog = null; return; }
  var savedExName = _exLog.exName;
  var savedSets   = _exLog.sets.slice();

  // Busca ou cria sessão do dia
  var dateStr = todayStr();
  var existing = getLastSessionForDay(workoutLog, _exLog.dayIdx);
  var session;
  if (existing && existing.finishedAt === null) {
    session = existing;
  } else {
    session = { id: uid(), date: dateStr, dayIdx: _exLog.dayIdx, dayLabel: DAYS[_exLog.dayIdx] || '',
      startedAt: Date.now(), finishedAt: null, exercises: [] };
    workoutLog = workoutLog.concat(session);
  }

  // Adiciona ou acumula sets no exercício
  var hasEx = session.exercises.some(function(e) { return e.name === _exLog.exName; });
  if (!hasEx) {
    var newEx = { name: _exLog.exName, plannedKg: _exLog.plannedKg, group: _exLog.group, bilateral: _exLog.bilateral, sets: _exLog.sets.slice() };
    session = Object.assign({}, session, { exercises: session.exercises.concat(newEx) });
  } else {
    session = Object.assign({}, session, {
      exercises: session.exercises.map(function(e) {
        return e.name === _exLog.exName ? Object.assign({}, e, { sets: e.sets.concat(_exLog.sets) }) : e;
      })
    });
  }

  workoutLog = workoutLog.map(function(s) { return s.id === session.id ? finishSession(session) : s; });
  saveState();
  if (typeof globalThis.updateFadigaBar === 'function') globalThis.updateFadigaBar();
  renderWorkoutHistory();
  g('mExLog').classList.remove('on');
  _exLog = null;
  if (typeof globalThis.checkExerciseProgression === 'function') {
    globalThis.checkExerciseProgression(savedExName, savedSets);
  }
}

// Evento de fechar modal
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    var btnCancel = g('btnCancelWorkoutLog');
    var btnFinish = g('btnFinishWorkoutLog');
    if (btnCancel) btnCancel.addEventListener('click', function() {
      _activeSession = null;
      g('mWorkoutLog').classList.remove('on');
    });
    if (btnFinish) btnFinish.addEventListener('click', finishWorkoutLog);

    var btnCancelEx = g('btnCancelExLog');
    var btnSaveEx   = g('btnSaveExLog');
    var btnAddSetEx = g('btnAddSetExLog');
    if (btnCancelEx) btnCancelEx.addEventListener('click', function() { g('mExLog').classList.remove('on'); _exLog = null; });
    if (btnSaveEx)   btnSaveEx.addEventListener('click', exLogSave);
    if (btnAddSetEx) btnAddSetEx.addEventListener('click', exLogAddSet);

    // Enter no campo reps adiciona série
    var repsInput = g('mExLogReps');
    if (repsInput) repsInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') exLogAddSet(); });
  });
}
