// ── GORILA GYM — rpe.js ──────────────────────
// Blocos de treino por RPE e integração com Logbook

var RPE_ROWS  = [10,9.5,9,8.5,8,7.5,7,6.5,6,5.5,5,4.5,4,3.5,3];
var RPE_TABLE = {
  10:  [1,     0.955, 0.922, 0.892, 0.863, 0.837, 0.811, 0.786, 0.762, 0.739, 0.707, 0.680, 0.653, 0.626, 0.599],
  9.5: [0.9775,0.9385,0.907, 0.8775,0.850, 0.824, 0.7985,0.774, 0.7505,0.723, 0.6935,0.6665,0.6395,0.6125,0.5855],
  9:   [0.955, 0.922, 0.892, 0.863, 0.837, 0.811, 0.786, 0.762, 0.739, 0.707, 0.680, 0.653, 0.626, 0.599, 0.572],
  8.5: [0.9385,0.907, 0.8775,0.850, 0.824, 0.7985,0.774, 0.7505,0.723, 0.6935,0.6665,0.6395,0.6125,0.5855,0.5585],
  8:   [0.922, 0.892, 0.863, 0.837, 0.811, 0.786, 0.762, 0.739, 0.707, 0.680, 0.653, 0.626, 0.599, 0.572, 0.545],
  7.5: [0.907, 0.8775,0.850, 0.824, 0.7985,0.774, 0.7505,0.723, 0.6935,0.6665,0.6395,0.6125,0.5855,0.5585,0.5315],
  7:   [0.892, 0.863, 0.837, 0.811, 0.786, 0.762, 0.739, 0.707, 0.680, 0.653, 0.626, 0.599, 0.572, 0.545, 0.518],
  6.5: [0.8775,0.850, 0.824, 0.7985,0.774, 0.7505,0.723, 0.6935,0.6665,0.6395,0.6125,0.5855,0.5585,0.5315,0.5045],
  6:   [0.863, 0.837, 0.811, 0.786, 0.762, 0.739, 0.707, 0.680, 0.653, 0.626, 0.599, 0.572, 0.545, 0.518, 0.491],
  5.5: [0.850, 0.824, 0.7985,0.774, 0.7505,0.723, 0.6935,0.6665,0.6395,0.6125,0.5855,0.5585,0.5315,0.5045,0.4775],
  5:   [0.837, 0.811, 0.786, 0.762, 0.739, 0.707, 0.680, 0.653, 0.626, 0.599, 0.572, 0.545, 0.518, 0.491, 0.464],
  4.5: [0.824, 0.7985,0.774, 0.7505,0.723, 0.6935,0.6665,0.6395,0.6125,0.5855,0.5585,0.5315,0.5045,0.4775,0.4505],
  4:   [0.811, 0.786, 0.762, 0.739, 0.707, 0.680, 0.653, 0.626, 0.599, 0.572, 0.545, 0.518, 0.491, 0.464, 0.437],
  3.5: [0.7985,0.774, 0.7505,0.723, 0.6935,0.6665,0.6395,0.6125,0.5855,0.5585,0.5315,0.5045,0.4775,0.4505,0.4235],
  3:   [0.786, 0.762, 0.739, 0.707, 0.680, 0.653, 0.626, 0.599, 0.572, 0.545, 0.518, 0.491, 0.464, 0.437, 0.410],
};

var rpeBlocks           = [];
var rpeCurrentExercises = [];
var editingRPEBlockId   = null;

function getRPEFactor(rpe, reps) {
  var row = RPE_TABLE[parseFloat(rpe)]; if (!row) return null;
  return row[Math.min(Math.max(parseInt(reps) - 1, 0), 14)];
}
function calcRPEWeight(rm, rpe, reps) {
  var f = getRPEFactor(rpe, reps); if (!f || !rm) return null;
  var exact   = rm * f;
  var rounded = Math.round(exact / 2.5) * 2.5;
  return { exact:exact, rounded:rounded };
}
function getRPEColor(rpe) {
  var r = parseFloat(rpe);
  if (r >= 9.5) return '#ff6b6b';
  if (r >= 8.5) return '#a59eff';
  if (r >= 7.5) return '#fbbf24';
  if (r >= 6.5) return '#2dd4bf';
  return '#8a8898';
}

function toggleRPETable() {
  var psb  = g('psb-rpetable');
  var chev = g('chev-rpetable');
  if (psb.classList.contains('on')) { psb.classList.remove('on'); chev.textContent = '▼'; }
  else { psb.classList.add('on'); chev.textContent = '▲'; buildRPERefTable(); }
}

function buildRPERefTable() {
  var wrap = g('rpe-table-wrap');
  if (!wrap || wrap.innerHTML) return;
  var repsCols = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
  var html = '<table class="rpe-ref-table"><thead><tr><th>RPE</th><th>RIR</th>';
  repsCols.forEach(function(r) { html += '<th>' + r + '</th>'; });
  html += '</tr></thead><tbody>';
  RPE_ROWS.forEach(function(rpe) {
    var rir    = 10 - rpe;
    var rirStr = Number.isInteger(rir) ? rir : rir.toFixed(1);
    var color  = getRPEColor(rpe);
    html += '<tr><td class="rpe-cell-rpe" style="color:' + color + ';">' + rpe + '</td><td class="rpe-cell-rir">' + rirStr + '</td>';
    repsCols.forEach(function(col, ri) {
      var f   = RPE_TABLE[rpe][ri];
      var pct = (Math.round(f * 1000) / 10).toFixed(1);
      var op  = (0.45 + f * 0.55).toFixed(2);
      html += '<td style="opacity:' + op + ';color:' + color + ';">' + pct + '%</td>';
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  wrap.innerHTML = html;
}

function getCurrentLiftsRM() {
  return {
    'Supino':      parseFloat(g('rm-supino').value) || 0,
    'Agachamento': parseFloat(g('rm-agacha').value) || 0,
    'Terra':       parseFloat(g('rm-terra').value)  || 0,
  };
}

function makeRPESetRow(set, getRm) {
  var row = document.createElement('div');
  row.className = 'rpe-set-row';

  var rpeOpts = RPE_ROWS.map(function(r) {
    return '<option value="' + r + '"' + (parseFloat(set.rpe) === r ? ' selected' : '') + '>' + r + '</option>';
  }).join('');

  var initW    = calcRPEWeight(getRm(), set.rpe, set.reps);
  var initWStr = initW ? initW.rounded + ' kg' : '—';

  row.innerHTML =
    '<input class="rpe-count-input" type="number" value="' + set.count + '" min="1" max="20" title="Séries">'
    + '<span class="rpe-x">×</span>'
    + '<input class="rpe-reps-input" type="number" value="' + set.reps + '" min="1" max="15" title="Repetições">'
    + '<span class="rpe-at">@</span>'
    + '<select class="rpe-rpe-select" title="RPE">' + rpeOpts + '</select>'
    + '<span class="rpe-eq">=</span>'
    + '<span class="rpe-weight">' + initWStr + '</span>'
    + '<button class="rpe-set-del" title="Remover série">×</button>';

  function recalc() {
    var rpe  = parseFloat(row.querySelector('.rpe-rpe-select').value);
    var reps = parseInt(row.querySelector('.rpe-reps-input').value) || 1;
    var w    = calcRPEWeight(getRm(), rpe, reps);
    row.querySelector('.rpe-weight').textContent = w ? w.rounded + ' kg' : '—';
    row.querySelector('.rpe-weight').style.color = getRPEColor(rpe);
  }

  row.querySelector('.rpe-rpe-select').addEventListener('change', recalc);
  row.querySelector('.rpe-reps-input').addEventListener('input',  recalc);
  row.querySelector('.rpe-set-del').addEventListener('click', function() { row.remove(); });
  row.querySelector('.rpe-weight').style.color = getRPEColor(set.rpe);
  return row;
}

function renderRPEExercises() {
  var list     = g('rpeExerciseList'); list.innerHTML = '';
  var liftsRM  = getCurrentLiftsRM();

  rpeCurrentExercises.forEach(function(ex, exIdx) {
    var card = document.createElement('div'); card.className = 'rpe-ex-card';

    var hdr     = document.createElement('div'); hdr.className = 'rpe-ex-header';
    var titleEl = document.createElement('span'); titleEl.className = 'rpe-ex-title'; titleEl.textContent = 'Exercício ' + (exIdx + 1);
    var delBtn  = document.createElement('button');
    delBtn.className = 'sec'; delBtn.style.cssText = 'font-size:11px;padding:3px 9px;border-color:rgba(255,107,107,.3);color:var(--red);'; delBtn.textContent = '× Remover';
    delBtn.addEventListener('click', function() { rpeCurrentExercises.splice(exIdx, 1); renderRPEExercises(); });
    hdr.appendChild(titleEl); hdr.appendChild(delBtn);

    var quickWrap = document.createElement('div');
    quickWrap.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:9px;';
    Object.keys(liftsRM).forEach(function(liftName) {
      var btn = document.createElement('button');
      btn.className   = 'rpe-quick-btn' + (ex.name === liftName ? ' rpe-quick-active' : '');
      btn.textContent = liftName;
      btn.addEventListener('click', function() {
        var rm = getCurrentLiftsRM()[liftName];
        nameInput.value = liftName; rmInput.value = rm;
        ex.name = liftName; ex.rm = rm;
        quickWrap.querySelectorAll('.rpe-quick-btn').forEach(function(b) { b.classList.remove('rpe-quick-active'); });
        btn.classList.add('rpe-quick-active');
        updateAllSetWeights();
      });
      quickWrap.appendChild(btn);
    });

    var nameGrid = document.createElement('div');
    nameGrid.style.cssText = 'display:grid;grid-template-columns:1fr 88px;gap:8px;align-items:end;margin-bottom:10px;';

    var nameWrap = document.createElement('div'); nameWrap.innerHTML = '<label>Nome do exercício</label>';
    var nameInput = document.createElement('input');
    nameInput.type = 'text'; nameInput.value = ex.name; nameInput.placeholder = 'Ex: Supino';
    nameInput.addEventListener('input', function() { ex.name = this.value; });
    nameWrap.appendChild(nameInput);

    var rmWrap = document.createElement('div'); rmWrap.innerHTML = '<label>1RM (kg)</label>';
    var rmInput = document.createElement('input');
    rmInput.type = 'number'; rmInput.value = ex.rm; rmInput.step = '0.5'; rmInput.min = '0';
    rmInput.addEventListener('input', function() { ex.rm = parseFloat(this.value) || 0; updateAllSetWeights(); });
    rmWrap.appendChild(rmInput);

    nameGrid.appendChild(nameWrap); nameGrid.appendChild(rmWrap);

    var setsLabel = document.createElement('div');
    setsLabel.className = 'rpe-col-hdr';
    setsLabel.innerHTML = '<span style="width:44px;">Séries</span><span style="width:12px;"></span><span style="width:44px;">Reps</span><span style="width:12px;"></span><span style="width:74px;">RPE</span>';

    var setsContainer = document.createElement('div'); setsContainer.className = 'rpe-sets-list';

    function getRm() { return parseFloat(rmInput.value) || 0; }
    function updateAllSetWeights() {
      setsContainer.querySelectorAll('.rpe-set-row').forEach(function(row) {
        var rpe  = parseFloat(row.querySelector('.rpe-rpe-select').value);
        var reps = parseInt(row.querySelector('.rpe-reps-input').value) || 1;
        var w    = calcRPEWeight(getRm(), rpe, reps);
        row.querySelector('.rpe-weight').textContent = w ? w.rounded + ' kg' : '—';
        row.querySelector('.rpe-weight').style.color = getRPEColor(rpe);
      });
    }

    ex.sets.forEach(function(set) { setsContainer.appendChild(makeRPESetRow(set, getRm)); });

    var addSetBtn = document.createElement('button');
    addSetBtn.className = 'sec'; addSetBtn.style.cssText = 'font-size:11px;padding:4px 11px;margin-top:6px;'; addSetBtn.textContent = '+ Série';
    addSetBtn.addEventListener('click', function() {
      var lastRow    = setsContainer.querySelector('.rpe-set-row:last-child');
      var defaultRpe = lastRow ? parseFloat(lastRow.querySelector('.rpe-rpe-select').value) : 8;
      var defaultReps = lastRow ? (parseInt(lastRow.querySelector('.rpe-reps-input').value) || 5) : 5;
      setsContainer.appendChild(makeRPESetRow({ id:uid(), count:3, reps:defaultReps, rpe:defaultRpe }, getRm));
    });

    card.appendChild(hdr); card.appendChild(quickWrap); card.appendChild(nameGrid);
    card.appendChild(setsLabel); card.appendChild(setsContainer); card.appendChild(addSetBtn);
    list.appendChild(card);
  });
}

g('btnAddRPEEx').addEventListener('click', function() {
  var rm = getCurrentLiftsRM();
  rpeCurrentExercises.push({ id:uid(), name:'Supino', rm:rm['Supino']||0, sets:[{id:uid(),count:3,reps:5,rpe:8}] });
  renderRPEExercises();
});

g('btnClearRPEBlock').addEventListener('click', function() {
  rpeCurrentExercises = []; g('rpeBlockName').value = '';
  g('rpeBuilderTitle').textContent = 'Novo Bloco de Treino'; editingRPEBlockId = null;
  renderRPEExercises();
});

g('btnSaveRPEBlock').addEventListener('click', function() {
  var blockName = g('rpeBlockName').value.trim() || 'Bloco';
  var list      = g('rpeExerciseList');
  if (!list.children.length) return;

  var exercises = [];
  Array.from(list.children).forEach(function(card, ci) {
    var nameVal = card.querySelector('input[type=text]').value.trim() || (rpeCurrentExercises[ci] && rpeCurrentExercises[ci].name) || 'Exercício';
    var rmVal   = parseFloat(card.querySelector('input[type=number]').value) || 0;
    var sets    = [];
    card.querySelectorAll('.rpe-set-row').forEach(function(row) {
      sets.push({ count:parseInt(row.querySelector('.rpe-count-input').value)||1, reps:parseInt(row.querySelector('.rpe-reps-input').value)||1, rpe:parseFloat(row.querySelector('.rpe-rpe-select').value) });
    });
    if (sets.length) exercises.push({ name:nameVal, rm:rmVal, sets:sets });
  });
  if (!exercises.length) return;

  if (editingRPEBlockId) {
    var blk = rpeBlocks.find(function(b) { return b.id === editingRPEBlockId; });
    if (blk) { blk.name = blockName; blk.exercises = exercises; }
    editingRPEBlockId = null;
  } else {
    rpeBlocks.push({ id:uid(), name:blockName, exercises:exercises, createdAt:Date.now() });
  }

  rpeCurrentExercises = []; g('rpeBlockName').value = '';
  g('rpeBuilderTitle').textContent = 'Novo Bloco de Treino';
  renderRPEExercises(); renderRPEBlocks(); saveState();
});

function renderRPEBlocks() {
  var list = g('rpeBlocksList'); list.innerHTML = '';
  if (!rpeBlocks.length) {
    list.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:10px 0;">Nenhum bloco salvo. Monte um bloco acima e clique em "Salvar Bloco".</div>';
    return;
  }
  rpeBlocks.slice().reverse().forEach(function(blk) {
    var card = document.createElement('div'); card.className = 'rpe-blk-card';

    var hdr = document.createElement('div'); hdr.className = 'rpe-blk-header';
    var createdStr = blk.createdAt ? new Date(blk.createdAt).toLocaleDateString('pt-BR') : '';
    var lastUsedStr = blk.lastUsed ? ' · último uso ' + new Date(blk.lastUsed).toLocaleDateString('pt-BR') : '';
    hdr.innerHTML = '<span class="rpe-blk-name">' + blk.name + '</span>'
      + '<span class="rpe-blk-count">' + blk.exercises.length + ' exercício' + (blk.exercises.length !== 1 ? 's' : '')
      + (createdStr ? ' · criado ' + createdStr : '') + lastUsedStr + '</span>';

    var exWrap = document.createElement('div'); exWrap.className = 'rpe-blk-exercises';
    blk.exercises.forEach(function(ex) {
      var exEl = document.createElement('div'); exEl.className = 'rpe-blk-ex';
      var setsHtml = ex.sets.map(function(s) {
        var w    = calcRPEWeight(ex.rm, s.rpe, s.reps);
        var wStr = w ? w.rounded + ' kg' : '—';
        var col  = getRPEColor(s.rpe);
        return '<span class="rpe-blk-set" style="color:' + col + ';border-color:' + col.replace('#','rgba(') + '33);">'
          + s.count + '×' + s.reps + ' @RPE' + s.rpe + ' = ' + wStr + '</span>';
      }).join('');
      exEl.innerHTML = '<div class="rpe-blk-ex-name">' + ex.name + '<span class="rpe-blk-rm">1RM: ' + ex.rm + ' kg</span></div>'
        + '<div class="rpe-blk-sets">' + setsHtml + '</div>';
      exWrap.appendChild(exEl);
    });

    var acts = document.createElement('div'); acts.className = 'rpe-blk-actions';

    var planBtn = document.createElement('button');
    planBtn.style.cssText = 'font-size:11px;padding:5px 12px;background:linear-gradient(135deg,rgba(108,99,255,.25),rgba(45,212,191,.2));border:1px solid rgba(108,99,255,.4);color:#a59eff;';
    planBtn.textContent = '📅 Planejar';
    planBtn.addEventListener('click', function() { openPlanRPEModal(blk); });

    var editBtn = document.createElement('button');
    editBtn.className = 'sec'; editBtn.style.cssText = 'font-size:11px;padding:5px 12px;'; editBtn.textContent = '✎ Editar';
    editBtn.addEventListener('click', function() {
      editingRPEBlockId = blk.id; g('rpeBlockName').value = blk.name;
      g('rpeBuilderTitle').textContent = 'Editando: ' + blk.name;
      rpeCurrentExercises = blk.exercises.map(function(ex) {
        return { id:uid(), name:ex.name, rm:ex.rm, sets:ex.sets.map(function(s){return {id:uid(),count:s.count,reps:s.reps,rpe:s.rpe};}) };
      });
      renderRPEExercises();
      g('pg-rpe').querySelector('.card').scrollIntoView({ behavior:'smooth', block:'start' });
    });

    var dupBtn = document.createElement('button');
    dupBtn.className = 'sec'; dupBtn.style.cssText = 'font-size:11px;padding:5px 12px;'; dupBtn.textContent = '⧉ Duplicar';
    dupBtn.addEventListener('click', function() {
      var copy = JSON.parse(JSON.stringify(blk)); copy.id = uid(); copy.name = blk.name + ' (cópia)'; copy.createdAt = Date.now();
      rpeBlocks.push(copy); renderRPEBlocks(); saveState();
    });

    var delBtn = document.createElement('button');
    delBtn.className = 'sec'; delBtn.style.cssText = 'font-size:11px;padding:5px 12px;border-color:rgba(255,107,107,.3);color:var(--red);'; delBtn.textContent = '× Remover';
    delBtn.addEventListener('click', function() { rpeBlocks = rpeBlocks.filter(function(b){return b.id!==blk.id;}); renderRPEBlocks(); saveState(); });

    acts.appendChild(planBtn); acts.appendChild(editBtn); acts.appendChild(dupBtn); acts.appendChild(delBtn);
    card.appendChild(hdr); card.appendChild(exWrap); card.appendChild(acts);
    list.appendChild(card);
  });
}

// ── RPE → Logbook ─────────────────────────────
var planRPETarget = null;

function openPlanRPEModal(blk) {
  planRPETarget = blk;
  var totalSets = blk.exercises.reduce(function(a, ex) {
    return a + ex.sets.reduce(function(b, s) { return b + s.count; }, 0);
  }, 0);
  g('mPlanRPEName').textContent = blk.name
    + ' · ' + blk.exercises.length + ' exercício' + (blk.exercises.length !== 1 ? 's' : '')
    + ' · ' + totalSets + ' série' + (totalSets !== 1 ? 's' : '');
  g('mPlanRPE').classList.add('on');
}

g('btnCancelPlanRPE').addEventListener('click', function() { g('mPlanRPE').classList.remove('on'); planRPETarget = null; });

g('btnConfirmPlanRPE').addEventListener('click', function() {
  if (!planRPETarget) return;
  // registrar data da última execução
  var blkRef = rpeBlocks.find(function(b) { return b.id === planRPETarget.id; });
  if (blkRef) { blkRef.lastUsed = Date.now(); saveState(); }
  var dayIdx   = parseInt(g('mPlanRPEDay').value);
  var blk      = planRPETarget;
  var setsLabel = blk.exercises.map(function(ex) {
    return ex.sets.map(function(s) { return s.count + '×' + s.reps + '@RPE' + s.rpe; }).join(', ');
  }).join(' / ');
  board[dayIdx].push({ id:uid(), srcId:null, name:blk.name, kg:0, reps:setsLabel, isRPEBlock:true });
  g('mPlanRPE').classList.remove('on'); planRPETarget = null;
  renderKanban(); renderPeriodGrid();
  // Navegar para o Logbook
  document.querySelectorAll('.ntab').forEach(function(t) { t.classList.remove('on'); });
  document.querySelectorAll('.pg').forEach(function(pg) { pg.classList.remove('on'); });
  var logTab = document.querySelector('[data-p="logbook"]');
  if (logTab) logTab.classList.add('on');
  var logPage = g('pg-logbook');
  if (logPage) logPage.classList.add('on');
});
