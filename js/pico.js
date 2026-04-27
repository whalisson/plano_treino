import { g, uid } from './state.js';
import { board, renderKanban, renderPeriodGrid } from './logbook.js';

const PEAK_WEEKS = [
  { label: 'S-6', sets: 4, reps: 3, pct: 0.77 },
  { label: 'S-5', sets: 3, reps: 3, pct: 0.82 },
  { label: 'S-4', sets: 3, reps: 2, pct: 0.87 },
  { label: 'S-3', sets: 2, reps: 2, pct: 0.90 },
  { label: 'S-2', sets: 2, reps: 1, pct: 0.93 },
  { label: 'S-1', sets: 1, reps: 1, pct: 0.92 },
];

const COMP_PCTS = [0.92, 0.97, 1.025];

export let picoCompDate = '';
export function setPicoCompDate(v) { picoCompDate = v; }

function round25(kg) { return Math.round(kg / 2.5) * 2.5; }

function getLifts() {
  return [
    { key: 'supino', label: 'Supino',       rm: parseFloat(g('rm-supino').value) || 74,  color: 'var(--cy)'  },
    { key: 'agacha', label: 'Agachamento',  rm: parseFloat(g('rm-agacha').value) || 93,  color: 'var(--lime)'},
    { key: 'terra',  label: 'Terra',        rm: parseFloat(g('rm-terra').value)  || 110, color: 'var(--mag)' },
  ];
}

function weeksUntil(iso) {
  if (!iso) return null;
  var diff = new Date(iso) - new Date();
  return diff < 0 ? null : Math.ceil(diff / (7 * 24 * 3600 * 1000));
}

function currentWeekIdx(iso) {
  var w = weeksUntil(iso);
  if (w === null) return -1;
  return Math.max(0, Math.min(5, 6 - w));
}

function buildRow(wk, i, lifts, isCurrent) {
  var cells = lifts.map(function(lft) {
    var kg = round25(lft.rm * wk.pct);
    return '<td style="padding:8px 10px;font-family:var(--mono);color:' + lft.color + '">'
      + kg + '<span style="font-size:10px;color:var(--muted);margin-left:2px">kg</span></td>';
  }).join('');

  var rowStyle = isCurrent
    ? 'background:rgba(201,255,58,.07);outline:1px solid rgba(201,255,58,.18);'
    : '';

  return '<tr style="' + rowStyle + 'border-bottom:1px solid var(--border);">'
    + '<td style="padding:8px 10px;font-family:var(--mono);font-weight:700;white-space:nowrap">'
      + wk.label
      + (isCurrent ? ' <span style="font-size:10px;color:var(--lime);font-weight:400">◀ atual</span>' : '')
    + '</td>'
    + '<td style="padding:8px 10px;color:var(--muted);font-size:12px">' + wk.sets + '×' + wk.reps + '</td>'
    + '<td style="padding:8px 10px;color:var(--muted);font-size:12px">' + Math.round(wk.pct * 100) + '%</td>'
    + cells
    + '<td style="padding:8px 10px">'
      + '<button class="sec" style="font-size:10px;padding:3px 9px;white-space:nowrap" onclick="picoOpenLogModal(' + i + ')">+ Logbook</button>'
    + '</td>'
    + '</tr>';
}

function buildCompRow(lifts) {
  var cells = lifts.map(function(lft) {
    var atts = COMP_PCTS.map(function(p) { return round25(lft.rm * p) + 'kg'; }).join(' / ');
    return '<td style="padding:8px 10px;font-family:var(--mono);font-size:11px;color:' + lft.color + '">' + atts + '</td>';
  }).join('');

  return '<tr style="background:rgba(108,99,255,.1);font-weight:600;">'
    + '<td style="padding:8px 10px;font-family:var(--mono)">Prova</td>'
    + '<td style="padding:8px 10px;color:var(--muted);font-size:11px">T1/T2/T3</td>'
    + '<td style="padding:8px 10px;color:var(--muted);font-size:11px">92/97/103%</td>'
    + cells
    + '<td></td>'
    + '</tr>';
}

export function renderPico() {
  var el = g('pg-pico');
  if (!el) return;

  var lifts  = getLifts();
  var weeks  = weeksUntil(picoCompDate);
  var curIdx = currentWeekIdx(picoCompDate);

  var weekInfo;
  if (!picoCompDate) {
    weekInfo = '<span style="color:var(--muted)">Defina a data da competição acima</span>';
  } else if (weeks === null) {
    weekInfo = '<span style="color:var(--red)">Competição já passou</span>';
  } else if (weeks === 0) {
    weekInfo = '<span style="color:var(--lime);font-weight:600">Semana da competição!</span>';
  } else if (weeks > 6) {
    weekInfo = '<span style="color:var(--amber)">' + weeks + ' semanas restantes — protocolo começa em ' + (weeks - 6) + ' semana(s)</span>';
  } else {
    weekInfo = '<span style="color:var(--lime)">' + weeks + ' semana(s) para a prova — ' + PEAK_WEEKS[6 - weeks].label + '</span>';
  }

  var headCols = lifts.map(function(l) {
    return '<th style="padding:7px 10px;text-align:left;font-size:11px;color:' + l.color + '">' + l.label + '</th>';
  }).join('');

  var rows = PEAK_WEEKS.map(function(wk, i) {
    return buildRow(wk, i, lifts, i === curIdx);
  }).join('');

  var attemptCards = lifts.map(function(lft) {
    var badges = COMP_PCTS.map(function(p, i) {
      var kg = round25(lft.rm * p);
      var opacity = 0.12 + i * 0.06;
      return '<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:6px;'
        + 'background:rgba(108,99,255,' + opacity + ');border:1px solid rgba(108,99,255,.35);'
        + 'font-family:var(--mono);font-size:12px;color:var(--accent)">'
        + 'T' + (i + 1) + ': ' + kg + 'kg</span>';
    }).join('');

    return '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 0;border-bottom:1px solid var(--border);">'
      + '<span style="font-size:12px;color:var(--muted);width:116px;flex-shrink:0">' + lft.label + '</span>'
      + badges
      + '</div>';
  }).join('');

  el.innerHTML = ''
    + '<div class="sh"><div class="shtitle">Calculadora de Pico</div><span class="badge bp">Competição</span></div>'
    + '<div class="sub">protocolo de 6 semanas · baseado no 1RM atual</div>'

    + '<div class="card" style="margin-bottom:14px;">'
    +   '<label style="font-size:11px;color:var(--muted);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Data da Competição</label>'
    +   '<div style="display:flex;align-items:center;gap:8px;">'
    +     '<input type="date" id="picoDateInput" value="' + (picoCompDate || '') + '" '
    +       'style="flex:1;min-width:0;background:var(--bg3);color:var(--text);border:1px solid var(--border2);border-radius:7px;padding:9px 12px;font-size:14px;font-family:var(--mono);color-scheme:dark;" '
    +       'oninput="picoSetDate(this.value)">'
    +     (picoCompDate ? '<button class="sec" style="flex-shrink:0;font-size:11px;padding:6px 11px;white-space:nowrap;" onclick="picoSetDate(\'\')">✕ Limpar</button>' : '')
    +   '</div>'
    +   '<div style="font-size:12px;margin-top:8px">' + weekInfo + '</div>'
    + '</div>'

    + '<div class="card" style="overflow-x:auto;margin-bottom:14px;padding:0;">'
    +   '<table style="width:100%;border-collapse:collapse;min-width:440px;">'
    +   '<thead><tr style="border-bottom:1px solid var(--border);">'
    +     '<th style="padding:7px 10px;text-align:left;font-size:11px;color:var(--muted)">Semana</th>'
    +     '<th style="padding:7px 10px;text-align:left;font-size:11px;color:var(--muted)">Volume</th>'
    +     '<th style="padding:7px 10px;text-align:left;font-size:11px;color:var(--muted)">%RM</th>'
    +     headCols
    +     '<th></th>'
    +   '</tr></thead>'
    +   '<tbody style="font-size:13px">'
    +     rows
    +     buildCompRow(lifts)
    +   '</tbody>'
    +   '</table>'
    + '</div>'

    + '<div class="card">'
    +   '<div style="font-size:13px;font-weight:600;margin-bottom:12px">Tentativas na Competição</div>'
    +   attemptCards
    + '</div>';
}

var _picoLogTarget = null;

export function picoOpenLogModal(weekIdx) {
  _picoLogTarget = weekIdx;
  g('picoLogWeekLabel').textContent = PEAK_WEEKS[weekIdx].label
    + ' — ' + PEAK_WEEKS[weekIdx].sets + '×' + PEAK_WEEKS[weekIdx].reps
    + ' @ ' + Math.round(PEAK_WEEKS[weekIdx].pct * 100) + '%';
  g('mPicoLog').classList.add('on');
}

export function picoSetDate(val) {
  picoCompDate = val;
  renderPico();
  document.dispatchEvent(new Event('gorila-save'));
}

export function picoConfirmLog() {
  if (_picoLogTarget === null) return;
  var wk     = PEAK_WEEKS[_picoLogTarget];
  var dayIdx = parseInt(g('picoLogDay').value);
  var lifts  = getLifts();

  lifts.forEach(function(lft) {
    var kg = round25(lft.rm * wk.pct);
    board[dayIdx].push({
      id:    uid(),
      srcId: null,
      name:  lft.label + ' — Pico ' + wk.label,
      kg:    kg,
      reps:  wk.sets + '×' + wk.reps,
    });
  });

  g('mPicoLog').classList.remove('on');
  _picoLogTarget = null;
  renderKanban();
  renderPeriodGrid();
  document.dispatchEvent(new Event('gorila-save'));

  document.querySelectorAll('.ntab').forEach(function(t)  { t.classList.remove('on'); });
  document.querySelectorAll('.pg').forEach(function(pg)   { pg.classList.remove('on'); });
  document.querySelector('[data-p="logbook"]').classList.add('on');
  g('pg-logbook').classList.add('on');
}
