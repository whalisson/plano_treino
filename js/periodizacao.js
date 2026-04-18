// ── GORILA GYM — periodizacao.js ─────────────
// Tabela de periodização, lifts customizados, histórico de ciclos e banner de PR

import { uid, g, round05, getWeekRange, parseSetCount, showUndo, saveState,
  BASE_SUP, BASE_AGA, BASE_TER,
  checksState, setChecksState, rmTestValues, setRmTestValues,
  kgHistory, customLifts, cycleHistory, setCycleHistory, cycleStartDates } from './state.js';

// ── Tabela de periodização (única — antes duplicada 3×) ──
export var periodBase = [
  { label:'Semana 1',  series:[{r:'8 reps',p:.50},{r:'5 reps',p:.55},{r:'6x4',p:.60}] },
  { label:'Semana 2',  series:[{r:'8 reps',p:.50},{r:'5 reps',p:.55},{r:'6x4',p:.65}] },
  { label:'Semana 3',  series:[{r:'8 reps',p:.50},{r:'5 reps',p:.55},{r:'5x4',p:.70}] },
  { label:'Semana 4',  series:[{r:'8 reps',p:.30},{r:'5 reps',p:.55},{r:'5 reps',p:.60},{r:'4x4',p:.75}] },
  { label:'Semana 5',  deload:true, note:'Volume −50% · Foco em técnica', series:[{r:'8 reps',p:.50},{r:'2x4',p:.60}] },
  { label:'Semana 6',  series:[{r:'8 reps',p:.50},{r:'5 reps',p:.53},{r:'4 reps',p:.65},{r:'4x3',p:.80}] },
  { label:'Semana 7',  series:[{r:'8 reps',p:.50},{r:'5 reps',p:.55},{r:'3 reps',p:.70},{r:'3x3',p:.85}] },
  { label:'Semana 8',  series:[{r:'8 reps',p:.50},{r:'5 reps',p:.55},{r:'3 reps',p:.70},{r:'2 reps',p:.80},{r:'2x2',p:.90}] },
  { label:'Semana 9',  series:[{r:'8 reps',p:.50},{r:'5 reps',p:.55},{r:'6x3',p:.70}] },
  { label:'Semana 10', rest:true, note:'Descanso Total' },
  { label:'Semana 11', series:[{r:'8 reps',p:.50},{r:'5 reps',p:.60},{r:'3 reps',p:.70},{r:'2 reps',p:.80},{r:'1 rep',p:.90},{r:'1 rep',p:1.00},{r:'? reps',p:1.05}], note:'Teste Novo RM' },
  { label:'Semana 12', byLift:{
      supino: { skip:true },
      agacha: { skip:true },
      terra:  { rest:true, note:'Descanso Total — Terra' },
    }
  },
];

// ── Dicts de aparência por lift (usados no histórico de ciclos) ──
export var LIFT_LABELS = { supino:'Supino', agacha:'Agachamento', terra:'Terra' };
export var LIFT_COLORS = { supino:'rgba(80,227,194,.9)', agacha:'rgba(201,255,58,.9)', terra:'rgba(255,79,216,.9)' };
export var LIFT_FILL   = { supino:'rgba(80,227,194,.12)', agacha:'rgba(201,255,58,.12)', terra:'rgba(255,79,216,.12)' };
export var LIFT_SOLID  = { supino:'#50e3c2', agacha:'#c9ff3a', terra:'#ff4fd8' };

// ── Referência de cores para lifts customizados ──
export var CUSTOM_LIFT_PALETTE = ['#f472b6','#fb923c','#a78bfa','#34d399','#60a5fa','#e879f9','#facc15'];

export function hexToRgb(hex) {
  return parseInt(hex.slice(1,3),16)+','+parseInt(hex.slice(3,5),16)+','+parseInt(hex.slice(5,7),16);
}
export function getCustomColor(idx) { return CUSTOM_LIFT_PALETTE[idx % CUSTOM_LIFT_PALETTE.length]; }

// ── Construção da tabela semanal ──────────────
function buildWeekTable(baseWeeks, tid, liftKey, rm) {
  var c = g(tid);
  if (!c) return;
  c.innerHTML = '';

  // Detecta semana atual: primeira não-descanso não concluída, desde que todas anteriores estejam feitas
  var currentWeekIdx = -1;
  var allPrevDone    = true;
  baseWeeks.forEach(function(w, wi) {
    var wEff = (w.byLift && w.byLift[liftKey]) ? Object.assign({}, w, w.byLift[liftKey]) : w;
    if (wEff.skip || wEff.rest) return;
    var totalChecks = 0;
    wEff.series.forEach(function(s) { totalChecks += parseSetCount(s.r); });
    var state    = (checksState[liftKey] || {})[wi] || {};
    var done     = Object.values(state).filter(Boolean).length;
    var weekDone = done >= totalChecks;
    if (currentWeekIdx === -1 && !weekDone) {
      if (allPrevDone || done > 0) currentWeekIdx = wi;
    }
    if (!weekDone) allPrevDone = false;
  });

  baseWeeks.forEach(function(w, wi) {
    var wEff = (w.byLift && w.byLift[liftKey]) ? Object.assign({}, w, w.byLift[liftKey]) : w;
    if (wEff.skip) return;
    if (wEff.rest) {
      var restEl = document.createElement('div');
      restEl.style.cssText = 'background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.2);border-radius:9px;padding:9px 13px;margin-bottom:9px;font-size:13px;color:var(--amber);';
      restEl.textContent = '🏖️ ' + w.label + (wEff.note ? ' — ' + wEff.note : '');
      c.appendChild(restEl);
      return;
    }

    var totalChecks = 0;
    wEff.series.forEach(function(s) { totalChecks += parseSetCount(s.r); });

    if (!checksState[liftKey]) checksState[liftKey] = {};
    if (!checksState[liftKey][wi]) checksState[liftKey][wi] = {};
    var weekState  = checksState[liftKey][wi];
    var doneCount  = Object.values(weekState).filter(Boolean).length;
    var weekDone   = doneCount >= totalChecks;
    var isCurrent  = wi === currentWeekIdx;

    var block = document.createElement('div');
    block.className = 'week-block' + (weekDone ? ' completed' : '') + (isCurrent ? ' current-week' : '') + (wEff.deload ? ' deload-week' : '');
    block.id = 'wb-' + liftKey + '-' + wi;

    var hdr = document.createElement('div');
    hdr.className = 'week-header';
    hdr.innerHTML = '<span class="week-header-label">' + w.label + '</span>';
    if (wEff.deload && !weekDone) hdr.innerHTML += '<span class="week-deload-badge">⬇ Deload</span>';
    if (isCurrent && !weekDone) hdr.innerHTML += '<span class="week-current-badge">▶ Em andamento</span>';
    if (weekDone)                hdr.innerHTML += '<span class="week-done-badge">✓ Concluída</span>';
    if (wEff.note && !weekDone) hdr.innerHTML += '<span class="week-header-note">' + wEff.note + '</span>';

    var progWrap = document.createElement('div');
    progWrap.className = 'week-header-progress';
    progWrap.innerHTML = '<span class="week-prog-text">' + doneCount + '/' + totalChecks + '</span>'
      + '<div class="week-prog-bar"><div class="week-prog-fill lift-' + liftKey + (weekDone ? ' done' : '') + '" id="pf-' + liftKey + '-' + wi + '" style="width:' + Math.round(doneCount / totalChecks * 100) + '%"></div></div>';
    hdr.appendChild(progWrap);
    block.appendChild(hdr);

    var colHdr = document.createElement('div');
    colHdr.className = 'week-cols';
    colHdr.innerHTML = '<span>Série</span><span>Carga</span><span>% RM</span><span style="text-align:right;">Sets</span>';
    block.appendChild(colHdr);

    var checkIdx = 0;
    wEff.series.forEach(function(s, si) {
      var isQreps   = s.r === '? reps';
      var isLast    = si === wEff.series.length - 1;
      var isMainSet = wEff.series.length > 2 && isLast && !isQreps;
      var numChecks = parseSetCount(s.r);
      var kg        = round05(rm * s.p);

      var row = document.createElement('div');
      row.className = 'series-row' + (isMainSet ? ' main-set' : '') + (isQreps ? ' rm-test-set' : '');
      row.style.borderBottom = si < wEff.series.length - 1 ? '1px solid var(--border)' : 'none';

      var lbl = document.createElement('span');
      lbl.className = 'ser-label';
      lbl.style.color = isQreps ? 'var(--green)' : isMainSet ? 'var(--text)' : 'var(--muted)';
      lbl.textContent = s.r;
      row.appendChild(lbl);

      var kgSpan = document.createElement('span');
      kgSpan.className = 'ser-kg';
      kgSpan.style.fontWeight = (isMainSet || isQreps) ? 600 : 400;
      kgSpan.style.color = isQreps ? 'var(--green)' : isMainSet ? 'var(--accent)' : 'var(--text)';
      kgSpan.textContent = kg + ' kg';
      row.appendChild(kgSpan);

      var pctSpan = document.createElement('span');
      pctSpan.className = 'ser-pct';
      pctSpan.textContent = Math.round(s.p * 100) + '%';
      row.appendChild(pctSpan);

      var checksWrap = document.createElement('div');
      checksWrap.className = 'ser-checks';
      checksWrap.style.justifyContent = 'flex-end';

      if (isQreps) {
        var testWrap = document.createElement('div');
        testWrap.className = 'rm-test-input-wrap';

        var inp = document.createElement('input');
        inp.type = 'number'; inp.step = '0.5'; inp.min = '0';
        inp.className = 'rm-test-inline';
        inp.placeholder = '—';
        inp.title = 'Novo RM (kg)';
        var savedTest = rmTestValues[liftKey][wi];
        if (savedTest) inp.value = savedTest;

        var updBtn = document.createElement('button');
        updBtn.className = 'rm-update-btn' + (savedTest ? ' visible' : '');
        updBtn.innerHTML = '↑ Atualizar RM';
        updBtn.title = 'Substituir RM principal pelo novo valor';

        inp.addEventListener('input', function() {
          var v = parseFloat(inp.value);
          if (v > 0) {
            rmTestValues[liftKey][wi] = v;
            updBtn.classList.add('visible');
          } else {
            updBtn.classList.remove('visible');
          }
          saveState();
        });

        updBtn.addEventListener('click', function() {
          var v = parseFloat(inp.value);
          if (!v || v <= 0) return;
          var rmId = { supino:'rm-supino', agacha:'rm-agacha', terra:'rm-terra' }[liftKey]
            || ('rm-custom-' + liftKey);
          var rmStart = parseFloat(g(rmId).value) || 0;
          var rmEnd   = v;

          if (rmStart > 0) {
            var today  = new Date();
            var dateEnd = String(today.getDate()).padStart(2,'0') + '/'
              + String(today.getMonth()+1).padStart(2,'0') + '/' + today.getFullYear();

            var isPR     = rmEnd > rmStart;
            var prevBest = cycleHistory
              .filter(function(c) { return c.lift === liftKey; })
              .reduce(function(max, c) { return Math.max(max, c.rmEnd); }, 0);
            var isAllTime = isPR && (prevBest === 0 || rmEnd > prevBest);

            cycleHistory.push({
              lift:      liftKey,
              rmStart:   rmStart,
              rmEnd:     rmEnd,
              gain:      Math.round((rmEnd - rmStart) * 10) / 10,
              dateStart: cycleStartDates[liftKey] || null,
              dateEnd:   dateEnd,
              id:        uid(),
            });
            delete cycleStartDates[liftKey];
            renderCycleHistory();

            if (isPR) {
              var _liftColors = { supino:'#a59eff', agacha:'#2dd4bf', terra:'#fbbf24' };
              var _liftLabels = { supino:'Supino',  agacha:'Agachamento', terra:'Terra' };
              showPRBanner(
                _liftLabels[liftKey] || (LIFT_LABELS[liftKey] || liftKey),
                _liftColors[liftKey] || (LIFT_SOLID[liftKey]  || '#a59eff'),
                rmStart, rmEnd, isAllTime
              );
            }
          }

          g(rmId).value = v;
          checksState[liftKey]  = {};
          rmTestValues[liftKey] = {};
          var _cl = customLifts.find(function(l) { return l.id === liftKey; });
          if (_cl) {
            _cl.rm = v;
            buildWeekTable(periodBase, 'tbl-custom-' + liftKey, liftKey, v);
          } else {
            buildAllPeriod();
          }
          saveState();

          var rmEl = g(rmId);
          rmEl.style.transition = 'color .3s';
          rmEl.style.color = 'var(--green)';
          setTimeout(function() { rmEl.style.color = ''; }, 1200);
        });

        var cbWrap = makeCbEl(liftKey, wi, 0, weekState, totalChecks, block, liftKey);
        testWrap.appendChild(inp);
        testWrap.appendChild(updBtn);
        checksWrap.appendChild(cbWrap);
        checksWrap.appendChild(testWrap);
      } else {
        for (var ci = 0; ci < numChecks; ci++) {
          checksWrap.appendChild(makeCbEl(liftKey, wi, checkIdx + ci, weekState, totalChecks, block, liftKey));
        }
      }
      checkIdx += numChecks;
      row.appendChild(checksWrap);
      block.appendChild(row);
    });

    c.appendChild(block);
  });
}

function makeCbEl(liftKey, wi, cbKey, weekState, totalChecks, blockEl) {
  var label = document.createElement('label');
  label.className = 'set-cb';
  label.title = 'Marcar série concluída';

  var inp = document.createElement('input');
  inp.type    = 'checkbox';
  inp.checked = !!weekState[cbKey];

  var box = document.createElement('span');
  box.className = 'set-cb-box';
  box.innerHTML = '<svg class="set-cb-check" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  inp.addEventListener('change', function() {
    weekState[cbKey]         = inp.checked;
    checksState[liftKey][wi] = weekState;

    // Registra data de início do ciclo na primeira marcação
    if (inp.checked && !cycleStartDates[liftKey]) {
      var now = new Date();
      cycleStartDates[liftKey] = String(now.getDate()).padStart(2,'0') + '/'
        + String(now.getMonth()+1).padStart(2,'0') + '/' + now.getFullYear();
    }

    var done    = Object.values(weekState).filter(Boolean).length;
    var allDone = done >= totalChecks;
    var pf = document.getElementById('pf-' + liftKey + '-' + wi);
    if (pf) {
      pf.style.width = Math.round(done / totalChecks * 100) + '%';
      if (allDone) pf.classList.add('done'); else pf.classList.remove('done');
    }
    var progTxt = blockEl.querySelector('.week-prog-text');
    if (progTxt) progTxt.textContent = done + '/' + totalChecks;

    buildCycleProgress();
    if (allDone && !blockEl.classList.contains('completed')) {
      blockEl.classList.add('completed');
      var hdr = blockEl.querySelector('.week-header');
      if (hdr && !hdr.querySelector('.week-done-badge')) {
        var badge = document.createElement('span');
        badge.className   = 'week-done-badge';
        badge.textContent = '✓ Concluída';
        hdr.insertBefore(badge, hdr.children[1] || null);
      }
    } else if (!allDone) {
      blockEl.classList.remove('completed');
      var badge = blockEl.querySelector('.week-done-badge');
      if (badge) badge.remove();
    }
    saveState();
  });

  label.appendChild(inp);
  label.appendChild(box);
  return label;
}

function drawSparkline(canvasId, points, color) {
  var canvas = g(canvasId); if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  var pts = (points && points.length >= 2) ? points : null;
  var pad = 4;
  if (!pts) {
    ctx.beginPath(); ctx.moveTo(pad, H / 2); ctx.lineTo(W - pad, H / 2);
    ctx.strokeStyle = color; ctx.globalAlpha = 0.25; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.globalAlpha = 1; return;
  }
  var min = Math.min.apply(null, pts), max = Math.max.apply(null, pts), range = max - min || 1;
  function fx(i) { return pad + (i / (pts.length - 1)) * (W - pad * 2); }
  function fy(v) { return H - pad - ((v - min) / range) * (H - pad * 2); }
  var grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, color + '40'); grad.addColorStop(1, color + '00');
  ctx.beginPath();
  pts.forEach(function(p, i) { i === 0 ? ctx.moveTo(fx(i), fy(p)) : ctx.lineTo(fx(i), fy(p)); });
  ctx.lineTo(fx(pts.length - 1), H); ctx.lineTo(fx(0), H); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();
  ctx.beginPath();
  pts.forEach(function(p, i) { i === 0 ? ctx.moveTo(fx(i), fy(p)) : ctx.lineTo(fx(i), fy(p)); });
  ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.stroke();
  var lx = fx(pts.length - 1), ly = fy(pts[pts.length - 1]);
  ctx.beginPath(); ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
}

export function buildRmDashboard() {
  var lifts = [
    { key:'supino', color:'#50e3c2' },
    { key:'agacha', color:'#c9ff3a' },
    { key:'terra',  color:'#ff4fd8' },
  ];
  lifts.forEach(function(lf) {
    var rmEl = g('rm-' + lf.key); if (!rmEl) return;
    var val = parseFloat(rmEl.value) || 0;
    // sparkline from kgHistory
    var hist = (kgHistory || []).filter(function(h) { return h.lift === lf.key; });
    hist.sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
    var points = hist.slice(-14).map(function(h) { return h.val; });
    if (points.length === 0) points = [val];
    drawSparkline('spark-' + lf.key, points, lf.color);
    // delta vs 7 days ago
    var deltaEl = g('rm-delta-' + lf.key);
    if (deltaEl) {
      if (hist.length >= 2) {
        var latest = hist[hist.length - 1];
        var cutoff = Date.now() - 7 * 864e5;
        var ref = hist[0];
        for (var i = hist.length - 2; i >= 0; i--) {
          if (new Date(hist[i].date).getTime() <= cutoff) { ref = hist[i]; break; }
        }
        var pctDelta = (latest.val - ref.val) / ref.val * 100;
        var sign = pctDelta >= 0 ? '▲' : '▼';
        deltaEl.textContent = sign + ' ' + Math.abs(pctDelta).toFixed(1) + '% (Δ7d)';
        deltaEl.className = 'rm-delta ' + (pctDelta >= 0 ? 'pos' : 'neg');
      } else {
        deltaEl.textContent = '— (Δ7d)';
        deltaEl.className = 'rm-delta';
      }
    }
    // PR próx: next week's peak kg
    var proxEl = g('rm-prox-' + lf.key);
    if (proxEl) {
      var nextWeekIdx = -1;
      periodBase.forEach(function(w, wi) {
        if (nextWeekIdx !== -1) return;
        var wEff = (w.byLift && w.byLift[lf.key]) ? Object.assign({}, w, w.byLift[lf.key]) : w;
        if (wEff.skip || wEff.rest) return;
        var checks = (checksState[lf.key] || {})[wi] || {};
        var numChecks = wEff.series.reduce(function(a, s) { return a + parseSetCount(s.r); }, 0);
        if (Object.values(checks).filter(Boolean).length < numChecks) nextWeekIdx = wi;
      });
      if (nextWeekIdx !== -1) {
        var wEff = (periodBase[nextWeekIdx].byLift && periodBase[nextWeekIdx].byLift[lf.key])
          ? Object.assign({}, periodBase[nextWeekIdx], periodBase[nextWeekIdx].byLift[lf.key])
          : periodBase[nextWeekIdx];
        if (wEff.series && wEff.series.length) {
          var maxPct = Math.max.apply(null, wEff.series.map(function(s) { return s.p; }));
          proxEl.textContent = 'PR próx ' + round05(val * maxPct) + 'kg';
        }
      } else {
        proxEl.textContent = 'Ciclo completo';
      }
    }
  });
}

function buildCycleProgress() {
  var el = g('cycleProgressList'); if (!el) return;
  var lifts = [
    { key:'supino', label:'Supino',      barCls:'lift-supino' },
    { key:'agacha', label:'Agachamento', barCls:'lift-agacha' },
    { key:'terra',  label:'Terra',       barCls:'lift-terra'  },
  ];
  el.innerHTML = '';
  var globalDone = 0, globalTotal = 0;
  lifts.forEach(function(lf) {
    var rmEl = g('rm-' + lf.key);
    var rmVal = rmEl ? (parseFloat(rmEl.value) || 0) : 0;
    var total = 0, done = 0, nextWeekIdx = -1;
    periodBase.forEach(function(w, wi) {
      var wEff = (w.byLift && w.byLift[lf.key]) ? Object.assign({}, w, w.byLift[lf.key]) : w;
      if (wEff.skip || wEff.rest) return;
      total++;
      var checks = checksState[lf.key][wi] || {};
      var numChecks = wEff.series.reduce(function(a, s) { return a + parseSetCount(s.r); }, 0);
      var weekDone = Object.values(checks).filter(Boolean).length >= numChecks;
      if (weekDone) { done++; } else if (nextWeekIdx === -1) { nextWeekIdx = wi; }
    });
    if (lf.key === 'supino') { globalDone = done; globalTotal = total; }
    var pct = total > 0 ? Math.round(done / total * 100) : 0;
    var proxText = 'completo';
    if (nextWeekIdx !== -1) {
      var wEff = (periodBase[nextWeekIdx].byLift && periodBase[nextWeekIdx].byLift[lf.key])
        ? Object.assign({}, periodBase[nextWeekIdx], periodBase[nextWeekIdx].byLift[lf.key])
        : periodBase[nextWeekIdx];
      if (wEff.series && wEff.series.length) {
        var maxPct = Math.max.apply(null, wEff.series.map(function(s) { return s.p; }));
        proxText = 'próx ' + round05(rmVal * maxPct) + 'kg';
      }
    }
    var row = document.createElement('div');
    row.className = 'cycle-row';
    row.innerHTML =
      '<span class="cycle-row-name">' + lf.label + '</span>'
      + '<div class="cycle-bar-wrap"><div class="cycle-bar-fill ' + lf.barCls + '" style="width:' + pct + '%"></div></div>'
      + '<span class="cycle-row-info"><b>S' + (done + 1) + '</b> · ' + pct + '% · <span class="prox">' + proxText + '</span></span>';
    el.appendChild(row);
  });
  var sub = g('cycleSub');
  if (sub) sub.textContent = 'S' + (globalDone + 1) + '/' + globalTotal;
}

export function buildAllPeriod() {
  var sup = parseFloat(g('rm-supino').value) || BASE_SUP;
  var aga = parseFloat(g('rm-agacha').value) || BASE_AGA;
  var ter = parseFloat(g('rm-terra').value)  || BASE_TER;
  buildWeekTable(periodBase, 'tbl-supino', 'supino', sup);
  buildWeekTable(periodBase, 'tbl-agacha', 'agacha', aga);
  buildWeekTable(periodBase, 'tbl-terra',  'terra',  ter);
  try { buildCycleProgress(); } catch(e) { console.warn('buildCycleProgress:', e); }
  try { buildRmDashboard();   } catch(e) { console.warn('buildRmDashboard:', e); }
}

['rm-supino','rm-agacha','rm-terra'].forEach(function(id) {
  g(id).addEventListener('input', function() { buildAllPeriod(); saveState(); });
});

['supino','agacha','terra'].forEach(function(k) {
  g('psh-' + k).addEventListener('click', function() {
    var b    = g('psb-' + k);
    var open = b.classList.toggle('on');
    g('chev-' + k).textContent = open ? '▲' : '▼';
  });
});

// ── Lifts Personalizados ──────────────────────
export function renderCustomLifts() {
  var section   = g('customLiftsSection');
  var metricsEl = g('customMetrics');
  if (section) section.innerHTML = '';
  if (metricsEl) { metricsEl.innerHTML = ''; metricsEl.style.display = 'none'; }

  // Container de cards personalizados (flex horizontal com scroll)
  var rmDash = g('customRmCards');
  if (rmDash) {
    rmDash.innerHTML = '';
    rmDash.style.display = customLifts.length ? 'grid' : 'none';
  }

  customLifts.forEach(function(lift, idx) {
    var color = getCustomColor(idx);
    var rgb   = hexToRgb(color);

    if (!checksState[lift.id])  checksState[lift.id]  = {};
    if (!rmTestValues[lift.id]) rmTestValues[lift.id] = {};
    LIFT_LABELS[lift.id] = lift.name;
    LIFT_COLORS[lift.id] = 'rgba(' + rgb + ',.9)';
    LIFT_FILL[lift.id]   = 'rgba(' + rgb + ',.12)';
    LIFT_SOLID[lift.id]  = color;

    var sparkId = 'spark-custom-' + lift.id;
    var deltaId = 'rm-delta-custom-' + lift.id;
    var proxId  = 'rm-prox-custom-' + lift.id;
    var inputId = 'rm-custom-' + lift.id;

    // ── Card no RM Dashboard ──
    if (rmDash) {
      var card = document.createElement('div');
      card.className = 'rm-card rm-card-custom';
      card.style.cssText = 'border-color:rgba(' + rgb + ',.25);';
      card.innerHTML =
        '<div class="rm-top">'
        + '<div class="rm-label">' + lift.name.toUpperCase() + ' <em>· 1RM</em></div>'
        + '<canvas id="' + sparkId + '" class="rm-spark" width="80" height="36"></canvas>'
        + '</div>'
        + '<div class="rm-val-row">'
        + '<input class="rminput rm-inp" id="' + inputId + '" type="number" value="' + lift.rm + '" step="0.5" min="0" style="color:' + color + ';">'
        + '<span class="rm-unit">kg</span>'
        + '</div>'
        + '<div class="rm-foot">'
        + '<span class="rm-delta" id="' + deltaId + '">— (Δ7d)</span>'
        + '<span class="rm-prox-badge" id="' + proxId + '" style="border-color:rgba(' + rgb + ',.3);color:' + color + ';">PR próx</span>'
        + '</div>'
        + '<button class="rm-custom-del" title="Remover levantamento">×</button>';
      rmDash.appendChild(card);

      card.querySelector('input').addEventListener('input', function() {
        lift.rm = parseFloat(this.value) || 0;
        buildWeekTable(periodBase, 'tbl-custom-' + lift.id, lift.id, lift.rm);
        saveState();
      });
      card.querySelector('.rm-custom-del').addEventListener('click', function() {
        deleteCustomLift(lift.id);
      });

      // Sparkline
      var hist   = (kgHistory || []).filter(function(h) { return h.lift === lift.id; });
      hist.sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
      var points = hist.slice(-14).map(function(h) { return h.val; });
      if (!points.length) points = [lift.rm];
      drawSparkline(sparkId, points, color);
    }

    // ── Seção colapsável (tabela semanal) ──
    var ps     = document.createElement('div');
    var pshId  = 'psh-custom-' + lift.id;
    var psbId  = 'psb-custom-' + lift.id;
    var chevId = 'chev-custom-' + lift.id;
    var tblId  = 'tbl-custom-' + lift.id;
    ps.className = 'ps';
    ps.innerHTML =
      '<div class="psh" id="' + pshId + '">'
      + '<span class="pstitle" style="color:' + color + ';">' + lift.name + '</span>'
      + '<span class="pschev" id="' + chevId + '" style="margin-left:8px;">▼</span>'
      + '</div>'
      + '<div class="psb" id="' + psbId + '"><div id="' + tblId + '"></div></div>';
    if (section) section.appendChild(ps);

    ps.querySelector('.psh').addEventListener('click', function() {
      var open = g(psbId).classList.toggle('on');
      g(chevId).textContent = open ? '▲' : '▼';
    });
    buildWeekTable(periodBase, tblId, lift.id, lift.rm);
  });

  if (typeof globalThis.populateRMLiftSelect === 'function') globalThis.populateRMLiftSelect();
}

function deleteCustomLift(id) {
  var newCustomLifts = customLifts.filter(function(l) { return l.id !== id; });
  // Mutate in-place to avoid ES module rebinding issues
  customLifts.length = 0;
  newCustomLifts.forEach(function(l) { customLifts.push(l); });
  delete checksState[id];
  delete rmTestValues[id];
  delete cycleStartDates[id];
  delete LIFT_LABELS[id];
  delete LIFT_COLORS[id];
  delete LIFT_FILL[id];
  delete LIFT_SOLID[id];
  renderCustomLifts();
  saveState();
}

g('btnAddCustomLift').addEventListener('click', function() {
  g('mLiftName').value = '';
  g('mLiftRM').value   = '';
  g('mAddLift').classList.add('on');
  setTimeout(function() { g('mLiftName').focus(); }, 80);
});
g('btnCancelLift').addEventListener('click', function() { g('mAddLift').classList.remove('on'); });
g('btnConfirmLift').addEventListener('click', function() {
  var name = g('mLiftName').value.trim();
  if (!name) return;
  var rm = parseFloat(g('mLiftRM').value) || 0;
  customLifts.push({ id:uid(), name:name, rm:rm });
  g('mAddLift').classList.remove('on');
  renderCustomLifts();
  saveState();
});

// ── Histórico de Ciclos ───────────────────────
var cycleChartInst = null;

export function parseCycleDate(dStr) {
  var p = dStr.split('/');
  return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
}

function deleteCycle(id) {
  var newCycleHistory = cycleHistory.filter(function(c) { return c.id !== id; });
  setCycleHistory(newCycleHistory);
  renderCycleHistory();
  saveState();
}

export function renderCycleHistory() {
  var section = g('cycleHistorySection');
  var list    = g('cycleList');
  if (!cycleHistory.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';

  if (cycleChartInst) { cycleChartInst.destroy(); cycleChartInst = null; }

  var lifts    = ['supino','agacha','terra'].concat(customLifts.map(function(l) { return l.id; }));
  var allDates = [...new Set(cycleHistory.map(function(c) { return c.dateEnd; }))].sort(function(a,b) {
    return parseCycleDate(a) - parseCycleDate(b);
  });

  var datasets = lifts.map(function(lk) {
    var pts = allDates.map(function(d) {
      var entries = cycleHistory.filter(function(c) { return c.lift === lk && c.dateEnd === d; });
      return entries.length ? entries[entries.length - 1].rmEnd : null;
    });
    if (pts.every(function(p) { return p === null; })) return null;
    return {
      label:              LIFT_LABELS[lk] || lk,
      data:               pts,
      borderColor:        LIFT_COLORS[lk] || 'rgba(200,200,200,.9)',
      backgroundColor:    LIFT_FILL[lk]   || 'rgba(200,200,200,.12)',
      borderWidth:        2.5,
      pointRadius:        6,
      pointHoverRadius:   9,
      pointBackgroundColor: LIFT_SOLID[lk] || '#ccc',
      pointBorderColor:   '#0c0c0f',
      pointBorderWidth:   2,
      fill:               true,
      tension:            0.4,
      spanGaps:           true,
    };
  }).filter(Boolean);

  var ctx = g('cycleChart').getContext('2d');
  cycleChartInst = new Chart(ctx, {
    type: 'line',
    data: { labels: allDates, datasets: datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration:900, easing:'easeInOutQuart' },
      transitions: { active:{ animation:{ duration:200 } } },
      interaction: { mode:'index', intersect:false },
      plugins: {
        legend: { display:true, labels:{ color:'#8a8898', font:{size:11}, boxWidth:12, padding:16 } },
        tooltip: {
          backgroundColor:'rgba(30,30,40,.95)', borderColor:'rgba(255,255,255,.1)', borderWidth:1,
          titleColor:'#f0eee8', bodyColor:'#8a8898', padding:10,
          callbacks: { label:function(ctx) { var v=ctx.parsed.y; return v===null?null:' '+(LIFT_LABELS[ctx.dataset.label]||ctx.dataset.label)+': '+v+' kg'; } }
        }
      },
      scales: {
        x: { ticks:{color:'#8a8898',font:{size:10}}, grid:{color:'rgba(255,255,255,.04)'} },
        y: { ticks:{color:'#8a8898',font:{size:10},callback:function(v){return v+' kg';}}, grid:{color:'rgba(255,255,255,.05)'}, beginAtZero:false }
      }
    }
  });

  list.innerHTML = '';
  cycleHistory.slice().reverse().forEach(function(c) {
    var gained    = c.gain >= 0;
    var gainColor = gained ? 'var(--green)' : 'var(--red)';
    var gainSign  = c.gain > 0 ? '+' : '';
    var liftColor = LIFT_SOLID[c.lift] || '#aaa';
    var dot = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + liftColor + ';margin-right:6px;vertical-align:middle;"></span>';
    var card = document.createElement('div');
    card.style.cssText = 'background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:12px 14px;display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:12px;transition:border-color .15s;';
    card.onmouseenter = function() { this.style.borderColor = 'rgba(255,255,255,.15)'; };
    card.onmouseleave = function() { this.style.borderColor = ''; };
    card.innerHTML =
      '<div>'
      + '<div style="font-size:12px;font-weight:600;margin-bottom:3px;">' + dot + (LIFT_LABELS[c.lift] || c.lift) + '</div>'
      + '<div style="font-size:11px;color:var(--muted);">'
      + (c.dateStart ? c.dateStart + ' → ' + c.dateEnd : c.dateEnd)
      + (c.rmStart ? ' &nbsp;·&nbsp; <span style="font-family:var(--mono);">' + c.rmStart + ' → ' + c.rmEnd + ' kg</span>' : '')
      + '</div>'
      + '</div>'
      + '<div style="text-align:right;"><div style="font-family:var(--mono);font-size:14px;font-weight:700;color:' + gainColor + ';">' + gainSign + c.gain + ' kg</div></div>'
      + '<button data-cycleid="' + c.id + '" class="cycle-del-btn" style="background:transparent;border:none;color:var(--muted);font-size:16px;padding:0 2px;cursor:pointer;line-height:1;transition:color .15s;" title="Remover">×</button>';
    card.querySelector('.cycle-del-btn').addEventListener('click', function() {
      deleteCycle(this.dataset.cycleid);
    });
    list.appendChild(card);
  });
}

// ── PR Banner ─────────────────────────────────
var _prDismissTimer = null;

function showPRBanner(liftLabel, liftColor, rmStart, rmEnd, isAllTime) {
  var gain   = Math.round((rmEnd - rmStart) * 10) / 10;
  var banner = document.getElementById('pr-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'pr-banner';
    document.body.appendChild(banner);
  }
  banner.innerHTML =
    '<span class="pr-icon">' + (isAllTime ? '🏆' : '📈') + '</span>'
    + '<div class="pr-title">' + (isAllTime ? 'Novo Recorde Pessoal!' : 'Evolução no Ciclo!') + '</div>'
    + '<div class="pr-lift" style="color:' + liftColor + ';">' + liftLabel + '</div>'
    + '<div class="pr-numbers">' + rmStart + ' kg &rarr; <span class="pr-gain">' + rmEnd + ' kg</span>'
    + ' &nbsp;&middot;&nbsp; <span class="pr-gain">+' + gain + ' kg</span></div>'
    + '<span class="pr-dismiss">toque para fechar</span>';

  if (_prDismissTimer) clearTimeout(_prDismissTimer);
  banner.classList.add('show');
  _prDismissTimer = setTimeout(function() { banner.classList.remove('show'); }, 5500);
  banner.onclick = function() { clearTimeout(_prDismissTimer); banner.classList.remove('show'); };
}
