// ── GORILA GYM — anilhas.js ──────────────────────────
// Calculadora de anilhas: série atual de cada levantamento

import { g, round05, parseSetCount, checksState, customLifts,
  BASE_SUP, BASE_AGA, BASE_TER } from './state.js';
import { periodBase, LIFT_SOLID, getCustomColor } from './periodizacao.js';

const BAR_KG = 20;

const PLATE_DEFS = [
  { kg: 25,   color: '#b91c1c', label: '25',  w: 28, h: 168, rx: 10 },
  { kg: 20,   color: '#2563eb', label: '20',  w: 26, h: 144, rx: 9  },
  { kg: 15,   color: '#ca8a04', label: '15',  w: 23, h: 116, rx: 8  },
  { kg: 10,   color: '#16a34a', label: '10',  w: 19, h: 90,  rx: 7  },
  { kg: 5,    color: '#cbd5e1', label: '5',   w: 15, h: 64,  rx: 6  },
  { kg: 2.5,  color: '#a855f7', label: '2.5', w: 11, h: 44,  rx: 5  },
  { kg: 1,    color: '#6b7280', label: '1',   w: 8,  h: 30,  rx: 4  },
];

// Anilhas em lbs — pesos em kg equivalente para o algoritmo
const PLATE_DEFS_LBS = [
  { kg: 45/2.20462,  color: '#ea580c', label: '45',  w: 27, h: 160, rx: 10 },
  { kg: 35/2.20462,  color: '#2563eb', label: '35',  w: 24, h: 136, rx: 9  },
  { kg: 25/2.20462,  color: '#ca8a04', label: '25',  w: 21, h: 110, rx: 8  },
  { kg: 10/2.20462,  color: '#1f2937', label: '10',  w: 17, h: 84,  rx: 6  },
  { kg: 5/2.20462,   color: '#1f2937', label: '5',   w: 13, h: 60,  rx: 5  },
  { kg: 2.5/2.20462, color: '#1f2937', label: '2.5', w: 10, h: 42,  rx: 4  },
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

  var GAP     = 3;
  var SVG_H   = 220;
  var CY      = 104;   // centro da barra (assimétrico, igual ao mockup)
  var BAR_H   = 14;    // altura das sleeves
  var SHAFT_H = 16;    // altura do shaft
  var KNURL_H = 20;    // altura do knurling
  var GRIP_W  = 284;   // largura total do knurling
  var SHAFT_W = 90;    // largura de cada shaft
  var COL_W   = 24;    // largura do colar
  var COL_H_I = 56;    // altura interna do colar (lado shaft)
  var COL_H_O = 72;    // altura externa do colar (lado anilha)
  var BAR_EXT = 34;    // extensão da sleeve após a última anilha
  var f       = function(n) { return (+n).toFixed(1); };

  var totalPW = expanded.reduce(function(s, p) { return s + (p.w || 18) + GAP; }, 0);
  var halfW   = GRIP_W / 2 + SHAFT_W + COL_W + totalPW + BAR_EXT;
  var SVG_W   = Math.max(halfW * 2, 380);
  var CX      = SVG_W / 2;
  var els     = [];

  var shaftL  = CX - GRIP_W / 2 - SHAFT_W;  // borda esquerda do shaft
  var shaftR  = CX + GRIP_W / 2 + SHAFT_W;  // borda direita do shaft
  var colOutL = shaftL - COL_W;              // borda externa do colar esquerdo
  var colOutR = shaftR + COL_W;              // borda externa do colar direito

  // ── Sleeves (cinza claro) ──────────────────────
  els.push('<rect x="0" y="' + f(CY - BAR_H / 2) + '" width="' + f(shaftL) + '" height="' + BAR_H + '" rx="4" fill="#9ca3af"/>');
  els.push('<rect x="' + f(shaftR) + '" y="' + f(CY - BAR_H / 2) + '" width="' + f(SVG_W - shaftR) + '" height="' + BAR_H + '" rx="4" fill="#9ca3af"/>');

  // ── Shafts (cinza médio) ───────────────────────
  els.push('<rect x="' + f(shaftL) + '" y="' + f(CY - SHAFT_H / 2) + '" width="' + SHAFT_W + '" height="' + SHAFT_H + '" rx="3" fill="#6b7280"/>');
  els.push('<rect x="' + f(CX + GRIP_W / 2) + '" y="' + f(CY - SHAFT_H / 2) + '" width="' + SHAFT_W + '" height="' + SHAFT_H + '" rx="3" fill="#6b7280"/>');

  // ── Knurling central (cinza escuro + linhas diagonais) ──
  var kx = CX - GRIP_W / 2;
  els.push('<rect x="' + f(kx) + '" y="' + f(CY - KNURL_H / 2) + '" width="' + GRIP_W + '" height="' + KNURL_H + '" rx="3" fill="#374151"/>');
  for (var k = 0; k < 19; k++) {
    var lk = kx + 20 + k * 14;
    els.push('<line x1="' + f(lk + 2) + '" y1="' + f(CY - KNURL_H / 2 + 2) + '" x2="' + f(lk - 10) + '" y2="' + f(CY + KNURL_H / 2 - 2) + '" stroke="#6b7280" stroke-width="1.2" opacity="0.6"/>');
  }

  // ── Helper: desenha anilha (igual ao mockup) ───
  function drawPlate(px, p, rotDeg) {
    var pw   = p.w  || 18;
    var ph   = p.h  || 80;
    var prx  = p.rx || Math.round(pw * 0.36);
    var pcx  = f(px + pw / 2);
    var pcy  = f(CY);
    var rimH = Math.max(Math.round(pw * 0.36), 5);
    var hr   = pw * 0.21;
    var fs   = Math.max(Math.min(Math.round(pw * 0.4), 11), 7);
    // Base com borda preta grossa
    els.push('<rect x="' + f(px) + '" y="' + f(CY - ph / 2) + '" width="' + pw + '" height="' + ph + '" rx="' + prx + '" fill="' + p.color + '" stroke="#111" stroke-width="3"/>');
    // Destaque de topo
    els.push('<rect x="' + f(px + 3) + '" y="' + f(CY - ph / 2 + 3) + '" width="' + (pw - 6) + '" height="' + rimH + '" rx="' + Math.max(prx - 2, 2) + '" fill="rgba(255,255,255,0.25)"/>');
    // Furo central
    els.push('<ellipse cx="' + pcx + '" cy="' + pcy + '" rx="' + f(hr) + '" ry="' + f(hr * 1.17) + '" fill="#060a14" stroke="#000" stroke-width="1"/>');
    // Label rotacionado
    if (ph >= 44) {
      els.push('<text transform="rotate(' + rotDeg + ',' + pcx + ',' + pcy + ')" x="' + pcx + '" y="' + pcy + '" text-anchor="middle" dominant-baseline="middle" fill="rgba(255,255,255,.9)" font-size="' + fs + '" font-family="monospace" font-weight="800">' + p.label + '</text>');
    }
  }

  // ── Anilhas esquerdo (centro → fora) ──────────
  var lx = colOutL;
  expanded.forEach(function(p) {
    lx -= ((p.w || 18) + GAP);
    drawPlate(lx, p, -90);
  });

  // ── Anilhas direito (centro → fora) ───────────
  var rx = colOutR;
  expanded.forEach(function(p) {
    rx += GAP;
    drawPlate(rx, p, 90);
    rx += (p.w || 18);
  });

  // ── Colar esquerdo (trapézio) ──────────────────
  var iH = COL_H_I / 2, oH = COL_H_O / 2;
  els.push('<polygon points="' + f(colOutL) + ',' + f(CY - oH) + ' ' + f(shaftL) + ',' + f(CY - iH) + ' ' + f(shaftL) + ',' + f(CY + iH) + ' ' + f(colOutL) + ',' + f(CY + oH) + '" fill="#374151" stroke="#1f2937" stroke-width="1.5"/>');

  // ── Colar direito (trapézio espelhado) ─────────
  els.push('<polygon points="' + f(shaftR) + ',' + f(CY - iH) + ' ' + f(colOutR) + ',' + f(CY - oH) + ' ' + f(colOutR) + ',' + f(CY + oH) + ' ' + f(shaftR) + ',' + f(CY + iH) + '" fill="#374151" stroke="#1f2937" stroke-width="1.5"/>');

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
      return '<div class="anilha-plate-row" style="border-color:' + p.color + '20;border-left:3px solid ' + p.color + ';">'
        + '<span class="anilha-plate-swatch" style="background:' + p.color + ';box-shadow:0 0 6px ' + p.color + '55;"></span>'
        + '<span class="anilha-plate-count">' + p.count + '×</span>'
        + '<span class="anilha-plate-kg">' + p.label + ' ' + ul + '</span>'
        + '</div>';
    }).join('');
    if (info.remainder > 0.001) {
      bd.innerHTML += '<div class="anilha-remainder">⚠ +' + toUnit(info.remainder) + ' ' + ul + ' — use microplacas</div>';
    }
  }
}
