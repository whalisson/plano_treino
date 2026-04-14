// ── GORILA GYM — rm.js ───────────────────────
// Calculadora de 1RM com 3 fórmulas (Brzycki, Epley, Mayhew) + histórico

var rmHistory  = [];
var _rmLastAvg = 0;

function calcRM() {
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

function populateRMLiftSelect() {
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

function saveRMRecord() {
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

function deleteRMRecord(id) {
  rmHistory = rmHistory.filter(function(r) { return r.id !== id; });
  renderRMHistory();
  saveState();
}

var rmHistChartInst = null;

function parseRMDate(dStr) {
  var p = dStr.split('/');
  return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
}

function renderRMHistory() {
  var section = g('rmHistorySection');
  if (!rmHistory.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';

  if (rmHistChartInst) { rmHistChartInst.destroy(); rmHistChartInst = null; }

  var lifts    = ['supino','agacha','terra'].concat((customLifts||[]).map(function(l){return l.id;}));
  var allDates = rmHistory.map(function(r){return r.date;});
  allDates = allDates.filter(function(v,i,a){return a.indexOf(v)===i;}).sort(function(a,b){
    return parseRMDate(a) - parseRMDate(b);
  });

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
}

populateRMLiftSelect();

g('btnSaveRM').addEventListener('click', saveRMRecord);
g('rmW').addEventListener('input', calcRM);
g('rmR').addEventListener('input', calcRM);

g('rmHistDate').addEventListener('input', function() {
  var digits = this.value.replace(/\D/g, '').slice(0, 8);
  var v = digits;
  if (digits.length > 4) v = digits.slice(0,2) + '/' + digits.slice(2,4) + '/' + digits.slice(4);
  else if (digits.length > 2) v = digits.slice(0,2) + '/' + digits.slice(2);
  this.value = v;
});
