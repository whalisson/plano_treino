// ── GORILA GYM — workoutlog.js ────────────────
// Registro de execucao de treinos: sessoes, sets realizados e historico

import { uid, g, saveState } from './state.js';

var DAYS = ['Segunda','Terca','Quarta','Quinta','Sexta','Sabado','Domingo'];

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
        '<input type="number" class="wl-kg" id="wl-kg-' + idx + '" step="0.5" placeholder="kg" style="width:70px;">' +
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
  g('mWorkoutLog').classList.remove('on');
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
  });
}
