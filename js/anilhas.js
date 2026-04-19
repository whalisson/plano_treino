// ── GORILA GYM — anilhas.js ──────────────────────────
// Calculadora de anilhas: série atual de cada levantamento

import { g, round05, parseSetCount, checksState, customLifts,
  BASE_SUP, BASE_AGA, BASE_TER } from './state.js';
import { periodBase, LIFT_SOLID, getCustomColor } from './periodizacao.js';

const BAR_KG = 20;

const PLATE_DEFS = [
  { kg: 25,   color: '#dc2626', label: '25'   },
  { kg: 20,   color: '#2563eb', label: '20'   },
  { kg: 15,   color: '#ca8a04', label: '15'   },
  { kg: 10,   color: '#16a34a', label: '10'   },
  { kg: 5,    color: '#cbd5e1', label: '5'    },
  { kg: 2.5,  color: '#a855f7', label: '2.5'  },
  { kg: 1,    color: '#6b7280', label: '1'    },
  { kg: 0.5,  color: '#9ca3af', label: '.5'   },
  { kg: 0.25, color: '#d1d5db', label: '.25'  },
];

const PLATE_W = { 25:16, 20:15, 15:14, 10:12, 5:10, 2.5:8, 1:6, 0.5:5, 0.25:4 };
const PLATE_H = { 25:110, 20:100, 15:88, 10:72, 5:54, 2.5:38, 1:28, 0.5:20, 0.25:14 };

let selectedKey = null;

// ── Primeira série não marcada de cada lift ──────
function getCurrentSeries(liftKey, rm) {
  var currentWeekIdx = -1;
  var allPrevDone    = true;

  periodBase.forEach(function(w, wi) {
    var wEff = (w.byLift && w.byLift[liftKey])
      ? Object.assign({}, w, w.byLift[liftKey]) : w;
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
  var wEff = (w.byLift && w.byLift[liftKey])
    ? Object.assign({}, w, w.byLift[liftKey]) : w;
  if (!wEff.series) return null;

  var state    = (checksState[liftKey] || {})[currentWeekIdx] || {};
  var checkIdx = 0;
  for (var si = 0; si < wEff.series.length; si++) {
    var s    = wEff.series[si];
    var nChk = parseSetCount(s.r);
    for (var ci = 0; ci < nChk; ci++) {
      if (!state[checkIdx + ci]) {
        return {
          weight:    round05(rm * s.p),
          series:    s.r,
          pct:       Math.round(s.p * 100),
          weekLabel: w.label,
          rm:        rm,
        };
      }
    }
    checkIdx += nChk;
  }
  return null;
}

// ── Anilhas por lado ─────────────────────────────
function calcPlates(totalKg) {
  var side      = Math.round(((totalKg - BAR_KG) / 2) * 1000) / 1000;
  if (side <= 0) return { side: 0, plates: [], remainder: 0 };
  var remaining = side;
  var result    = [];
  PLATE_DEFS.forEach(function(pd) {
    if (remaining < pd.kg - 0.001) return;
    var count = Math.floor(Math.round(remaining / pd.kg * 1000) / 1000);
    if (count > 0) {
      result.push({ kg: pd.kg, count: count, color: pd.color, label: pd.label });
      remaining = Math.round((remaining - pd.kg * count) * 1000) / 1000;
    }
  });
  return { side: side, plates: result, remainder: Math.round(remaining * 1000) / 1000 };
}

// ── SVG da barra ─────────────────────────────────
function buildBarbellSVG(info) {
  var expanded = [];
  info.plates.forEach(function(p) {
    for (var i = 0; i < p.count; i++) expanded.push(p);
  });

  var GAP     = 2;
  var COL_W   = 10;
  var COL_H   = 38;
  var BAR_EXT = 30;
  var GRIP_W  = 50;
  var BAR_H   = 8;
  var SVG_H   = 140;
  var CY      = SVG_H / 2;

  var totalPW = expanded.reduce(function(s, p) {
    return s + (PLATE_W[p.kg] || 8) + GAP;
  }, 0);

  var halfW = GRIP_W / 2 + COL_W + GAP + totalPW + BAR_EXT;
  var SVG_W = Math.max(halfW * 2, 240);
  var CX    = SVG_W / 2;

  var els = [];
  var f   = function(n) { return (+n).toFixed(1); };

  // Barra de fundo
  els.push('<rect x="0" y="' + f(CY-BAR_H/2) + '" width="' + SVG_W + '" height="' + BAR_H + '" rx="3" fill="#6b7280"/>');

  // Destaque das sleeves
  var slW = COL_W + GAP + totalPW + BAR_EXT;
  els.push('<rect x="' + f(CX-GRIP_W/2-slW) + '" y="' + f(CY-BAR_H/2+1) + '" width="' + slW + '" height="' + (BAR_H-2) + '" rx="2" fill="#9ca3af" opacity="0.35"/>');
  els.push('<rect x="' + f(CX+GRIP_W/2) + '" y="' + f(CY-BAR_H/2+1) + '" width="' + slW + '" height="' + (BAR_H-2) + '" rx="2" fill="#9ca3af" opacity="0.35"/>');

  // Grip / knurling
  var gx = CX - GRIP_W / 2;
  els.push('<rect x="' + f(gx) + '" y="' + f(CY-BAR_H/2) + '" width="' + GRIP_W + '" height="' + BAR_H + '" rx="2" fill="#374151"/>');
  for (var k = 0; k < 7; k++) {
    var kx = gx + 3 + k * (GRIP_W - 6) / 6;
    els.push('<line x1="' + f(kx) + '" y1="' + f(CY-BAR_H/2) + '" x2="' + f(kx) + '" y2="' + f(CY+BAR_H/2) + '" stroke="#6b7280" stroke-width="1.5" opacity="0.7"/>');
  }

  // Anilhas — lado esquerdo (centro → fora)
  var lx = CX - GRIP_W / 2;
  expanded.forEach(function(p) {
    var pw = PLATE_W[p.kg] || 8;
    var ph = PLATE_H[p.kg] || 20;
    lx -= (pw + GAP);
    els.push('<rect x="' + f(lx) + '" y="' + f(CY-ph/2) + '" width="' + pw + '" height="' + ph + '" rx="2" fill="' + p.color + '" stroke="rgba(0,0,0,.3)" stroke-width="1"/>');
    if (ph >= 28) {
      var lbx = f(lx + pw / 2), lby = f(CY);
      els.push('<text transform="rotate(-90,' + lbx + ',' + lby + ')" x="' + lbx + '" y="' + lby + '" text-anchor="middle" dominant-baseline="middle" fill="rgba(255,255,255,.92)" font-size="8" font-family="monospace" font-weight="700">' + p.label + '</text>');
    }
  });
  // Colar esquerdo
  var lcx = lx - GAP - COL_W;
  els.push('<rect x="' + f(lcx) + '" y="' + f(CY-COL_H/2) + '" width="' + COL_W + '" height="' + COL_H + '" rx="3" fill="#1f2937" stroke="#4b5563" stroke-width="1"/>');

  // Anilhas — lado direito (centro → fora)
  var rx = CX + GRIP_W / 2;
  expanded.forEach(function(p) {
    var pw = PLATE_W[p.kg] || 8;
    var ph = PLATE_H[p.kg] || 20;
    rx += GAP;
    els.push('<rect x="' + f(rx) + '" y="' + f(CY-ph/2) + '" width="' + pw + '" height="' + ph + '" rx="2" fill="' + p.color + '" stroke="rgba(0,0,0,.3)" stroke-width="1"/>');
    if (ph >= 28) {
      var lbx = f(rx + pw / 2), lby = f(CY);
      els.push('<text transform="rotate(90,' + lbx + ',' + lby + ')" x="' + lbx + '" y="' + lby + '" text-anchor="middle" dominant-baseline="middle" fill="rgba(255,255,255,.92)" font-size="8" font-family="monospace" font-weight="700">' + p.label + '</text>');
    }
    rx += pw;
  });
  // Colar direito
  els.push('<rect x="' + f(rx+GAP) + '" y="' + f(CY-COL_H/2) + '" width="' + COL_W + '" height="' + COL_H + '" rx="3" fill="#1f2937" stroke="#4b5563" stroke-width="1"/>');

  return '<svg viewBox="0 0 ' + SVG_W + ' ' + SVG_H + '" width="100%" preserveAspectRatio="xMidYMid meet" style="display:block;">' + els.join('') + '</svg>';
}

// ── Renderização ──────────────────────────────────
export function renderAnilhas() {
  var liftsEl  = g('anilhasLifts');
  var detailEl = g('anilhasDetail');
  if (!liftsEl) return;

  var supRM = parseFloat(g('rm-supino').value) || BASE_SUP;
  var agaRM = parseFloat(g('rm-agacha').value) || BASE_AGA;
  var terRM = parseFloat(g('rm-terra').value)  || BASE_TER;

  var lifts = [
    { key:'supino', label:'Supino',      color: LIFT_SOLID.supino || '#50e3c2', rm: supRM },
    { key:'agacha', label:'Agachamento', color: LIFT_SOLID.agacha || '#c9ff3a', rm: agaRM },
    { key:'terra',  label:'Terra',       color: LIFT_SOLID.terra  || '#ff4fd8', rm: terRM },
  ];
  (customLifts || []).forEach(function(cl, idx) {
    lifts.push({ key: cl.id, label: cl.name, color: getCustomColor(idx), rm: cl.rm || 0 });
  });

  // Valida selectedKey
  if (selectedKey && !lifts.find(function(l) { return l.key === selectedKey; })) selectedKey = null;

  // Monta lista
  liftsEl.innerHTML = '';
  var firstWithData = null;

  lifts.forEach(function(lf) {
    var cur  = getCurrentSeries(lf.key, lf.rm);
    var card = document.createElement('div');
    card.className = 'anilha-lift-card' + (selectedKey === lf.key ? ' selected' : '');
    card.style.setProperty('--lift-color', lf.color);

    if (!cur || cur.weight <= 0) {
      card.innerHTML =
        '<div class="anilha-lift-name" style="color:' + lf.color + '">' + lf.label + '</div>'
        + '<div class="anilha-lift-done">Ciclo completo</div>';
      card.style.opacity = '.45';
    } else {
      if (!firstWithData) firstWithData = lf;
      card.innerHTML =
        '<div class="anilha-lift-name" style="color:' + lf.color + '">' + lf.label + '</div>'
        + '<div class="anilha-lift-weight">' + cur.weight + '<span>kg</span></div>'
        + '<div class="anilha-lift-info">' + cur.weekLabel + ' · ' + cur.series + ' · ' + cur.pct + '%</div>';
      card.addEventListener('click', function() {
        selectedKey = lf.key;
        renderAnilhas();
      });
    }
    liftsEl.appendChild(card);
  });

  // Auto-seleciona o primeiro com dados
  if (!selectedKey && firstWithData) selectedKey = firstWithData.key;

  // Detalhe
  if (!selectedKey || !detailEl) { if (detailEl) detailEl.style.display = 'none'; return; }

  var sel = lifts.find(function(l) { return l.key === selectedKey; });
  var cur = sel ? getCurrentSeries(sel.key, sel.rm) : null;

  if (!sel || !cur) { detailEl.style.display = 'none'; return; }
  detailEl.style.display = 'block';

  var info = calcPlates(cur.weight);

  // Cabeçalho
  g('anilhasDetailTitle').innerHTML =
    '<span style="color:' + sel.color + '">' + sel.label.toUpperCase() + '</span>'
    + ' &nbsp;·&nbsp; ' + cur.weekLabel
    + ' &nbsp;·&nbsp; ' + cur.series
    + ' &nbsp;·&nbsp; <span style="color:var(--muted)">' + cur.pct + '% RM</span>';

  g('anilhasTotalKg').textContent = cur.weight + ' kg na barra';
  g('anilhasSideKg').textContent  = 'Cada lado: ' + info.side + ' kg  ·  Barra: ' + BAR_KG + ' kg';

  // SVG
  g('anilhasSVG').innerHTML = buildBarbellSVG(info);

  // Lista de anilhas
  var bd = g('anilhasBreakdown');
  if (!info.plates.length) {
    bd.innerHTML = '<span style="color:var(--muted);font-size:13px;">Só a barra (' + BAR_KG + ' kg)</span>';
  } else {
    bd.innerHTML = info.plates.map(function(p) {
      return '<div class="anilha-plate-row">'
        + '<span class="anilha-plate-swatch" style="background:' + p.color + '"></span>'
        + '<span class="anilha-plate-count">' + p.count + '×</span>'
        + '<span class="anilha-plate-kg">' + p.kg + ' kg</span>'
        + '</div>';
    }).join('');
    if (info.remainder > 0.001) {
      bd.innerHTML += '<div class="anilha-remainder">⚠ +' + info.remainder + ' kg — use microplacas</div>';
    }
  }
}
