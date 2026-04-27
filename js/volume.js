// ── GORILA GYM — volume.js ────────────────────
// MEV / MAV / MRV semanal por grupo muscular (metodologia RP)

import { parseSetCount, periodLog, customLifts } from './state.js';
import { workoutLog } from './workoutlog.js';
import { board, bank, detectExerciseGroup } from './logbook.js';

var ZONES = {
  push: { label:'Push', mev:8,  mavLo:10, mavHi:20, mrv:25, col:'var(--mag)'   },
  pull: { label:'Pull', mev:10, mavLo:12, mavHi:20, mrv:25, col:'var(--cy)'    },
  legs: { label:'Legs', mev:8,  mavLo:12, mavHi:20, mrv:25, col:'var(--lime)'  },
  core: { label:'Core', mev:6,  mavLo:8,  mavHi:16, mrv:20, col:'var(--amber)' },
};

// Mapeamento dos lifts da periodização para grupo muscular
var PERIOD_LIFT_GROUP = {
  supino: 'push',
  agacha: 'legs',
  terra:  'pull',
};

function calcWeeklySets() {
  var cutoff  = Date.now() - 7 * 24 * 60 * 60 * 1000;
  var acc     = { push:0, pull:0, legs:0, core:0 };
  var hasReal = false;

  // Fonte 1: logbook — séries reais registradas nos últimos 7 dias
  workoutLog
    .filter(function(s) { return s.finishedAt && s.startedAt >= cutoff; })
    .forEach(function(s) {
      s.exercises.forEach(function(ex) {
        var grp = ex.group
          || detectExerciseGroup(ex.name || '')
          || ((bank.find(function(b) { return b.name === ex.name; }) || {}).group)
          || '';
        if (grp && acc[grp] !== undefined && ex.sets.length) {
          acc[grp] += ex.sets.length;
          hasReal = true;
        }
      });
    });

  // Fonte 2: periodização — checkboxes marcados nos últimos 7 dias com pct >= 60%
  periodLog
    .filter(function(e) { return e.ts >= cutoff && e.pct >= 0.60; })
    .forEach(function(e) {
      var grp = PERIOD_LIFT_GROUP[e.liftKey];
      if (!grp) {
        // lift personalizado: tenta detectar pelo nome
        var cl = customLifts.find(function(l) { return l.id === e.liftKey; });
        grp = cl ? detectExerciseGroup(cl.name || '') : '';
      }
      if (grp && acc[grp] !== undefined) {
        acc[grp] += 1;
        hasReal = true;
      }
    });

  if (hasReal) return { sets:acc, source:'real' };

  // Fallback: planejado (board) — nenhum dado real disponível
  board.forEach(function(day) {
    day.forEach(function(ex) {
      if (ex.group && acc[ex.group] !== undefined)
        acc[ex.group] += parseSetCount(String(ex.reps || '1'));
    });
  });

  return { sets:acc, source:'plan' };
}

function p(v, cap) {
  return (Math.min(Math.max(v, 0), cap) / cap * 100).toFixed(2) + '%';
}

export function renderVolumeBars() {
  var el = document.getElementById('volumeZonesCard');
  if (!el) return;

  var res    = calcWeeklySets();
  var sets   = res.sets;
  var isReal = res.source === 'real';

  var srcHtml = isReal
    ? '<span class="vmrv-src vmrv-src-real">● real (7d)</span>'
    : '<span class="vmrv-src vmrv-src-plan">● planejado</span>';

  var rows = ['push','pull','legs','core'].map(function(g) {
    var z   = ZONES[g];
    var cur = sets[g] || 0;
    var cap = z.mrv * 1.3;

    var lMev   = p(z.mev,   cap);
    var lMavLo = p(z.mavLo, cap);
    var lMavHi = p(z.mavHi, cap);
    var lMrv   = p(z.mrv,   cap);
    var lCur   = p(cur,     cap);

    var fMev  = z.mev;
    var fOk   = z.mavLo - z.mev;
    var fMav  = z.mavHi - z.mavLo;
    var fWarn = z.mrv   - z.mavHi;
    var fOver = +(cap   - z.mrv).toFixed(2);

    var status, stCol;
    if (cur === 0)            { status = '—';               stCol = 'var(--muted)'; }
    else if (cur < z.mev)    { status = 'Abaixo do MEV';   stCol = 'var(--amber)'; }
    else if (cur < z.mavLo)  { status = 'Acima do mínimo'; stCol = 'var(--text)';  }
    else if (cur <= z.mavHi) { status = '✓ Janela ótima';  stCol = 'var(--lime)';  }
    else if (cur <= z.mrv)   { status = 'Acima do ótimo';  stCol = 'var(--amber)'; }
    else                     { status = '⚠ Acima do MRV';  stCol = 'var(--red)';   }

    var ptrHtml = cur > 0
      ? '<div class="vmrv-ptr" style="left:' + lCur +
        ';background:' + z.col +
        ';box-shadow:0 0 8px ' + z.col + '80;"></div>'
      : '';

    return (
      '<div class="vmrv-row">' +
        '<div class="vmrv-glbl" style="color:' + z.col + '">' + z.label + '</div>' +
        '<div class="vmrv-mid">' +
          '<div class="vmrv-bar-wrap">' +
            '<div class="vmrv-segs">' +
              '<div class="vs-below" style="flex:' + fMev  + '"></div>' +
              '<div class="vs-ok"    style="flex:' + fOk   + '"></div>' +
              '<div class="vs-mav"   style="flex:' + fMav  + '"></div>' +
              '<div class="vs-warn"  style="flex:' + fWarn + '"></div>' +
              '<div class="vs-over"  style="flex:' + fOver + '"></div>' +
            '</div>' +
            '<span class="vmrv-tick" style="left:' + lMev   + '"></span>' +
            '<span class="vmrv-tick" style="left:' + lMavLo + '"></span>' +
            '<span class="vmrv-tick" style="left:' + lMavHi + '"></span>' +
            '<span class="vmrv-tick" style="left:' + lMrv   + '"></span>' +
            ptrHtml +
          '</div>' +
          '<div class="vmrv-axis">' +
            '<span style="left:' + lMev + '">MEV<br>' + z.mev + '</span>' +
            '<span style="left:' + lMrv + '">MRV<br>' + z.mrv + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="vmrv-info">' +
          '<span class="vmrv-cur" style="color:' + z.col + '">' + cur + '</span>' +
          '<span class="vmrv-unit"> ser.</span>' +
          '<span class="vmrv-st" style="color:' + stCol + '">' + status + '</span>' +
        '</div>' +
      '</div>'
    );
  }).join('');

  el.innerHTML =
    '<div class="vmrv-header">' +
      '<span class="vmrv-title">VOLUME SEMANAL</span>' +
      '<span class="vmrv-sep">·</span>' +
      '<span class="vmrv-sub">MEV · MAV · MRV</span>' +
      '<button class="ftg-help vmrv-help-btn" id="vmrvHelpBtn" title="O que é MEV/MAV/MRV?">?</button>' +
      srcHtml +
    '</div>' +
    '<div class="vmrv-legend">' +
      '<span class="vmrv-leg vmrv-leg-below">&lt; MEV</span>' +
      '<span class="vmrv-leg vmrv-leg-ok">MEV–MAV</span>' +
      '<span class="vmrv-leg vmrv-leg-mav">MAV</span>' +
      '<span class="vmrv-leg vmrv-leg-warn">&gt; MAV</span>' +
      '<span class="vmrv-leg vmrv-leg-over">&gt; MRV</span>' +
    '</div>' +
    rows;

  // Wires up the help popover after each render (button is recreated by innerHTML)
  var helpBtn = document.getElementById('vmrvHelpBtn');
  var helpPop = document.getElementById('vmrvHelpPop');
  if (helpBtn && helpPop) {
    helpBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (helpPop.classList.contains('on')) { helpPop.classList.remove('on'); return; }
      var rc   = helpBtn.getBoundingClientRect();
      var left = Math.min(rc.right - 300, window.innerWidth - 312);
      helpPop.style.top  = (rc.bottom + 8) + 'px';
      helpPop.style.left = Math.max(8, left) + 'px';
      helpPop.classList.add('on');
    });
  }
}
