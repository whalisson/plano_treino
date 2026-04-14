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
    repsCols.forEach(function(_col, ri) {
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

    var isCustom = !liftsRM.hasOwnProperty(ex.name);
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

    // Botão "+ Personalizado"
    var customBtn = document.createElement('button');
    customBtn.className = 'rpe-quick-btn' + (isCustom ? ' rpe-quick-active' : '');
    customBtn.textContent = '+ Personalizado';
    customBtn.addEventListener('click', function() {
      nameInput.value = ''; rmInput.value = '';
      ex.name = ''; ex.rm = 0;
      quickWrap.querySelectorAll('.rpe-quick-btn').forEach(function(b) { b.classList.remove('rpe-quick-active'); });
      customBtn.classList.add('rpe-quick-active');
      nameInput.focus();
      updateAllSetWeights();
    });
    quickWrap.appendChild(customBtn);

    var nameGrid = document.createElement('div');
    nameGrid.style.cssText = 'display:grid;grid-template-columns:1fr 88px;gap:8px;align-items:end;margin-bottom:10px;';

    var nameWrap = document.createElement('div'); nameWrap.innerHTML = '<label>Nome do exercício</label>';
    var nameInput = document.createElement('input');
    nameInput.type = 'text'; nameInput.value = ex.name; nameInput.placeholder = 'Ex: Supino';
    nameInput.addEventListener('input', function() {
      ex.name = this.value;
      if (!liftsRM.hasOwnProperty(this.value)) {
        quickWrap.querySelectorAll('.rpe-quick-btn').forEach(function(b) { b.classList.remove('rpe-quick-active'); });
        customBtn.classList.add('rpe-quick-active');
      }
    });
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

    var trainBtn = document.createElement('button');
    trainBtn.style.cssText = 'font-size:11px;padding:5px 12px;background:rgba(74,222,128,.15);border:1px solid rgba(74,222,128,.3);color:var(--green);';
    trainBtn.textContent = '▶ Treinar';
    trainBtn.addEventListener('click', function() { openExecRPEModal(blk); });

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

    acts.appendChild(trainBtn); acts.appendChild(planBtn); acts.appendChild(editBtn); acts.appendChild(dupBtn); acts.appendChild(delBtn);

    // Histórico de execuções
    if (blk.execHistory && blk.execHistory.length) {
      var histWrap = document.createElement('div');
      histWrap.className = 'rpe-blk-hist';

      var histToggle = document.createElement('div');
      histToggle.className = 'rpe-blk-hist-toggle';
      histToggle.innerHTML = '<span class="rpe-blk-hist-chev">▶</span> Histórico '
        + '<span class="rpe-blk-hist-count">' + blk.execHistory.length + ' treino' + (blk.execHistory.length !== 1 ? 's' : '') + '</span>';

      var histBody = document.createElement('div');
      histBody.className = 'rpe-blk-hist-body';

      blk.execHistory.slice().reverse().slice(0, 5).forEach(function(exec) {
        var d       = new Date(exec.date);
        var dateStr = d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' });

        var row = document.createElement('div');
        row.className = 'rpe-blk-hist-row';

        var dateEl = document.createElement('div');
        dateEl.className = 'rpe-blk-hist-date';
        dateEl.textContent = dateStr;
        row.appendChild(dateEl);

        exec.exercises.forEach(function(ex) {
          var filled = ex.sets.filter(function(s) { return s.realRpe !== null; });
          if (!filled.length) return;
          var avg = filled.reduce(function(a, s) { return a + s.realRpe; }, 0) / filled.length;
          var rmChanged = ex.rmAfter && ex.rmBefore && ex.rmAfter !== ex.rmBefore;

          var exRow = document.createElement('div');
          exRow.className = 'rpe-blk-hist-exrow';
          exRow.innerHTML = '<span class="rpe-blk-hist-exname">' + ex.name + '</span>'
            + '<span class="rpe-blk-hist-pill">' + filled.length + '/' + ex.sets.length + ' séries</span>'
            + '<span class="rpe-blk-hist-pill" style="color:' + getRPEColor(Math.round(avg)) + ';border-color:' + getRPEColor(Math.round(avg)).replace('#','rgba(') + '44);">RPE ' + avg.toFixed(1) + '</span>'
            + (rmChanged ? '<span class="rpe-blk-hist-rm">↑RM ' + ex.rmBefore + '→' + ex.rmAfter + ' kg</span>' : '');
          row.appendChild(exRow);
        });

        histBody.appendChild(row);
      });

      histToggle.addEventListener('click', function() {
        histBody.classList.toggle('show');
        histToggle.classList.toggle('open');
      });

      histWrap.appendChild(histToggle);
      histWrap.appendChild(histBody);
    }

    card.appendChild(hdr);
    card.appendChild(exWrap);
    if (blk.execHistory && blk.execHistory.length) card.appendChild(histWrap);
    card.appendChild(acts);
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

// ── RPE Execution Tracking ────────────────────
var execRPETarget = null;
var execStates    = {}; // exIdx → { rm, setRpes[], setTargetRpes[] }

function openExecRPEModal(blk) {
  execRPETarget = blk;
  execStates    = {};
  g('mExecRPETitle').textContent = blk.name;
  var today  = new Date();
  var days   = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  var months = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  g('mExecRPEDate').textContent = days[today.getDay()] + ', ' + today.getDate() + ' de ' + months[today.getMonth()];
  buildExecRPEBody(blk);
  g('mExecRPE').classList.add('on');
}

function buildExecRPEBody(blk) {
  var body = g('mExecRPEBody');
  body.innerHTML = '';

  blk.exercises.forEach(function(ex, exIdx) {
    // Expandir séries (count × {reps, rpe}) em linhas individuais
    var expandedSets = [];
    ex.sets.forEach(function(s) {
      var w = ex.rm ? calcRPEWeight(ex.rm, s.rpe, s.reps) : null;
      for (var i = 0; i < s.count; i++) {
        expandedSets.push({ reps: s.reps, targetRpe: s.rpe, kg: w ? w.rounded : 0 });
      }
    });

    execStates[exIdx] = {
      rm:            ex.rm,
      setRpes:       expandedSets.map(function() { return null; }),
      setTargetRpes: expandedSets.map(function(s) { return s.targetRpe; }),
      setKgs:        expandedSets.map(function(s) { return s.kg; }),
      setRepsArr:    expandedSets.map(function(s) { return s.reps; }),
    };

    var primaryTarget = ex.sets.length ? ex.sets[0].rpe : 8;
    var card = document.createElement('div');
    card.className = 'exec-ex-card';

    // Cabeçalho: nome + badge RM
    var hdr = document.createElement('div');
    hdr.className = 'exec-ex-header';
    hdr.innerHTML =
      '<div>'
      + '<div class="exec-ex-name">' + ex.name + '</div>'
      + '<div class="exec-ex-sub">' + expandedSets.length + ' série' + (expandedSets.length !== 1 ? 's' : '') + ' · RPE alvo: ' + primaryTarget + '</div>'
      + '</div>'
      + '<div class="exec-rm-badge" id="exec-rm-badge-' + exIdx + '" onclick="toggleExecRM(' + exIdx + ')">RM: <span id="exec-rm-val-' + exIdx + '">' + ex.rm + ' kg</span></div>';

    // Header colunas
    var setsHdr = document.createElement('div');
    setsHdr.className = 'exec-sets-header';
    setsHdr.innerHTML = '<span>série</span><span>kg</span><span>reps</span><span>RPE real</span>';

    // Linhas de série
    var setsWrap = document.createElement('div');
    expandedSets.forEach(function(s, si) {
      var row = document.createElement('div');
      row.className = 'exec-set-row';

      var kgLabel = s.kg ? s.kg + ' kg' : '—';

      // Botões RPE: 5 a 10
      var rpeBtnsHtml = '';
      for (var r = 5; r <= 10; r++) {
        rpeBtnsHtml += '<div class="exec-rpe-btn" data-rpe="' + r + '" onclick="setExecRPE(' + exIdx + ',' + si + ',' + r + ')">' + r + '</div>';
      }

      row.innerHTML =
        '<span class="exec-set-num">' + (si + 1) + '</span>'
        + '<span class="exec-set-val">' + kgLabel + '</span>'
        + '<span class="exec-set-val">' + s.reps + '</span>'
        + '<div class="exec-rpe-btns" id="exec-rpe-btns-' + exIdx + '-' + si + '">' + rpeBtnsHtml + '</div>';

      setsWrap.appendChild(row);
    });

    // Alerta automático
    var alertBox = document.createElement('div');
    alertBox.className = 'exec-alert';
    alertBox.id = 'exec-alert-' + exIdx;
    alertBox.innerHTML =
      '<div class="exec-alert-icon">↑</div>'
      + '<div><div class="exec-alert-title">Você ficou mais forte!</div>'
      + '<div class="exec-alert-text">Abaixo do RPE alvo em 2+ séries. Estimado: <strong id="exec-alert-rm-' + exIdx + '"></strong></div>'
      + '<button class="exec-update-btn" onclick="toggleExecRM(' + exIdx + ')">Recalcular RM</button></div>';

    // Painel calculadora RM
    var rmInit = ex.rm || 100;
    var rmPanel = document.createElement('div');
    rmPanel.className = 'exec-rm-panel';
    rmPanel.id = 'exec-rm-panel-' + exIdx;
    rmPanel.innerHTML =
      '<div class="exec-rm-panel-title">Calculadora de RM estimado</div>'
      + '<div class="exec-rm-row"><span class="exec-rm-label">Peso (kg)</span>'
      + '<input type="range" class="exec-rm-slider" min="20" max="400" value="' + rmInit + '" step="2.5" id="exec-calc-kg-' + exIdx + '" oninput="calcExecRM(' + exIdx + ')">'
      + '<span class="exec-rm-value" id="exec-calc-kg-out-' + exIdx + '">' + rmInit + ' kg</span></div>'
      + '<div class="exec-rm-row"><span class="exec-rm-label">Reps</span>'
      + '<input type="range" class="exec-rm-slider" min="1" max="10" value="1" step="1" id="exec-calc-reps-' + exIdx + '" oninput="calcExecRM(' + exIdx + ')">'
      + '<span class="exec-rm-value" id="exec-calc-reps-out-' + exIdx + '">1 rep</span></div>'
      + '<div class="exec-rm-row"><span class="exec-rm-label">RPE real</span>'
      + '<input type="range" class="exec-rm-slider" min="5" max="10" value="8" step="0.5" id="exec-calc-rpe-' + exIdx + '" oninput="calcExecRM(' + exIdx + ')">'
      + '<span class="exec-rm-value" id="exec-calc-rpe-out-' + exIdx + '">RPE 8</span></div>'
      + '<div class="exec-rm-result">'
      + '<div><div class="exec-rm-result-label">RM estimado</div><div class="exec-rm-result-value" id="exec-calc-result-' + exIdx + '">—</div></div>'
      + '<div style="text-align:right"><div class="exec-rm-result-label">RM atual</div>'
      + '<div style="font-size:12px;color:var(--muted);" id="exec-old-rm-out-' + exIdx + '">' + ex.rm + ' kg</div>'
      + '<div class="exec-rm-result-diff" id="exec-rm-diff-' + exIdx + '"></div></div>'
      + '</div>'
      + '<button class="exec-save-rm-btn" onclick="saveExecRM(' + exIdx + ')">Salvar novo RM</button>';

    card.appendChild(hdr);
    card.appendChild(setsHdr);
    card.appendChild(setsWrap);
    card.appendChild(alertBox);
    card.appendChild(rmPanel);
    body.appendChild(card);

    calcExecRM(exIdx);
  });
}

function setExecRPE(exIdx, setIdx, rpe) {
  var state = execStates[exIdx]; if (!state) return;
  state.setRpes[setIdx] = rpe;
  var targetRpe = state.setTargetRpes[setIdx];

  var container = g('exec-rpe-btns-' + exIdx + '-' + setIdx);
  if (!container) return;
  container.querySelectorAll('.exec-rpe-btn').forEach(function(btn) {
    var btnRpe = parseFloat(btn.getAttribute('data-rpe'));
    btn.className = 'exec-rpe-btn';
    if (btnRpe === rpe) {
      btn.className = rpe < targetRpe ? 'exec-rpe-btn exec-rpe-low' : 'exec-rpe-btn exec-rpe-active';
    }
  });

  checkExecRPELow(exIdx);
}

function checkExecRPELow(exIdx) {
  var state = execStates[exIdx]; if (!state) return;
  var lowCount = state.setRpes.filter(function(r, i) {
    return r !== null && r < state.setTargetRpes[i];
  }).length;

  var alertEl = g('exec-alert-' + exIdx);
  if (lowCount >= 2) {
    // Melhor estimativa de RM dentre as séries preenchidas
    var bestRM = state.rm;
    state.setRpes.forEach(function(r, si) {
      if (r === null) return;
      var kg   = state.setKgs[si]    || 0;
      var reps = state.setRepsArr[si] || 1;
      if (kg > 0) { var est = estimateExecRM(kg, reps, r); if (est > bestRM) bestRM = est; }
    });
    var bestEl = g('exec-alert-rm-' + exIdx);
    if (bestEl) bestEl.textContent = '~' + bestRM + ' kg';

    // Pré-preencher calculadora com a série de menor RPE (mais folga)
    var loIdx = -1, loRpe = 99;
    state.setRpes.forEach(function(r, i) { if (r !== null && r < loRpe) { loRpe = r; loIdx = i; } });
    if (loIdx >= 0) {
      var kg   = state.setKgs[loIdx]    || state.rm;
      var reps = state.setRepsArr[loIdx] || 1;
      var slKg  = g('exec-calc-kg-' + exIdx);
      var slRps = g('exec-calc-reps-' + exIdx);
      var slRpe = g('exec-calc-rpe-' + exIdx);
      if (slKg)  slKg.value  = kg;
      if (slRps) slRps.value = reps;
      if (slRpe) slRpe.value = loRpe;
      calcExecRM(exIdx);
    }
    alertEl.classList.add('show');
  } else {
    alertEl.classList.remove('show');
  }
}

function estimateExecRM(kg, reps, rpe) {
  var f = getRPEFactor(rpe, reps);
  return f && kg ? Math.round(kg / f) : Math.round(kg);
}

function toggleExecRM(exIdx) {
  var panel = g('exec-rm-panel-' + exIdx); if (!panel) return;
  panel.classList.toggle('show');
  if (panel.classList.contains('show')) calcExecRM(exIdx);
}

function calcExecRM(exIdx) {
  var state = execStates[exIdx]; if (!state) return;
  var kg   = parseFloat(g('exec-calc-kg-' + exIdx).value)   || state.rm || 100;
  var reps = parseInt(g('exec-calc-reps-' + exIdx).value)   || 1;
  var rpe  = parseFloat(g('exec-calc-rpe-' + exIdx).value)  || 8;

  var outKg   = g('exec-calc-kg-out-' + exIdx);
  var outReps = g('exec-calc-reps-out-' + exIdx);
  var outRpe  = g('exec-calc-rpe-out-' + exIdx);
  if (outKg)   outKg.textContent   = kg + ' kg';
  if (outReps) outReps.textContent = reps + (reps === 1 ? ' rep' : ' reps');
  if (outRpe)  outRpe.textContent  = 'RPE ' + rpe;

  var est    = estimateExecRM(kg, reps, rpe);
  var resEl  = g('exec-calc-result-' + exIdx);
  var oldEl  = g('exec-old-rm-out-'  + exIdx);
  var diffEl = g('exec-rm-diff-'     + exIdx);
  if (resEl)  resEl.textContent  = est + ' kg';
  if (oldEl)  oldEl.textContent  = state.rm + ' kg';
  if (diffEl) {
    var diff = est - state.rm;
    diffEl.textContent = (diff >= 0 ? '+' : '') + diff + ' kg';
    diffEl.style.color = diff > 0 ? 'var(--green)' : diff < 0 ? 'var(--red)' : 'var(--muted)';
  }
}

function saveExecRM(exIdx) {
  var state = execStates[exIdx]; if (!state) return;
  var resEl = g('exec-calc-result-' + exIdx);
  var newRM = resEl ? parseInt(resEl.textContent) : 0;
  if (!newRM || isNaN(newRM)) return;

  state.rm = newRM;

  // Persistir no bloco
  if (execRPETarget) {
    execRPETarget.exercises[exIdx].rm = newRM;
    var blkRef = rpeBlocks.find(function(b) { return b.id === execRPETarget.id; });
    if (blkRef && blkRef.exercises[exIdx]) blkRef.exercises[exIdx].rm = newRM;
    saveState();
    renderRPEBlocks();
  }

  // Atualizar badge + fechar painel/alerta
  var valEl = g('exec-rm-val-' + exIdx);  if (valEl) valEl.textContent = newRM + ' kg';
  var oldEl = g('exec-old-rm-out-' + exIdx); if (oldEl) oldEl.textContent = newRM + ' kg';
  g('exec-rm-panel-' + exIdx).classList.remove('show');
  g('exec-alert-' + exIdx).classList.remove('show');

  showExecToast('RM atualizado para ' + newRM + ' kg');
}

function showExecToast(msg) {
  var toast = g('execToast'); if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(function() { toast.classList.remove('show'); }, 2500);
}

g('btnCloseExecRPE').addEventListener('click', function() {
  g('mExecRPE').classList.remove('on');
  execRPETarget = null;
  execStates    = {};
});

function concludeExecRPE() {
  if (!execRPETarget) return;

  var execEntry = {
    date:      Date.now(),
    exercises: execRPETarget.exercises.map(function(ex, exIdx) {
      var state = execStates[exIdx] || {};
      var sets  = (state.setRpes || []).map(function(rpe, si) {
        return {
          kg:        state.setKgs      ? state.setKgs[si]      : 0,
          reps:      state.setRepsArr  ? state.setRepsArr[si]  : 0,
          targetRpe: state.setTargetRpes ? state.setTargetRpes[si] : null,
          realRpe:   rpe,
        };
      });
      return { name: ex.name, rmBefore: ex.rm, rmAfter: state.rm || ex.rm, sets: sets };
    }),
  };

  var blkRef = rpeBlocks.find(function(b) { return b.id === execRPETarget.id; });
  if (blkRef) {
    if (!blkRef.execHistory) blkRef.execHistory = [];
    blkRef.execHistory.push(execEntry);
    blkRef.lastUsed = execEntry.date;
    saveState();
    renderRPEBlocks();
  }

  g('mExecRPE').classList.remove('on');
  execRPETarget = null;
  execStates    = {};
  showExecToast('Treino concluído e salvo!');
}
