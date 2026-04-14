// ── GORILA GYM — cardio.js ─────────────────────
// Cardio, metas semanais e construtor de treinos por zona

var cardioBase  = [];
var cardioExtra = [];
var cardioCI    = null;

var CARDIO_TYPE_COLORS = {
  corrida:  'rgba(74,222,128,.85)',
  bike:     'rgba(45,212,191,.85)',
  natacao:  'rgba(147,197,253,.85)',
  eliptico: 'rgba(251,191,36,.85)',
  outro:    'rgba(108,99,255,.75)',
};
var CARDIO_TYPE_LABELS = { corrida:'Corrida', bike:'Bike', natacao:'Natação', eliptico:'Elíptico', outro:'Outro' };

function allCardioSessions() { return cardioBase.concat(cardioExtra); }

function parseCardioDate(dStr) {
  var p   = dStr.split('/');
  var day = parseInt(p[0]) || 1;
  var mon = parseInt(p[1]) || 1;
  var yr  = p[2] ? (parseInt(p[2]) < 100 ? parseInt(p[2]) + 2000 : parseInt(p[2])) : new Date().getFullYear();
  return new Date(yr, mon - 1, day);
}

function calcCardioStreak() {
  var goal  = parseInt(g('cardioGoal').value) || 300;
  var all   = allCardioSessions();
  var range = getWeekRange();
  var streak = 0;
  for (var w = 0; w <= 104; w++) {
    var wStart = new Date(range.start); wStart.setDate(range.start.getDate() - w * 7);
    var wEnd   = new Date(range.end);   wEnd.setDate(range.end.getDate()   - w * 7);
    var mins = all.filter(function(s) {
      try { var d = parseCardioDate(s.d); return d >= wStart && d <= wEnd; } catch(e) { return false; }
    }).reduce(function(a, b) { return a + b.t; }, 0);
    if (mins >= goal) streak++;
    else break;
  }
  return streak;
}

function updateWeekGoal() {
  var goal    = parseInt(g('cardioGoal').value) || 300;
  var range   = getWeekRange();
  var weekMins = allCardioSessions().filter(function(s) {
    try { var d = parseCardioDate(s.d); return d >= range.start && d <= range.end; } catch(e) { return false; }
  }).reduce(function(a, b) { return a + b.t; }, 0);

  var pct  = Math.min(100, Math.round(weekMins / goal * 100));
  var left = Math.max(0, goal - weekMins);

  g('cardioWeekMins').textContent = weekMins;
  g('cardioWeekBar').style.width  = pct + '%';
  g('cardioWeekBar').style.background = pct >= 100
    ? 'linear-gradient(90deg,#4ade80,#2dd4bf)'
    : 'linear-gradient(90deg,var(--teal),var(--accent))';
  g('cardioWeekPct').textContent  = pct + '%';
  g('cardioWeekLeft').textContent = pct >= 100 ? '✓ Meta atingida!' : left + ' min restantes';

  var fmt = function(d) { return d.getDate() + '/' + (d.getMonth() + 1); };
  g('cardioWeekRange').textContent = fmt(range.start) + ' – ' + fmt(range.end);

  var streak = calcCardioStreak();
  g('cardioStreak').innerHTML = streak > 0 ? streak + '<span class="mu">sem</span>' : '—<span class="mu">sem</span>';
}

function renderCardioSessionList() {
  var list     = g('cardioSessionList');
  var sessions = cardioExtra.slice().reverse();
  if (!sessions.length) {
    list.innerHTML = '<div style="font-size:11px;color:var(--muted);padding:4px 0;">Nenhuma sessão adicionada ainda.</div>';
    return;
  }
  list.innerHTML = '';
  sessions.forEach(function(s, i) {
    var realIdx = cardioExtra.length - 1 - i;
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px;';
    var typeKey   = s.type || 'outro';
    var typeBadge = '<span class="act-type act-' + typeKey + '">' + (CARDIO_TYPE_LABELS[typeKey] || typeKey) + '</span>';
    var wktBadge  = s.wkt ? '<span style="font-size:10px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:80px;" title="' + s.wkt + '">· ' + s.wkt + '</span>' : '';
    row.innerHTML = '<span style="color:var(--muted);font-family:var(--mono);min-width:40px;">' + s.d + '</span>'
      + typeBadge
      + wktBadge
      + '<span style="font-weight:600;font-family:var(--mono);color:var(--teal);margin-left:auto;">' + s.t + ' min</span>';
    var delBtn = document.createElement('button');
    delBtn.style.cssText = 'background:transparent;border:none;color:var(--muted);font-size:14px;padding:0 4px;cursor:pointer;line-height:1;';
    delBtn.title       = 'Remover';
    delBtn.textContent = '×';
    delBtn.addEventListener('click', function() { removeCardioSession(realIdx); });
    row.appendChild(delBtn);
    list.appendChild(row);
  });
}

function removeCardioSession(idx) {
  var saved = JSON.parse(JSON.stringify(cardioExtra[idx]));
  cardioExtra.splice(idx, 1);
  refreshCardio();
  showUndo('Sessão de ' + saved.t + ' min removida', function() { cardioExtra.splice(idx, 0, saved); refreshCardio(); }, saveState);
}

function refreshCardio() {
  var all   = allCardioSessions();
  var daily = parseInt(g('cardioDailyGoal').value) || 43;
  g('cardioTotal').innerHTML  = all.reduce(function(a,b){return a+b.t;},0) + '<span class="mu">min</span>';
  g('cardioExcess').innerHTML = all.reduce(function(a,b){return a+Math.max(0,b.t-daily);},0) + '<span class="mu">min</span>';
  g('cardioSess').textContent = all.length;
  updateWeekGoal();
  renderCardioSessionList();
  renderMonthlyCardio();
  if (g('pg-cardio').classList.contains('on')) buildCardioChart();
}

function buildCardioChart() {
  if (cardioCI) { cardioCI.destroy(); cardioCI = null; }
  var all   = allCardioSessions();
  var daily = parseInt(g('cardioDailyGoal').value) || 43;
  g('cardioTotal').innerHTML  = all.reduce(function(a,b){return a+b.t;},0) + '<span class="mu">min</span>';
  g('cardioExcess').innerHTML = all.reduce(function(a,b){return a+Math.max(0,b.t-daily);},0) + '<span class="mu">min</span>';
  g('cardioSess').textContent = all.length;
  cardioCI = new Chart(g('cardioChart').getContext('2d'), {
    type: 'bar',
    data: {
      labels: all.map(function(d) { return d.d; }),
      datasets: [
        {
          data: all.map(function(d) { return d.t; }),
          backgroundColor: all.map(function(d) {
            return CARDIO_TYPE_COLORS[d.type] || CARDIO_TYPE_COLORS.outro;
          }),
          borderWidth:0, borderRadius:3, order:2
        },
        {
          type: 'line',
          data: all.map(function() { return daily; }),
          label: 'Meta diária',
          borderColor: 'rgba(251,191,36,.7)',
          borderWidth: 1.5,
          borderDash: [5, 4],
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          tension: 0,
          order: 1
        }
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false} },
      scales:{
        x:{ ticks:{color:'#8a8898',font:{size:9},maxRotation:45,autoSkip:true,maxTicksLimit:20}, grid:{color:'rgba(255,255,255,.04)'} },
        y:{ ticks:{color:'#8a8898',font:{size:10}}, grid:{color:'rgba(255,255,255,.05)'} }
      }
    }
  });
  updateWeekGoal();
  renderCardioSessionList();
  renderMonthlyCardio();
}

g('cardioDate').addEventListener('input', function() {
  var cur = this.value;
  var digits = cur.replace(/\D/g, '').slice(0, 4);
  if (digits.length > 2) {
    this.value = digits.slice(0, 2) + '/' + digits.slice(2);
  } else {
    this.value = digits;
  }
});

g('btnCardioHoje').addEventListener('click', function() {
  var now = new Date();
  g('cardioDate').value = String(now.getDate()).padStart(2, '0') + '/' + String(now.getMonth() + 1).padStart(2, '0');
});

function renderMonthlyCardio() {
  var card = g('cardioMonthCard');
  var list = g('cardioMonthList');
  if (!card || !list) return;
  var all = allCardioSessions();
  if (!all.length) { card.style.display = 'none'; return; }

  var MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  var totals = {};
  all.forEach(function(s) {
    var p = s.d.split('/');
    var mon = parseInt(p[1]) || 1;
    var yr  = p[2] ? (parseInt(p[2]) < 100 ? parseInt(p[2]) + 2000 : parseInt(p[2])) : new Date().getFullYear();
    var key = yr + '-' + String(mon).padStart(2,'0');
    totals[key] = (totals[key] || 0) + s.t;
  });

  var keys = Object.keys(totals).sort();
  var max  = keys.reduce(function(m, k) { return Math.max(m, totals[k]); }, 0);

  card.style.display = 'block';
  list.innerHTML = '';
  keys.slice().reverse().forEach(function(k) {
    var parts = k.split('-');
    var label = MONTHS[parseInt(parts[1]) - 1] + ' ' + parts[0];
    var mins  = totals[k];
    var pct   = max > 0 ? Math.round(mins / max * 100) : 0;
    var row   = document.createElement('div');
    row.innerHTML =
      '<div style="display:flex;justify-content:space-between;margin-bottom:3px;">'
      + '<span style="font-size:12px;color:var(--muted);">' + label + '</span>'
      + '<span style="font-size:12px;font-family:var(--mono);font-weight:600;color:var(--teal);">' + mins + ' min</span>'
      + '</div>'
      + '<div style="height:5px;background:var(--bg3);border-radius:3px;overflow:hidden;">'
      + '<div style="height:100%;border-radius:3px;background:linear-gradient(90deg,var(--teal),var(--accent));width:' + pct + '%;transition:width .4s;"></div>'
      + '</div>';
    list.appendChild(row);
  });
}

g('btnAddCardio').addEventListener('click', function() {
  var date = g('cardioDate').value.trim();
  var mins = parseInt(g('cardioMins').value);
  if (!date || isNaN(mins) || mins < 1) return;
  var type = g('cardioType').value || 'outro';
  cardioExtra.push({ d:date, t:mins, type:type });
  g('cardioDate').value = ''; g('cardioMins').value = '';
  refreshCardio();
  saveState();
});

g('cardioGoal').addEventListener('input',      function() { updateWeekGoal(); saveState(); });
g('cardioDailyGoal').addEventListener('input', function() { refreshCardio();  saveState(); });

// ── Construtor de Treinos (Zonas) ─────────────
var savedWorkouts = [];
var editingWktId  = null;
var builderSegs   = [];
var modalSegs     = [];

var ZONE_COLORS = { Z1:'#bfdbfe', Z2:'#93c5fd', Z3:'#4ade80', Z4:'#fbbf24', Z5:'#ff6b6b' };
var ZONE_LABELS = {
  Z1:'Muito Leve — Recuperação ativa',
  Z2:'Leve — Base aeróbica',
  Z3:'Moderado — Condicionamento',
  Z4:'Forte — Limiar de performance',
  Z5:'Muito Forte — Tiros curtos'
};

function zoneClass(z) { return z.toLowerCase() + '-row'; }
function segClass(z)  { return z.toLowerCase() + '-seg'; }

function renderTimeline(segs, containerId) {
  var el = g(containerId); el.innerHTML = '';
  var total = segs.reduce(function(a, s) { return a + s.mins; }, 0);
  if (!total) { el.style.background = 'var(--bg3)'; return; }
  el.style.background = 'transparent';
  segs.forEach(function(s) {
    var div = document.createElement('div');
    div.className = 'tl-seg ' + segClass(s.zone);
    div.style.flex = s.mins;
    div.title = s.zone + ' · ' + s.mins + 'min';
    if (s.mins >= 8) div.textContent = s.zone;
    el.appendChild(div);
  });
}

function updateBuilderTimeline() {
  renderTimeline(builderSegs, 'wktTimeline');
  var total = builderSegs.reduce(function(a, s) { return a + s.mins; }, 0);
  g('wktTotalMin').textContent = total ? total + ' min' : '';
}

function renderBuilderSegs() {
  var c = g('wktSegments'); c.innerHTML = '';
  builderSegs.forEach(function(s, i) { c.appendChild(makeSegRow(s, i, builderSegs, 'wktSegments', updateBuilderTimeline)); });
  updateBuilderTimeline();
}

function makeSegRow(s, i, arr, containerId, onUpdate) {
  var row = document.createElement('div');
  row.className = 'seg-row ' + zoneClass(s.zone);

  var tag = document.createElement('span');
  tag.className = 'seg-zone-tag'; tag.style.color = ZONE_COLORS[s.zone]; tag.textContent = s.zone;

  var desc = document.createElement('span');
  desc.className = 'seg-desc'; desc.textContent = ZONE_LABELS[s.zone];

  var inp = document.createElement('input');
  inp.type = 'number'; inp.min = '1'; inp.step = '1';
  inp.className = 'seg-min-input'; inp.value = s.mins;
  inp.addEventListener('input', function() { arr[i].mins = Math.max(1, parseInt(inp.value) || 1); onUpdate(); });

  var muLabel = document.createElement('span');
  muLabel.style.cssText = 'font-size:10px;color:var(--muted);white-space:nowrap;'; muLabel.textContent = 'min';

  var del = document.createElement('button');
  del.className = 'seg-del'; del.textContent = '×';
  del.addEventListener('click', function() {
    arr.splice(i, 1);
    if (containerId === 'wktSegments') renderBuilderSegs();
    else renderModalSegs();
  });

  row.appendChild(tag); row.appendChild(desc); row.appendChild(inp); row.appendChild(muLabel); row.appendChild(del);
  return row;
}

function addWktSegment(zone, mins) { builderSegs.push({ zone:zone, mins:mins }); renderBuilderSegs(); }

function clearBuilder() {
  builderSegs = []; g('wktName').value = '';
  g('wktBuilderTitle').textContent = 'Novo Treino'; editingWktId = null;
  renderBuilderSegs();
}

g('btnClearWkt').addEventListener('click', clearBuilder);

g('btnSaveWkt').addEventListener('click', function() {
  var name = g('wktName').value.trim() || 'Treino sem nome';
  if (!builderSegs.length) return;
  if (editingWktId) {
    var w = savedWorkouts.find(function(w) { return w.id === editingWktId; });
    if (w) { w.name = name; w.segs = JSON.parse(JSON.stringify(builderSegs)); }
    editingWktId = null; g('wktBuilderTitle').textContent = 'Novo Treino';
  } else {
    savedWorkouts.push({ id:uid(), name:name, segs:JSON.parse(JSON.stringify(builderSegs)) });
  }
  clearBuilder(); renderSavedWorkouts(); saveState();
});

function renderSavedWorkouts() {
  var c = g('savedWktsList');
  if (!savedWorkouts.length) {
    c.innerHTML = '<div style="font-size:12px;color:var(--muted);padding:4px 0;">Nenhum treino salvo ainda. Crie um acima ↑</div>';
    return;
  }
  c.innerHTML = '';
  savedWorkouts.forEach(function(w) {
    var total = w.segs.reduce(function(a, s) { return a + s.mins; }, 0);
    var card  = document.createElement('div'); card.className = 'wkt-card';

    var hdr = document.createElement('div'); hdr.className = 'wkt-card-header';
    var nm  = document.createElement('div'); nm.className  = 'wkt-card-name';  nm.textContent = w.name;
    var tt  = document.createElement('div'); tt.className  = 'wkt-card-total'; tt.textContent = total + ' min';
    hdr.appendChild(nm); hdr.appendChild(tt);

    var pills = document.createElement('div');
    pills.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;';
    var zoneMap = {};
    w.segs.forEach(function(s) { zoneMap[s.zone] = (zoneMap[s.zone] || 0) + s.mins; });
    Object.keys(zoneMap).sort().forEach(function(z) {
      var pill = document.createElement('span');
      pill.className   = 'zbadge ' + z.toLowerCase();
      pill.textContent = z + ' ' + zoneMap[z] + 'min';
      pills.appendChild(pill);
    });

    var tlWrap = document.createElement('div'); tlWrap.className = 'wkt-timeline'; tlWrap.id = 'tl-' + w.id;

    var segList = document.createElement('div');
    segList.style.cssText = 'margin-top:8px;display:flex;flex-direction:column;gap:4px;';
    w.segs.forEach(function(s) {
      var srow = document.createElement('div');
      srow.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:12px;';
      srow.innerHTML = '<span style="font-family:var(--mono);font-weight:700;color:' + ZONE_COLORS[s.zone] + ';">' + s.zone + '</span>'
        + '<span style="color:var(--muted);">' + ZONE_LABELS[s.zone] + '</span>'
        + '<span style="margin-left:auto;font-family:var(--mono);color:var(--text);">' + s.mins + ' min</span>';
      segList.appendChild(srow);
    });

    var acts = document.createElement('div'); acts.className = 'wkt-actions';

    var editBtn = document.createElement('button');
    editBtn.className = 'sec'; editBtn.style.cssText = 'font-size:11px;padding:5px 12px;'; editBtn.textContent = '✎ Editar';
    editBtn.addEventListener('click', function() {
      builderSegs = JSON.parse(JSON.stringify(w.segs)); g('wktName').value = w.name;
      g('wktBuilderTitle').textContent = 'Editando: ' + w.name; editingWktId = w.id;
      renderBuilderSegs(); g('wktName').scrollIntoView({ behavior:'smooth', block:'center' });
    });

    var delBtn = document.createElement('button');
    delBtn.className = 'sec'; delBtn.style.cssText = 'font-size:11px;padding:5px 12px;border-color:rgba(255,107,107,.3);color:var(--red);'; delBtn.textContent = '× Remover';
    delBtn.addEventListener('click', function() { savedWorkouts = savedWorkouts.filter(function(x){return x.id!==w.id;}); renderSavedWorkouts(); saveState(); });

    var logBtn = document.createElement('button');
    logBtn.style.cssText = 'font-size:11px;padding:5px 12px;background:linear-gradient(135deg,var(--teal),#2596be);border:none;';
    logBtn.textContent = '▶ Registrar no dia';
    logBtn.addEventListener('click', function() { openLogWktModal(w); });

    acts.appendChild(logBtn); acts.appendChild(editBtn); acts.appendChild(delBtn);
    card.appendChild(hdr); card.appendChild(pills); card.appendChild(tlWrap); card.appendChild(segList); card.appendChild(acts);
    c.appendChild(card);
    renderTimeline(w.segs, 'tl-' + w.id);
  });
}

// ── Modal edição de treino ────────────────────
function renderModalSegs() {
  var c = g('mWktSegments'); c.innerHTML = '';
  modalSegs.forEach(function(s, i) {
    c.appendChild(makeSegRow(s, i, modalSegs, 'mWktSegments', function() { renderTimeline(modalSegs, 'mWktTimeline'); }));
  });
  renderTimeline(modalSegs, 'mWktTimeline');
}
function addMWktSegment(zone, mins) { modalSegs.push({ zone:zone, mins:mins }); renderModalSegs(); }

g('btnCancelEditWkt').addEventListener('click', function() { g('mEditWkt').classList.remove('on'); });
g('btnConfirmEditWkt').addEventListener('click', function() {
  var name = g('mWktName').value.trim() || 'Treino';
  if (editingWktId) {
    var w = savedWorkouts.find(function(x) { return x.id === editingWktId; });
    if (w) { w.name = name; w.segs = JSON.parse(JSON.stringify(modalSegs)); }
    editingWktId = null;
  }
  g('mEditWkt').classList.remove('on'); renderSavedWorkouts(); saveState();
});

// ── Modal: registrar treino no Cardio ──────────
var logWktTarget = null;

function openLogWktModal(w) {
  logWktTarget = w;
  var total = w.segs.reduce(function(a, s) { return a + s.mins; }, 0);
  g('mLogWktTitle').textContent = 'Registrar: ' + w.name;
  g('mLogWktTotal').textContent = total + ' min';

  var tl = g('mLogWktTimeline'); tl.innerHTML = '';
  w.segs.forEach(function(s) {
    var div = document.createElement('div');
    div.className = 'tl-seg ' + segClass(s.zone); div.style.flex = s.mins;
    div.title = s.zone + ' · ' + s.mins + 'min';
    if (s.mins >= 8) div.textContent = s.zone;
    tl.appendChild(div);
  });

  var sl = g('mLogWktSegs'); sl.innerHTML = '';
  w.segs.forEach(function(s) {
    var row = document.createElement('div'); row.style.cssText = 'display:flex;align-items:center;gap:6px;';
    row.innerHTML = '<span style="font-family:var(--mono);font-weight:700;color:' + ZONE_COLORS[s.zone] + ';">' + s.zone + '</span>'
      + '<span style="color:var(--muted);flex:1;">' + ZONE_LABELS[s.zone] + '</span>'
      + '<span style="font-family:var(--mono);">' + s.mins + 'min</span>';
    sl.appendChild(row);
  });

  var now = new Date();
  g('mLogWktDate').value = String(now.getDate()).padStart(2,'0') + '/' + String(now.getMonth()+1).padStart(2,'0');
  g('mLogWkt').classList.add('on');
}

g('btnCancelLogWkt').addEventListener('click', function() { g('mLogWkt').classList.remove('on'); logWktTarget = null; });
g('btnConfirmLogWkt').addEventListener('click', function() {
  if (!logWktTarget) return;
  var date  = g('mLogWktDate').value.trim(); if (!date) return;
  var total = logWktTarget.segs.reduce(function(a,s){return a+s.mins;},0);
  cardioExtra.push({ d:date, t:total, type:'outro', wkt:logWktTarget.name });
  g('mLogWkt').classList.remove('on'); logWktTarget = null;
  refreshCardio(); saveState();
});
