// ── GORILA GYM — anilhas.js ──────────────────────────
// Calculadora de anilhas: série atual de cada levantamento

import { g, round05, parseSetCount, checksState, customLifts,
  BASE_SUP, BASE_AGA, BASE_TER } from './state.js';
import { periodBase, LIFT_SOLID, getCustomColor } from './periodizacao.js';

const BAR_KG = 20;

const PLATE_DEFS = [
  { kg: 25,   color: '#dc2626', label: '25',  w: 16, h: 110 },
  { kg: 20,   color: '#2563eb', label: '20',  w: 15, h: 100 },
  { kg: 15,   color: '#ca8a04', label: '15',  w: 14, h: 88  },
  { kg: 10,   color: '#16a34a', label: '10',  w: 12, h: 72  },
  { kg: 5,    color: '#cbd5e1', label: '5',   w: 10, h: 54  },
  { kg: 2.5,  color: '#a855f7', label: '2.5', w: 8,  h: 38  },
  { kg: 1,    color: '#6b7280', label: '1',   w: 6,  h: 28  },
];

// Anilhas em lbs — pesos em kg equivalente para o algoritmo
const PLATE_DEFS_LBS = [
  { kg: 45/2.20462,  color: '#ea580c', label: '45',  w: 16, h: 110 },
  { kg: 35/2.20462,  color: '#2563eb', label: '35',  w: 14, h: 88  },
  { kg: 25/2.20462,  color: '#ca8a04', label: '25',  w: 12, h: 72  },
  { kg: 10/2.20462,  color: '#1f2937', label: '10',  w: 10, h: 54  },
  { kg: 5/2.20462,   color: '#1f2937', label: '5',   w: 8,  h: 38  },
  { kg: 2.5/2.20462, color: '#1f2937', label: '2.5', w: 6,  h: 28  },
];

let selectedKey = null;
let plateMode = 'total'; // 'total' = rm é peso total | 'sembarra' = rm é o peso de cada lado
let weightUnit = 'kg'; // 'kg' | 'lbs'

const KG_TO_LBS = 2.20462;
function toUnit(kg) {
  if (weightUnit === 'lbs') return Math.ceil(kg * KG_TO_LBS * 2) / 2; // ceil em 0.5 lbs
  return kg;
}
function unitLabel() { return weightUnit; }

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
// sideKg: peso de cada lado (já calculado conforme o modo)
function calcPlates(sideKg) {
  var defs  = weightUnit === 'lbs' ? PLATE_DEFS_LBS : PLATE_DEFS;
  var side  = Math.max(0, Math.round(sideKg * 1000) / 1000);
  if (side <= 0) return { side: 0, plates: [], remainder: 0 };
  var remaining = side;
  var result    = [];
  defs.forEach(function(pd) {
    if (remaining < pd.kg - 0.001) return;
    var count = Math.floor(Math.round(remaining / pd.kg * 1000) / 1000);
    if (count > 0) {
      result.push({ kg: pd.kg, count: count, color: pd.color, label: pd.label, w: pd.w, h: pd.h });
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
    return s + (p.w || 8) + GAP;
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
    var pw = p.w || 8;
    var ph = p.h || 20;
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
    var pw = p.w || 8;
    var ph = p.h || 20;
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

// ── calcula o peso de cada lado conforme o modo ──
function ceilHalf(x) { return Math.ceil(x * 2) / 2; } // arredonda para cima em 0,5
function sideForWeight(seriesWeight) {
  if (plateMode === 'sembarra') return ceilHalf(seriesWeight);
  return ceilHalf((seriesWeight - BAR_KG) / 2);
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

  // Toggle de modo
  var toggleEl = g('anilhasModeToggle');
  if (toggleEl) {
    toggleEl.innerHTML =
      '<button class="anilha-mode-btn' + (plateMode === 'total' ? ' active' : '') + '" data-mode="total">Total</button>'
      + '<button class="anilha-mode-btn' + (plateMode === 'sembarra' ? ' active' : '') + '" data-mode="sembarra">Sem barra</button>';
    toggleEl.querySelectorAll('.anilha-mode-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        plateMode = btn.dataset.mode;
        renderAnilhas();
      });
    });
  }

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
      var side  = sideForWeight(cur.weight);
      var total = plateMode === 'sembarra' ? ceilHalf(cur.weight * 2) : ceilHalf(cur.weight);
      card.innerHTML =
        '<div class="anilha-lift-name" style="color:' + lf.color + '">' + lf.label + '</div>'
        + '<div class="anilha-lift-weight">' + (plateMode === 'sembarra' ? side : total) + '<span>kg</span></div>'
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

  var sideKg  = sideForWeight(cur.weight);
  var totalKg = plateMode === 'sembarra' ? ceilHalf(cur.weight * 2) : ceilHalf(cur.weight);
  var info = calcPlates(sideKg);
  var ul = unitLabel();

  // Botão kg/lbs no canto superior direito do container
  var svgWrap = g('anilhasSVG');
  var unitToggleId = 'anilhasUnitToggle';
  var existingToggle = g(unitToggleId);
  if (!existingToggle) {
    var utBtn = document.createElement('button');
    utBtn.id = unitToggleId;
    utBtn.className = 'anilha-unit-btn';
    svgWrap.parentElement.style.position = 'relative';
    svgWrap.parentElement.insertBefore(utBtn, svgWrap);
    existingToggle = utBtn;
  }
  existingToggle.textContent = weightUnit === 'kg' ? 'lbs' : 'kg';
  existingToggle.onclick = function() {
    weightUnit = weightUnit === 'kg' ? 'lbs' : 'kg';
    renderAnilhas();
  };

  // Cabeçalho
  g('anilhasDetailTitle').innerHTML =
    '<span style="color:' + sel.color + '">' + sel.label.toUpperCase() + '</span>'
    + ' &nbsp;·&nbsp; ' + cur.weekLabel
    + ' &nbsp;·&nbsp; ' + cur.series
    + ' &nbsp;·&nbsp; <span style="color:var(--muted)">' + cur.pct + '% RM</span>';

  g('anilhasTotalKg').textContent = toUnit(totalKg) + ' ' + ul + (plateMode === 'total' ? ' na barra' : ' total');
  g('anilhasSideKg').textContent  = plateMode === 'total'
    ? ('Cada lado: ' + toUnit(info.side) + ' ' + ul + '  ·  Barra: ' + toUnit(BAR_KG) + ' ' + ul)
    : ('Cada lado: ' + toUnit(info.side) + ' ' + ul);

  // SVG
  g('anilhasSVG').innerHTML = buildBarbellSVG(info);

  // Lista de anilhas
  var bd = g('anilhasBreakdown');
  if (!info.plates.length) {
    bd.innerHTML = '<span style="color:var(--muted);font-size:13px;">Só a barra (' + toUnit(BAR_KG) + ' ' + ul + ')</span>';
  } else {
    bd.innerHTML = info.plates.map(function(p) {
      return '<div class="anilha-plate-row">'
        + '<span class="anilha-plate-swatch" style="background:' + p.color + '"></span>'
        + '<span class="anilha-plate-count">' + p.count + '×</span>'
        + '<span class="anilha-plate-kg">' + p.label + ' ' + ul + '</span>'
        + '</div>';
    }).join('');
    if (info.remainder > 0.001) {
      bd.innerHTML += '<div class="anilha-remainder">⚠ +' + toUnit(info.remainder) + ' ' + ul + ' — use microplacas</div>';
    }
  }
}
