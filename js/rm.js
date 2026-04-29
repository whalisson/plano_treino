// ── GORILA GYM — rm.js ───────────────────────
// Calculadora de 1RM com 3 fórmulas (Brzycki, Epley, Mayhew) + histórico

import { uid, g, round05, saveState, BASE_SUP, BASE_AGA, BASE_TER, customLifts,
  rmHistory, setRmHistory } from './state.js';
import { LIFT_LABELS, LIFT_COLORS, LIFT_FILL, LIFT_SOLID } from './periodizacao.js';

export { rmHistory, setRmHistory };
let _rmLastAvg = 0;

export function calcRM() {
  var w = parseFloat(g('rmW').value) || 0;
  var r = parseInt(g('rmR').value)   || 1;
  if (r < 1 || r > 36 || !w) {
    g('rmSaveCard').style.display = 'none';
    return;
  }

  // Reps = 1: todas as fórmulas retornam o próprio peso
  var brzycki = r === 1 ? w : w * (36 / (37 - r));
  var epley   = r === 1 ? w : w * (1 + r / 30);
  var mayhew  = w / (0.522 + 0.419 * Math.exp(-0.055 * r));
  var avg     = (brzycki + epley + mayhew) / 3;
  _rmLastAvg  = avg;

  g('rmResult').textContent  = avg.toFixed(1)     + ' kg';
  g('rmBrzycki').textContent = brzycki.toFixed(1) + ' kg';
  g('rmEpley').textContent   = epley.toFixed(1)   + ' kg';
  g('rmMayhew').textContent  = mayhew.toFixed(1)  + ' kg';

  var pcts = [100, 95, 90, 85, 80, 75, 70, 65];
  var reps = [1, 2, 4, 6, 8, 10, 12, 16];
  g('rmTbody').innerHTML = pcts.map(function(p, i) {
    return '<tr><td class="dim">' + p + '%</td>'
      + '<td class="hl">' + (avg * p / 100).toFixed(1) + ' kg</td>'
      + '<td>' + reps[i] + '</td></tr>';
  }).join('');

  g('rmHistPreview').textContent = avg.toFixed(1) + ' kg';
  if (!g('rmHistDate').value) {
    var now = new Date();
    g('rmHistDate').value = String(now.getDate()).padStart(2,'0') + '/'
      + String(now.getMonth()+1).padStart(2,'0') + '/' + now.getFullYear();
  }
  g('rmSaveCard').style.display = 'block';
}

export function populateRMLiftSelect() {
  var sel = g('rmHistLift');
  if (!sel) return;
  var prev = sel.value;
  sel.innerHTML = '';
  [{ value:'supino', label:'Supino' }, { value:'agacha', label:'Agachamento' }, { value:'terra', label:'Terra' }]
    .forEach(function(b) {
      var opt = document.createElement('option');
      opt.value = b.value; opt.textContent = b.label;
      sel.appendChild(opt);
    });
  (customLifts || []).forEach(function(l) {
    var opt = document.createElement('option');
    opt.value = l.id; opt.textContent = l.name;
    sel.appendChild(opt);
  });
  if (prev) sel.value = prev;
}

export function saveRMRecord() {
  if (!_rmLastAvg) return;
  var lift = g('rmHistLift').value;
  var date = g('rmHistDate').value.trim();
  if (!lift || !date) return;
  rmHistory.push({ id:uid(), lift:lift, kg: Math.round(_rmLastAvg * 10) / 10, date:date });
  renderRMHistory();
  saveState();
  var btn = g('btnSaveRM');
  var orig = btn.textContent;
  btn.textContent = '✓ Salvo!';
  btn.style.background = 'var(--green)';
  setTimeout(function() { btn.textContent = orig; btn.style.background = ''; }, 1500);
}

export function deleteRMRecord(id) {
  rmHistory = rmHistory.filter(function(r) { return r.id !== id; });
  renderRMHistory();
  saveState();
}

let rmHistChartInst = null;

export function parseRMDate(dStr) {
  var p = dStr.split('/');
  return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
}

function formatDateLabel(date) {
  return String(date.getDate()).padStart(2,'0') + '/'
    + String(date.getMonth()+1).padStart(2,'0') + '/'
    + date.getFullYear();
}

function linearRegression(points) {
  var n = points.length;
  if (n < 2) return null;
  var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  points.forEach(function(p) { sumX += p.x; sumY += p.y; sumXY += p.x * p.y; sumX2 += p.x * p.x; });
  var denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;
  var slope = (n * sumXY - sumX * sumY) / denom;
  var intercept = (sumY - slope * sumX) / n;
  var yMean = sumY / n;
  var ssTot = points.reduce(function(acc, p) { return acc + Math.pow(p.y - yMean, 2); }, 0);
  var ssRes = points.reduce(function(acc, p) { return acc + Math.pow(p.y - (slope * p.x + intercept), 2); }, 0);
  var r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return { slope: slope, intercept: intercept, r2: r2 };
}

function projectRM(lift, weeksAhead) {
  var entries = rmHistory.filter(function(r) { return r.lift === lift; });
  if (entries.length < 2) return null;
  var pts = entries.map(function(r) {
    return { x: parseRMDate(r.date).getTime() / 86400000, y: r.kg };
  }).sort(function(a, b) { return a.x - b.x; });
  var reg = linearRegression(pts);
  if (!reg) return null;
  var todayDay = Date.now() / 86400000;
  var futureDay = todayDay + weeksAhead * 7;
  var projected = reg.slope * futureDay + reg.intercept;
  return {
    kg:          Math.max(0, projected),
    weeklyGain:  reg.slope * 7,
    r2:          reg.r2,
    lastKg:      pts[pts.length - 1].y,
    pointCount:  pts.length,
  };
}

function renderProjectionCard(weeksAhead) {
  var container = g('rmProjectionCards');
  if (!container) return;
  var lifts = ['supino','agacha','terra'].concat((customLifts||[]).map(function(l){ return l.id; }));
  var html = '';
  var anyProj = false;

  lifts.forEach(function(lk) {
    var proj = projectRM(lk, weeksAhead);
    if (!proj) return;
    anyProj = true;
    var color    = LIFT_SOLID[lk]  || '#a59eff';
    var name     = LIFT_LABELS[lk] || lk;
    var gain     = proj.weeklyGain;
    var gainStr  = (gain >= 0 ? '+' : '') + gain.toFixed(2) + ' kg/sem';
    var gainColor= gain >= 0 ? 'var(--teal)' : 'var(--red)';
    var projKg   = Math.round(proj.kg * 10) / 10;
    var r2Pct    = Math.round(proj.r2 * 100);
    var confColor= proj.r2 >= 0.8 ? 'var(--teal)' : (proj.r2 >= 0.6 ? 'var(--amber)' : 'var(--red)');
    var lowConf  = proj.r2 < 0.6 || proj.pointCount < 3;

    html += '<div style="display:grid;grid-template-columns:auto 1fr auto auto;align-items:center;gap:10px;padding:10px 12px;background:var(--bg3);border-radius:8px;border:1px solid var(--border);">'
      + '<span style="font-family:var(--mono);font-size:12px;font-weight:700;color:' + color + ';min-width:90px;">' + name + '</span>'
      + '<span style="font-family:var(--mono);font-size:11px;color:' + gainColor + ';">' + gainStr + '</span>'
      + '<span style="font-family:var(--mono);font-size:14px;font-weight:700;color:var(--text);">' + projKg + ' kg</span>'
      + '<span style="font-family:var(--mono);font-size:9px;color:' + confColor + ';background:rgba(255,255,255,.05);border-radius:4px;padding:2px 5px;" title="R² — qualidade do ajuste (quanto mais próximo de 100, mais linear a progressão)">R²' + r2Pct + '</span>'
      + '</div>';

    if (lowConf) {
      html += '<div style="font-size:10px;color:var(--amber);margin-top:-2px;padding:0 4px;">⚠ '
        + (proj.pointCount < 3
          ? 'Poucos registros — adicione mais dados para melhor precisão'
          : 'Tendência inconsistente — confie com cautela')
        + '</div>';
    }
  });

  container.innerHTML = anyProj
    ? html
    : '<div style="font-size:11px;color:var(--muted);padding:4px 0;">Adicione pelo menos 2 registros por levantamento para ver a projeção.</div>';
}

export function renderRMHistory() {
  var section = g('rmHistorySection');
  if (!rmHistory.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';

  if (rmHistChartInst) { rmHistChartInst.destroy(); rmHistChartInst = null; }

  var lifts    = ['supino','agacha','terra'].concat((customLifts||[]).map(function(l){return l.id;}));
  var allDates = rmHistory.map(function(r){return r.date;});
  allDates = allDates.filter(function(v,i,a){return a.indexOf(v)===i;}).sort(function(a,b){
    return parseRMDate(a) - parseRMDate(b);
  });

  var weeksAhead = parseInt((g('rmProjectWeeks') || {value:'8'}).value) || 8;
  var futureDate    = new Date(Date.now() + weeksAhead * 7 * 86400000);
  var futureDateStr = formatDateLabel(futureDate);
  if (allDates[allDates.length - 1] !== futureDateStr) allDates.push(futureDateStr);

  var datasets = lifts.map(function(lk) {
    var pts = allDates.map(function(d) {
      var entries = rmHistory.filter(function(r){return r.lift===lk && r.date===d;});
      return entries.length ? entries[entries.length-1].kg : null;
    });
    if (pts.every(function(p){return p===null;})) return null;
    return {
      label:                LIFT_LABELS[lk] || lk,
      data:                 pts,
      borderColor:          LIFT_COLORS[lk] || 'rgba(200,200,200,.9)',
      backgroundColor:      LIFT_FILL[lk]   || 'rgba(200,200,200,.12)',
      borderWidth:          2.5,
      pointRadius:          6,
      pointHoverRadius:     9,
      pointBackgroundColor: LIFT_SOLID[lk]  || '#ccc',
      pointBorderColor:     '#0c0c0f',
      pointBorderWidth:     2,
      fill:                 true,
      tension:              0.4,
      spanGaps:             true,
    };
  }).filter(Boolean);

  // Datasets de projeção (linha tracejada até a data futura)
  lifts.forEach(function(lk) {
    var proj = projectRM(lk, weeksAhead);
    if (!proj) return;
    var realDs = datasets.find(function(d){ return d.label === (LIFT_LABELS[lk]||lk); });
    if (!realDs) return;
    var lastIdx = -1;
    realDs.data.forEach(function(v, i){ if (v !== null) lastIdx = i; });
    if (lastIdx < 0) return;
    var projData = allDates.map(function(){ return null; });
    projData[lastIdx]              = realDs.data[lastIdx];
    projData[allDates.length - 1] = Math.round(proj.kg * 10) / 10;
    var radii = allDates.map(function(_, i){ return i === allDates.length - 1 ? 5 : 0; });
    datasets.push({
      label:                (LIFT_LABELS[lk]||lk) + ' ›',
      data:                 projData,
      borderColor:          LIFT_COLORS[lk] || 'rgba(200,200,200,.7)',
      backgroundColor:      'transparent',
      borderWidth:          1.5,
      borderDash:           [6, 4],
      pointRadius:          radii,
      pointHoverRadius:     radii.map(function(r){ return r ? 7 : 0; }),
      pointBackgroundColor: LIFT_SOLID[lk]  || '#ccc',
      pointBorderColor:     '#0c0c0f',
      pointBorderWidth:     2,
      fill:                 false,
      tension:              0,
      spanGaps:             true,
    });
  });

  rmHistChartInst = new Chart(g('rmHistChart').getContext('2d'), {
    type: 'line',
    data: { labels: allDates, datasets: datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration:600, easing:'easeInOutQuart' },
      interaction: { mode:'index', intersect:false },
      plugins: {
        legend: { display:true, labels:{ color:'#8a8898', font:{size:11}, boxWidth:12, padding:16 } },
        tooltip: {
          backgroundColor:'rgba(30,30,40,.95)', borderColor:'rgba(255,255,255,.1)', borderWidth:1,
          titleColor:'#f0eee8', bodyColor:'#8a8898', padding:10,
          callbacks: { label:function(ctx){ var v=ctx.parsed.y; return v===null?null:' '+ctx.dataset.label+': '+v+' kg'; } }
        }
      },
      scales: {
        x: { ticks:{color:'#8a8898',font:{size:10}}, grid:{color:'rgba(255,255,255,.04)'} },
        y: { ticks:{color:'#8a8898',font:{size:10},callback:function(v){return v+' kg';}}, grid:{color:'rgba(255,255,255,.05)'}, beginAtZero:false }
      }
    }
  });

  var list = g('rmHistList');
  list.innerHTML = '';
  rmHistory.slice().reverse().forEach(function(r) {
    var liftName = LIFT_LABELS[r.lift] || r.lift;
    var color    = LIFT_SOLID[r.lift]  || '#a59eff';
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--bg3);border-radius:7px;font-size:12px;';
    row.innerHTML =
      '<span style="font-family:var(--mono);color:var(--muted);min-width:76px;">' + r.date + '</span>'
      + '<span style="font-weight:600;color:' + color + ';flex:1;">' + liftName + '</span>'
      + '<span style="font-family:var(--mono);font-weight:700;color:var(--text);">' + r.kg + ' kg</span>';
    var del = document.createElement('button');
    del.style.cssText = 'background:transparent;border:none;color:var(--muted);font-size:14px;padding:0 4px;cursor:pointer;line-height:1;';
    del.textContent = '×'; del.title = 'Remover';
    del.addEventListener('click', function(){ deleteRMRecord(r.id); });
    row.appendChild(del);
    list.appendChild(row);
  });

  renderRatioCard();
  renderProjectionCard(weeksAhead);
}

let _ratioPorLado = false;
globalThis.toggleRatioPorLado = function() { _ratioPorLado = !_ratioPorLado; renderRatioCard(); };

export function renderRatioCard() {
  var card = g('rmRatioCard');
  if (!card) return;

  var rawSup = parseFloat((g('rm-supino') || {}).value) || BASE_SUP;
  var rawAga = parseFloat((g('rm-agacha') || {}).value) || BASE_AGA;
  var rawTer = parseFloat((g('rm-terra')  || {}).value) || BASE_TER;

  var sup = _ratioPorLado ? rawSup * 2 + 20 : rawSup;
  var aga = _ratioPorLado ? rawAga * 2 + 20 : rawAga;
  var ter = _ratioPorLado ? rawTer * 2 + 20 : rawTer;

  var ratioAga = aga / sup;
  var ratioTer = ter / sup;

  var tiers = [
    { name: 'Iniciante',     aga: 1.20, ter: 1.40 },
    { name: 'Intermediário', aga: 1.33, ter: 1.60 },
    { name: 'Avançado',      aga: 1.50, ter: 1.75 },
    { name: 'Elite',         aga: 1.65, ter: 1.90 },
  ];

  var currentTier = -1;
  tiers.forEach(function(t, i) {
    if (ratioAga >= t.aga && ratioTer >= t.ter) currentTier = i;
  });

  var nextTier = currentTier + 1 < tiers.length ? tiers[currentTier + 1] : null;

  var tierColors   = ['#8a9998', '#50e3c2', '#a59eff', '#c9ff3a'];
  var tierBgRgba   = ['rgba(95,107,106,.10)', 'rgba(80,227,194,.07)', 'rgba(165,158,255,.08)', 'rgba(201,255,58,.08)'];
  var tierBordRgba = ['rgba(95,107,106,.30)', 'rgba(80,227,194,.35)', 'rgba(165,158,255,.35)', 'rgba(201,255,58,.35)'];

  var liftColors = { supino: '#a59eff', agacha: '#50e3c2', terra: '#ffb534' };
  var liftsData  = [
    { key: 'supino', label: 'Supino', kg: sup, ratio: 1.00 },
    { key: 'agacha', label: 'Agacha', kg: aga, ratio: ratioAga },
    { key: 'terra',  label: 'Terra',  kg: ter, ratio: ratioTer },
  ];

  var btnStyle = _ratioPorLado
    ? 'background:var(--accent);border:1px solid var(--accent);color:#0d1114;font-weight:700;'
    : 'background:transparent;border:1px solid var(--border);color:var(--muted);';

  var html = '';

  html += '<div style="display:flex;justify-content:flex-end;margin-bottom:10px;">'
    + '<button onclick="toggleRatioPorLado()" style="font-family:var(--mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;padding:4px 10px;border-radius:5px;cursor:pointer;line-height:1.4;' + btnStyle + '">p/lado</button>'
    + '</div>';

  // 3-column values
  html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">';
  liftsData.forEach(function(l) {
    html += '<div style="background:var(--bg);border:1px solid var(--border2);border-radius:7px;padding:10px;text-align:center;">'
      + '<div style="font-family:var(--mono);font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;">' + l.label + '</div>'
      + '<div style="font-size:16px;font-weight:700;font-family:var(--mono);color:' + liftColors[l.key] + ';">' + l.kg.toFixed(1) + '</div>'
      + '<div style="font-size:9px;color:var(--muted);font-family:var(--mono);margin-top:2px;">&times;' + l.ratio.toFixed(2) + '</div>'
      + '</div>';
  });
  html += '</div>';

  // Tier rows
  html += '<div style="display:flex;flex-direction:column;gap:4px;">';
  tiers.forEach(function(t, i) {
    var isCurrent  = i === currentTier;
    var agaOk      = ratioAga >= t.aga;
    var terOk      = ratioTer >= t.ter;
    var met        = agaOk && terOk;
    var rowBg      = isCurrent ? tierBgRgba[i]   : 'transparent';
    var rowBorder  = isCurrent ? tierBordRgba[i]  : 'var(--border)';
    var nameColor  = met ? tierColors[i] : (i === currentTier + 1 ? 'var(--text)' : 'var(--muted)');
    var fontWeight = isCurrent ? '700' : '400';

    html += '<div style="display:grid;grid-template-columns:auto 1fr auto auto;align-items:center;gap:8px;padding:7px 10px;border-radius:6px;background:' + rowBg + ';border:1px solid ' + rowBorder + ';">'
      + '<span style="font-family:var(--mono);font-size:11px;font-weight:' + fontWeight + ';color:' + nameColor + ';min-width:96px;">' + t.name + '</span>'
      + '<span style="font-family:var(--mono);font-size:10px;color:var(--muted);">'
        + '1.00 · <span style="color:' + (agaOk ? 'var(--teal)' : 'var(--muted)') + ';">' + t.aga.toFixed(2) + '</span>'
        + ' · <span style="color:' + (terOk ? 'var(--amber)' : 'var(--muted)') + ';">' + t.ter.toFixed(2) + '</span>'
      + '</span>'
      + '<span style="font-size:11px;color:' + (agaOk ? 'var(--teal)' : 'var(--red)') + ';">' + (agaOk ? '✓' : '✗') + '</span>'
      + '<span style="font-size:11px;color:' + (terOk ? 'var(--amber)' : 'var(--red)') + ';">' + (terOk ? '✓' : '✗') + '</span>'
      + '</div>';
  });
  html += '</div>';

  // Next tier targets
  if (nextTier) {
    var neededAga = Math.ceil(sup * nextTier.aga * 2) / 2;
    var neededTer = Math.ceil(sup * nextTier.ter * 2) / 2;
    var gapAga    = neededAga - aga;
    var gapTer    = neededTer - ter;

    var parts = [];
    if (gapAga > 0) parts.push(
      '<span style="font-family:var(--mono);font-size:11px;">'
      + '<span style="color:var(--muted);">Agacha </span>'
      + '<span style="color:var(--teal);font-weight:600;">' + neededAga + ' kg</span>'
      + '<span style="color:var(--muted);font-size:10px;"> (+' + gapAga.toFixed(1) + ')</span>'
      + '</span>'
    );
    if (gapTer > 0) parts.push(
      '<span style="font-family:var(--mono);font-size:11px;">'
      + '<span style="color:var(--muted);">Terra </span>'
      + '<span style="color:var(--amber);font-weight:600;">' + neededTer + ' kg</span>'
      + '<span style="color:var(--muted);font-size:10px;"> (+' + gapTer.toFixed(1) + ')</span>'
      + '</span>'
    );

    if (parts.length) {
      html += '<div style="margin-top:10px;padding:9px 12px;background:var(--bg);border:1px solid var(--border);border-radius:7px;">'
        + '<div style="font-family:var(--mono);font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:7px;">Para ' + nextTier.name + '</div>'
        + '<div style="display:flex;gap:16px;flex-wrap:wrap;">' + parts.join('') + '</div>'
        + '</div>';
    }
  } else if (currentTier === tiers.length - 1) {
    html += '<div style="margin-top:10px;padding:9px 12px;background:rgba(201,255,58,.05);border:1px solid rgba(201,255,58,.2);border-radius:7px;font-family:var(--mono);font-size:11px;color:var(--accent);text-align:center;">Nível Elite atingido</div>';
  }

  card.innerHTML = html;
}
globalThis.renderRatioCard = renderRatioCard;

populateRMLiftSelect();

g('btnSaveRM').addEventListener('click', saveRMRecord);
g('rmW').addEventListener('input', calcRM);
g('rmR').addEventListener('input', calcRM);

document.addEventListener('change', function(e) {
  if (e.target && e.target.id === 'rmProjectWeeks') renderRMHistory();
});

g('rmHistDate').addEventListener('input', function() {
  var digits = this.value.replace(/\D/g, '').slice(0, 8);
  var v = digits;
  if (digits.length > 4) v = digits.slice(0,2) + '/' + digits.slice(2,4) + '/' + digits.slice(4);
  else if (digits.length > 2) v = digits.slice(0,2) + '/' + digits.slice(2);
  this.value = v;
});
