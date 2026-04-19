// ── GORILA GYM — feeder.js ───────────────────────
// Feeder sets (aquecimento automático) por exercício

import { g, round05, parseSetCount, checksState, customLifts,
  BASE_SUP, BASE_AGA, BASE_TER } from './state.js';
import { board } from './logbook.js';
import { workoutLog } from './workoutlog.js';
import { periodBase, LIFT_SOLID, getCustomColor } from './periodizacao.js';

// 40% × 5 · 60% × 3 · 80% × 1
const FEEDERS = [
  { pct: 0.40, label: '40%', reps: '5 reps' },
  { pct: 0.60, label: '60%', reps: '3 reps' },
  { pct: 0.80, label: '80%', reps: '1 rep'  },
];

let selectedEx = null;

// ── Mapeia nome para chave de lift ───────────────
function liftKeyFor(name) {
  var n = name.toLowerCase();
  if (n.includes('supino')) return 'supino';
  if (n.includes('agachamento') || n.includes('agacha') || n.includes('squat')) return 'agacha';
  if (n.includes('terra') || n.includes('deadlift')) return 'terra';
  var cl = customLifts || [];
  for (var i = 0; i < cl.length; i++) {
    var ln = cl[i].name.toLowerCase();
    if (n.includes(ln) || ln.includes(n)) return cl[i].id;
  }
  return null;
}

// ── Peso da série atual na periodização ─────────
function getPeriodWeight(liftKey, rm) {
  if (!rm) return null;
  var currentWeekIdx = -1, allPrevDone = true;
  periodBase.forEach(function(w, wi) {
    var wEff = (w.byLift && w.byLift[liftKey]) ? Object.assign({}, w, w.byLift[liftKey]) : w;
    if (wEff.skip || wEff.rest || !wEff.series) return;
    var total = wEff.series.reduce(function(a, s) { return a + parseSetCount(s.r); }, 0);
    var state = (checksState[liftKey] || {})[wi] || {};
    var done  = Object.values(state).filter(Boolean).length;
    if (currentWeekIdx === -1 && done < total) {
      if (allPrevDone || done > 0) currentWeekIdx = wi;
    }
    if (done < total) allPrevDone = false;
  });
  if (currentWeekIdx === -1) return null;
  var w    = periodBase[currentWeekIdx];
  var wEff = (w.byLift && w.byLift[liftKey]) ? Object.assign({}, w, w.byLift[liftKey]) : w;
  if (!wEff.series) return null;
  var state = (checksState[liftKey] || {})[currentWeekIdx] || {};
  var checkIdx = 0;
  for (var si = 0; si < wEff.series.length; si++) {
    var s    = wEff.series[si];
    var nChk = parseSetCount(s.r);
    for (var ci = 0; ci < nChk; ci++) {
      if (!state[checkIdx + ci]) return round05(rm * s.p);
    }
    checkIdx += nChk;
  }
  return null;
}

// ── Último peso registrado no logbook ───────────
function getLastLoggedKg(exName) {
  for (var i = (workoutLog.length || 0) - 1; i >= 0; i--) {
    var session = workoutLog[i];
    var ex = (session.exercises || []).find(function(e) {
      return e.name === exName && e.sets && e.sets.length > 0;
    });
    if (ex) {
      var maxKg = Math.max.apply(null, ex.sets.map(function(s) { return s.kg || 0; }));
      if (maxKg > 0) return maxKg;
    }
  }
  return null;
}

// ── Peso de trabalho (log tem prioridade) ────────
function getWorkingWeight(ex) {
  var logged = getLastLoggedKg(ex.name);
  if (logged) return { kg: logged, source: 'log' };
  if (ex.key && ex.rm) {
    var pw = getPeriodWeight(ex.key, ex.rm);
    if (pw) return { kg: pw, source: 'period' };
  }
  return null;
}

// ── Lista de exercícios únicos do kanban ─────────
function getAllExercises() {
  var seen = {}, list = [];
  var supRM = parseFloat(g('rm-supino').value) || BASE_SUP;
  var agaRM = parseFloat(g('rm-agacha').value) || BASE_AGA;
  var terRM = parseFloat(g('rm-terra').value)  || BASE_TER;
  var rmMap = { supino: supRM, agacha: agaRM, terra: terRM };
  (customLifts || []).forEach(function(cl) { rmMap[cl.id] = cl.rm || 0; });

  board.forEach(function(day) {
    (day || []).forEach(function(item) {
      if (!item.name || seen[item.name]) return;
      seen[item.name] = true;
      var key = liftKeyFor(item.name);
      var color = '#6b7280';
      if (key === 'supino')      color = LIFT_SOLID.supino || '#50e3c2';
      else if (key === 'agacha') color = LIFT_SOLID.agacha || '#c9ff3a';
      else if (key === 'terra')  color = LIFT_SOLID.terra  || '#ff4fd8';
      else if (key) {
        var idx = (customLifts || []).findIndex(function(cl) { return cl.id === key; });
        if (idx >= 0) color = getCustomColor(idx);
      }
      list.push({ name: item.name, key: key, rm: rmMap[key] || 0, color: color });
    });
  });
  return list;
}

// ── Render principal ─────────────────────────────
export function renderFeeder() {
  var listEl   = g('feederList');
  var detailEl = g('feederDetail');
  if (!listEl) return;

  var exercises = getAllExercises();

  if (selectedEx && !exercises.find(function(e) { return e.name === selectedEx; })) {
    selectedEx = null;
  }

  listEl.innerHTML = '';
  var firstWithData = null;

  exercises.forEach(function(ex) {
    var ww   = getWorkingWeight(ex);
    var card = document.createElement('div');
    card.className = 'feeder-ex-card' + (selectedEx === ex.name ? ' selected' : '');
    card.style.setProperty('--ex-color', ex.color);

    if (!ww) {
      card.innerHTML =
        '<div class="feeder-ex-name" style="color:' + ex.color + '">' + ex.name + '</div>'
        + '<div class="feeder-ex-none">Sem dados</div>';
      card.style.opacity = '.45';
      card.style.cursor = 'default';
    } else {
      if (!firstWithData) firstWithData = ex.name;
      card.innerHTML =
        '<div class="feeder-ex-name" style="color:' + ex.color + '">' + ex.name + '</div>'
        + '<div class="feeder-ex-working">' + ww.kg + '<span>kg</span></div>'
        + '<div class="feeder-ex-source">' + (ww.source === 'log' ? 'último log' : 'periodização') + '</div>';
      card.addEventListener('click', function() {
        selectedEx = ex.name;
        renderFeeder();
      });
    }
    listEl.appendChild(card);
  });

  if (!selectedEx && firstWithData) selectedEx = firstWithData;

  if (!selectedEx || !detailEl) { if (detailEl) detailEl.style.display = 'none'; return; }

  var sel = exercises.find(function(e) { return e.name === selectedEx; });
  var ww  = sel ? getWorkingWeight(sel) : null;

  if (!sel || !ww) { detailEl.style.display = 'none'; return; }
  detailEl.style.display = 'block';

  g('feederDetailTitle').innerHTML =
    '<span style="color:' + sel.color + '">' + sel.name + '</span>'
    + '&nbsp;<span class="feeder-working-badge">' + ww.kg + ' kg · '
    + (ww.source === 'log' ? 'último log' : 'periodização') + '</span>';

  g('feederSets').innerHTML = FEEDERS.map(function(f) {
    var w = round05(ww.kg * f.pct);
    return '<div class="feeder-set-row">'
      + '<span class="feeder-set-pct" style="color:' + sel.color + '">' + f.label + '</span>'
      + '<div class="feeder-set-weight">' + w + '<span>kg</span></div>'
      + '<span class="feeder-set-reps">' + f.reps + '</span>'
      + '</div>';
  }).join('');
}
