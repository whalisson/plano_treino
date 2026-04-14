// ── GORILA GYM — app.js ──────────────────────
// Ponto de entrada: navegação, export/import e inicialização

// ── Navegação entre abas ──────────────────────
g('ntabs').addEventListener('click', function(e) {
  var tab = e.target.closest('.ntab'); if (!tab) return;
  var p   = tab.dataset.p;
  document.querySelectorAll('.ntab').forEach(function(t)  { t.classList.remove('on'); });
  document.querySelectorAll('.pg').forEach(function(pg)   { pg.classList.remove('on'); });
  tab.classList.add('on');
  g('pg-' + p).classList.add('on');
  if (p === 'cardio') buildCardioChart();
  if (p === 'periodizacao') setTimeout(scrollToCurrentWeek, 80);
});

// ── Export / Import de dados ──────────────────
function exportData() {
  var data = {
    _version:      1,
    _exportedAt:   new Date().toISOString(),
    rmSupino:      parseFloat(g('rm-supino').value) || BASE_SUP,
    rmAgacha:      parseFloat(g('rm-agacha').value) || BASE_AGA,
    rmTerra:       parseFloat(g('rm-terra').value)  || BASE_TER,
    checks:        checksState,
    rmTests:       rmTestValues,
    board:         board,
    bank:          bank,
    kgHistory:     kgHistory,
    cycleHistory:  cycleHistory,
    rmHistory:       rmHistory,
    cardioExtra:     cardioExtra,
    cardioGoal:      parseInt(g('cardioGoal').value)      || 300,
    cardioDailyGoal: parseInt(g('cardioDailyGoal').value) || 43,
    savedWorkouts: savedWorkouts,
    rpeBlocks:     rpeBlocks,
    customLifts:   customLifts,
    cycleStartDates: cycleStartDates,
  };
  var json  = JSON.stringify(data, null, 2);
  var blob  = new Blob([json], { type:'application/json' });
  var url   = URL.createObjectURL(blob);
  var a     = document.createElement('a');
  var d     = new Date();
  var stamp = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  a.href = url; a.download = 'gorila-gym-' + stamp + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

g('btnExport').addEventListener('click', exportData);

g('inputImport').addEventListener('change', function(e) {
  var file = e.target.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    try {
      var data = JSON.parse(ev.target.result);
      if (typeof data !== 'object' || data === null) throw new Error('invalid');
      customLifts = [];
      applyState(data);
      idbSet(RECORD_KEY, data).catch(function() {});
      g('inputImport').value = '';
      var btn  = g('btnExport');
      var orig = btn.textContent;
      btn.textContent = '✓ Importado!'; btn.style.color = 'var(--green)';
      setTimeout(function() { btn.textContent = orig; btn.style.color = ''; }, 2500);
    } catch(ex) {
      alert('Arquivo inválido. Verifique se é um backup do Gorila Gym.');
    }
  };
  reader.readAsText(file);
});

// ── Init: aplica estado salvo e renderiza tudo ─
function applyState(saved) {
  if (saved) {
    if (saved.rmSupino)       g('rm-supino').value = saved.rmSupino;
    if (saved.rmAgacha)       g('rm-agacha').value = saved.rmAgacha;
    if (saved.rmTerra)        g('rm-terra').value  = saved.rmTerra;
    if (saved.checks)         checksState      = saved.checks;
    if (saved.rmTests)        rmTestValues     = saved.rmTests;
    if (saved.board && saved.board.length === 7) board = saved.board;
    if (saved.bank)           bank             = saved.bank;
    if (saved.kgHistory)      kgHistory        = saved.kgHistory;
    if (saved.cycleHistory)   cycleHistory     = saved.cycleHistory;
    if (saved.rmHistory)        rmHistory                = saved.rmHistory;
    if (saved.cardioExtra)      cardioExtra              = saved.cardioExtra;
    if (saved.cardioGoal)       g('cardioGoal').value      = saved.cardioGoal;
    if (saved.cardioDailyGoal)  g('cardioDailyGoal').value = saved.cardioDailyGoal;
    if (saved.savedWorkouts)  savedWorkouts    = saved.savedWorkouts;
    if (saved.rpeBlocks)      rpeBlocks        = saved.rpeBlocks;
    if (saved.customLifts)    customLifts      = saved.customLifts;
    if (saved.cycleStartDates) cycleStartDates = saved.cycleStartDates;
  }
  buildAllPeriod();
  calcRM();
  renderCustomLifts();
  populateRMLiftSelect();
  renderRMHistory();
  renderKanban(); renderBank(); setupBankDropzone();
  renderPeriodGrid();
  renderProgressCharts();
  renderBuilderSegs();
  renderSavedWorkouts();
  renderCycleHistory();
  renderRPEBlocks();
  // Persiste após cada renderização do kanban
  // Só salva se houver ao menos um exercício no board OU se o estado salvo já foi carregado,
  // para evitar sobrescrever dados válidos com um board vazio em caso de falha no load.
  var _boardLoaded = !!(saved && saved.board);
  var _origRenderKanban = renderKanban;
  renderKanban = function() {
    _origRenderKanban();
    var hasItems = board.some(function(day) { return day.length > 0; });
    if (hasItems || _boardLoaded) saveState();
  };
}

loadState().then(applyState).catch(function() { applyState(null); });

// ── Scroll para semana atual na Periodização ──
function scrollToCurrentWeek() {
  var keys = ['supino', 'agacha', 'terra'];
  // Adicionar lifts customizados
  if (typeof customLifts !== 'undefined') {
    customLifts.forEach(function(l) { keys.push(l.id); });
  }

  var found = false;
  keys.forEach(function(k) {
    var psb = g('psb-' + k); if (!psb) return;
    var cur = psb.querySelector('.current-week');
    if (cur && !found) {
      // Expande a seção se estiver fechada
      if (!psb.classList.contains('on')) {
        psb.classList.add('on');
        var chev = g('chev-' + k);
        if (chev) chev.textContent = '▲';
      }
      setTimeout(function() {
        cur.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 60);
      found = true;
    }
  });
}

// ── Service Worker ────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./sw.js')
      .then(function(reg) { console.log('[SW] Registered:', reg.scope); })
      .catch(function(err) { console.warn('[SW] Registration failed:', err); });
  });
}
