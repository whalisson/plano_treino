function uid(){return Math.random().toString(36).slice(2,9);}
function g(id){return document.getElementById(id);}

// ── NAV ─────────────────────────────────────────
g('ntabs').addEventListener('click',function(e){
  var tab=e.target.closest('.ntab'); if(!tab) return;
  var p=tab.dataset.p;
  document.querySelectorAll('.ntab').forEach(function(t){t.classList.remove('on');});
  document.querySelectorAll('.pg').forEach(function(pg){pg.classList.remove('on');});
  tab.classList.add('on');
  g('pg-'+p).classList.add('on');
  if(p==='bike'){ buildBikeChart(); }
});

// ══════════════════════════════════════════════════════════════════════════════
// PERIODIZAÇÃO - LÓGICA CORRIGIDA conforme planilha original
// ══════════════════════════════════════════════════════════════════════════════

var BASE_SUP = 74, BASE_AGA = 93, BASE_TER = 110;

// SUPINO - Periodização completa (semanas 1-10)
var supBase = [
  {label:'Semana 1', series:[{r:'8 reps',p:.50},{r:'5 reps',p:.55},{r:'6x4',p:.60}]},
  {label:'Semana 2', series:[{r:'8 reps',p:.50},{r:'5 reps',p:.55},{r:'6x4',p:.65}]},
  {label:'Semana 3', series:[{r:'8 reps',p:.50},{r:'5 reps',p:.55},{r:'5x4',p:.70}]},
  {label:'Semana 4', series:[{r:'8 reps',p:.30},{r:'5 reps',p:.55},{r:'5 reps',p:.60},{r:'4x4',p:.75}]},
  {label:'Semana 5', series:[{r:'8 reps',p:.50},{r:'5 reps',p:.53},{r:'4 reps',p:.65},{r:'4x3',p:.80}]},
  {label:'Semana 6', series:[{r:'8 reps',p:.50},{r:'5 reps',p:.55},{r:'3 reps',p:.70},{r:'3x3',p:.85}]},
  {label:'Semana 7', series:[{r:'8 reps',p:.50},{r:'5 reps',p:.55},{r:'3 reps',p:.70},{r:'2 reps',p:.80},{r:'2x2',p:.90}]},
  {label:'Semana 8', series:[{r:'8 reps',p:.50},{r:'5 reps',p:.55},{r:'6x3',p:.70}]},
  {label:'Semana 9', rest:true, note:'Descanso'},
  {label:'Semana 10',series:[{r:'8 reps',p:.50},{r:'5 reps',p:.60},{r:'3 reps',p:.70},{r:'2 reps',p:.80},{r:'1 rep',p:.90},{r:'1 rep',p:1.00},{r:'? reps',p:1.05}], note:'Teste Novo RM'},
];

// AGACHAMENTO - Periodização completa (semanas 1-10)
var agaBase = [
  {label:'Semana 1', series:[{r:'8 reps',p:.50},{r:'5 reps',p:.55},{r:'6x4',p:.60}]},
  {label:'Semana 2', series:[{r:'8 reps',p:.50},{r:'5 reps',p:.55},{r:'6x4',p:.65}]},
  {label:'Semana 3', series:[{r:'8 reps',p:.50},{r:'5 reps',p:.55},{r:'5x4',p:.70}]},
  {label:'Semana 4', series:[{r:'8 reps',p:.30},{r:'5 reps',p:.55},{r:'5 reps',p:.60},{r:'4x4',p:.75}]},
  {label:'Semana 5', series:[{r:'8 reps',p:.50},{r:'5 reps',p:.53},{r:'4 reps',p:.65},{r:'4x3',p:.80}]},
  {label:'Semana 6', series:[{r:'8 reps',p:.50},{r:'5 reps',p:.55},{r:'3 reps',p:.70},{r:'3x3',p:.85}]},
  {label:'Semana 7', series:[{r:'8 reps',p:.50},{r:'5 reps',p:.55},{r:'3 reps',p:.70},{r:'2 reps',p:.80},{r:'2x2',p:.90}]},
  {label:'Semana 8', series:[{r:'8 reps',p:.50},{r:'5 reps',p:.55},{r:'6x3',p:.70}]},
  {label:'Semana 9', rest:true, note:'Descanso'},
  {label:'Semana 10',series:[{r:'8 reps',p:.50},{r:'5 reps',p:.60},{r:'3 reps',p:.70},{r:'2 reps',p:.80},{r:'1 rep',p:.90},{r:'1 rep',p:1.00},{r:'? reps',p:1.05}], note:'Teste Novo RM'},
];

// TERRA - Periodização completa (semanas 1-11)
var terBase = [
  {label:'Semana 1', series:[{r:'8 reps',p:.50},{r:'5 reps',p:.55},{r:'6x4',p:.60}]},
  {label:'Semana 2', series:[{r:'8 reps',p:.50},{r:'5 reps',p:.55},{r:'6x4',p:.65}]},
  {label:'Semana 3', series:[{r:'8 reps',p:.50},{r:'5 reps',p:.55},{r:'5x4',p:.70}]},
  {label:'Semana 4', series:[{r:'8 reps',p:.30},{r:'5 reps',p:.55},{r:'5 reps',p:.60},{r:'4x4',p:.75}]},
  {label:'Semana 5', series:[{r:'8 reps',p:.50},{r:'5 reps',p:.53},{r:'4 reps',p:.65},{r:'4x3',p:.80}]},
  {label:'Semana 6', series:[{r:'8 reps',p:.50},{r:'5 reps',p:.55},{r:'3 reps',p:.70},{r:'3x3',p:.85}]},
  {label:'Semana 7', series:[{r:'8 reps',p:.50},{r:'5 reps',p:.55},{r:'3 reps',p:.70},{r:'2 reps',p:.80},{r:'2x2',p:.90}]},
  {label:'Semana 8', series:[{r:'8 reps',p:.50},{r:'5 reps',p:.55},{r:'6x3',p:.70}]},
  {label:'Semana 9', rest:true, note:'Descanso'},
  {label:'Semana 10',series:[{r:'8 reps',p:.50},{r:'5 reps',p:.60},{r:'3 reps',p:.70},{r:'2 reps',p:.80},{r:'1 rep',p:.90},{r:'1 rep',p:1.00},{r:'? reps',p:1.05}], note:'Teste Novo RM'},
  {label:'Semana 11', rest:true, note:'Descansar 1 Semana e Repetir'},
];

// ══════════════════════════════════════════════════════════════════════════════
// PERSISTENCE — IndexedDB
// ══════════════════════════════════════════════════════════════════════════════
var DB_NAME = 'gorila-gym';
var DB_VERSION = 1;
var STORE_NAME = 'state';
var RECORD_KEY = 'main';
var _db = null;

function openDB(){
  return new Promise(function(resolve, reject){
    if(_db){ resolve(_db); return; }
    var req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = function(e){
      var db = e.target.result;
      if(!db.objectStoreNames.contains(STORE_NAME)){
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = function(e){ _db = e.target.result; resolve(_db); };
    req.onerror = function(){ reject(req.error); };
  });
}

function idbSet(key, value){
  return openDB().then(function(db){
    return new Promise(function(resolve, reject){
      var tx = db.transaction(STORE_NAME, 'readwrite');
      var st = tx.objectStore(STORE_NAME);
      var req = st.put(value, key);
      req.onsuccess = function(){ resolve(); };
      req.onerror = function(){ reject(req.error); };
    });
  });
}

function idbGet(key){
  return openDB().then(function(db){
    return new Promise(function(resolve, reject){
      var tx = db.transaction(STORE_NAME, 'readonly');
      var st = tx.objectStore(STORE_NAME);
      var req = st.get(key);
      req.onsuccess = function(){ resolve(req.result); };
      req.onerror = function(){ reject(req.error); };
    });
  });
}

// Debounce saves — avoid hammering IDB on every keystroke
var _saveTimer = null;
function saveState(){
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(function(){
    var data = {
      rmSupino: parseFloat(g('rm-supino').value)||BASE_SUP,
      rmAgacha: parseFloat(g('rm-agacha').value)||BASE_AGA,
      rmTerra:  parseFloat(g('rm-terra').value)||BASE_TER,
      checks:   checksState,
      rmTests:  rmTestValues,
      board:    board,
      bank:     bank,
      kgHistory:kgHistory,
      cycleHistory:cycleHistory,
      bikeExtra:bikeExtra,
      bikeGoal: parseInt(g('bikeGoal').value)||300,
      bikeDailyGoal: parseInt(g('bikeDailyGoal').value)||43,
      savedWorkouts:savedWorkouts,
    };
    idbSet(RECORD_KEY, data).catch(function(e){
      // Fallback to localStorage if IDB fails
      try{ localStorage.setItem('gorila_fallback', JSON.stringify(data)); }catch(ex){}
    });
  }, 400);
}

// loadState is now async — returns a Promise
function loadState(){
  return idbGet(RECORD_KEY).then(function(data){
    if(data) return data;
    // Migrate from old localStorage if IDB is empty
    try{
      var lsRaw = localStorage.getItem('treino_v2') || localStorage.getItem('gorila_fallback');
      if(lsRaw){
        var parsed = JSON.parse(lsRaw);
        // Migrate: save to IDB and clear localStorage
        idbSet(RECORD_KEY, parsed).then(function(){
          localStorage.removeItem('treino_v2');
          localStorage.removeItem('gorila_fallback');
        });
        return parsed;
      }
    }catch(ex){}
    return null;
  }).catch(function(){
    // IDB unavailable — fallback to localStorage
    try{
      var raw = localStorage.getItem('treino_v2');
      return raw ? JSON.parse(raw) : null;
    }catch(e){ return null; }
  });
}

// checksState[lift][weekIdx][serIdx] = bool
var checksState = {supino:{}, agacha:{}, terra:{}};
// rmTestValues[lift][weekIdx] = kg value entered by user
var rmTestValues = {supino:{}, agacha:{}, terra:{}};
// kgHistory[exId] = [{date, kg, name}]  — one point per edit
var kgHistory = {};
// cycleHistory = [{lift, rmStart, rmEnd, dateStart, dateEnd}]
var cycleHistory = [];

function round05(v){ return Math.round(v*2)/2; }

// Parse "NxM" patterns to get total checkbox count
function parseSetCount(rStr){
  // "6x4" -> 6 sets, "4x3" -> 4 sets, "3x3" -> 3 sets, "2x2" -> 2 sets, "6x3" -> 6 sets, "5x4" -> 5 sets, "4x4" -> 4 sets
  var m = rStr.match(/^(\d+)x(\d+)$/);
  if(m) return parseInt(m[1]);
  // "? reps" = 1 box (RM test attempt)
  return 1;
}

function buildWeekTable(baseWeeks, tid, liftKey, rm){
  var c=g(tid); if(!c) return;
  c.innerHTML='';

  // Detect current week: first non-rest week that isn't fully done,
  // but only if all previous non-rest weeks are done (or it has at least 1 check)
  var currentWeekIdx = -1;
  var allPrevDone = true;
  baseWeeks.forEach(function(w, wi){
    if(w.rest) return;
    var totalChecks=0;
    w.series.forEach(function(s){ totalChecks+=parseSetCount(s.r); });
    var state=checksState[liftKey][wi]||{};
    var done=Object.values(state).filter(Boolean).length;
    var weekDone=done>=totalChecks;
    var hasAnyCheck=done>0;

    if(currentWeekIdx===-1){
      if(!weekDone){
        // This is current if: all previous done, OR it has at least one check
        if(allPrevDone || hasAnyCheck) currentWeekIdx=wi;
      }
    }
    if(!weekDone) allPrevDone=false;
  });

  baseWeeks.forEach(function(w, wi){
    if(w.rest){
      var restEl=document.createElement('div');
      restEl.style.cssText='background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.2);border-radius:9px;padding:9px 13px;margin-bottom:9px;font-size:13px;color:var(--amber);';
      restEl.textContent='🏖️ '+w.label+(w.note?' — '+w.note:'');
      c.appendChild(restEl);
      return;
    }

    // Compute total checkboxes for this week
    var totalChecks=0;
    w.series.forEach(function(s){
      totalChecks+=parseSetCount(s.r);
    });

    if(!checksState[liftKey][wi]) checksState[liftKey][wi]={};
    var weekState=checksState[liftKey][wi];
    var doneCount=Object.values(weekState).filter(Boolean).length;
    var weekDone=(doneCount>=totalChecks);
    var isCurrent=(wi===currentWeekIdx);

    // Week block
    var block=document.createElement('div');
    var blockClass='week-block'+(weekDone?' completed':'')+(isCurrent?' current-week':'');
    block.className=blockClass;
    block.id='wb-'+liftKey+'-'+wi;

    // Header
    var hdr=document.createElement('div');
    hdr.className='week-header';
    hdr.innerHTML='<span class="week-header-label">'+w.label+'</span>';
    if(isCurrent && !weekDone) hdr.innerHTML+='<span class="week-current-badge">▶ Em andamento</span>';
    if(weekDone) hdr.innerHTML+='<span class="week-done-badge">✓ Concluída</span>';
    if(w.note && !weekDone && !isCurrent) hdr.innerHTML+='<span class="week-header-note">'+w.note+'</span>';

    // Progress bar
    var progWrap=document.createElement('div');
    progWrap.className='week-header-progress';
    progWrap.innerHTML='<span class="week-prog-text">'+doneCount+'/'+totalChecks+'</span>'
      +'<div class="week-prog-bar"><div class="week-prog-fill'+(weekDone?' done':'')+'" id="pf-'+liftKey+'-'+wi+'" style="width:'+Math.round(doneCount/totalChecks*100)+'%"></div></div>';
    hdr.appendChild(progWrap);
    block.appendChild(hdr);

    // Column header
    var colHdr=document.createElement('div');
    colHdr.className='week-cols';
    colHdr.innerHTML='<span>Série</span><span>Carga</span><span>% RM</span><span style="text-align:right;">Sets</span>';
    block.appendChild(colHdr);

    // Series rows
    var checkIdx=0;
    w.series.forEach(function(s,si){
      var isQreps = s.r==='? reps';
      var isLast  = si===w.series.length-1;
      var isMainSet = w.series.length>2 && isLast && !isQreps;
      var numChecks = parseSetCount(s.r);
      var kg = round05(rm*s.p);
      var pctDisplay = Math.round(s.p*100)+'%';

      var row=document.createElement('div');
      row.className='series-row'+(isMainSet?' main-set':'')+(isQreps?' rm-test-set':'');
      if(si<w.series.length-1) row.style.borderBottom='1px solid var(--border)';
      else row.style.borderBottom='none';

      // Label
      var lbl=document.createElement('span');
      lbl.className='ser-label';
      lbl.style.color=isQreps?'var(--green)':isMainSet?'var(--text)':'var(--muted)';
      lbl.textContent=s.r;
      row.appendChild(lbl);

      // Kg
      var kgSpan=document.createElement('span');
      kgSpan.className='ser-kg';
      kgSpan.style.fontWeight=(isMainSet||isQreps)?600:400;
      kgSpan.style.color=isQreps?'var(--green)':isMainSet?'var(--accent)':'var(--text)';
      kgSpan.textContent=kg+' kg';
      row.appendChild(kgSpan);

      // Pct
      var pctSpan=document.createElement('span');
      pctSpan.className='ser-pct';
      pctSpan.textContent=pctDisplay;
      row.appendChild(pctSpan);

      // Checkboxes / RM test input
      var checksWrap=document.createElement('div');
      checksWrap.className='ser-checks';
      checksWrap.style.justifyContent='flex-end';

      if(isQreps){
        // RM test: input + update button
        var testWrap=document.createElement('div');
        testWrap.className='rm-test-input-wrap';

        var inp=document.createElement('input');
        inp.type='number'; inp.step='0.5'; inp.min='0';
        inp.className='rm-test-inline';
        inp.placeholder='—';
        inp.title='Novo RM (kg)';
        var savedTest=rmTestValues[liftKey][wi];
        if(savedTest) inp.value=savedTest;

        var updBtn=document.createElement('button');
        updBtn.className='rm-update-btn'+(savedTest?' visible':'');
        updBtn.innerHTML='↑ Atualizar RM';
        updBtn.title='Substituir RM principal pelo novo valor';

        inp.addEventListener('input',function(){
          var v=parseFloat(inp.value);
          if(v>0){
            rmTestValues[liftKey][wi]=v;
            updBtn.classList.add('visible');
          } else {
            updBtn.classList.remove('visible');
          }
          saveState();
        });

        updBtn.addEventListener('click',function(){
          var v=parseFloat(inp.value);
          if(!v||v<=0) return;
          var rmId={supino:'rm-supino',agacha:'rm-agacha',terra:'rm-terra'}[liftKey];
          var rmStart=parseFloat(g(rmId).value)||0;
          var rmEnd=v;

          // Save cycle before resetting
          if(rmStart>0){
            var today=new Date();
            var dd=String(today.getDate()).padStart(2,'0');
            var mm=String(today.getMonth()+1).padStart(2,'0');
            var yyyy=today.getFullYear();
            var dateEnd=dd+'/'+mm+'/'+yyyy;

            // ── PR Detection (before push so history is clean) ──
            var isPR = rmEnd > rmStart;
            var prevBest = cycleHistory
              .filter(function(c){ return c.lift===liftKey; })
              .reduce(function(max,c){ return Math.max(max, c.rmEnd); }, 0);
            var isAllTime = isPR && (prevBest===0 || rmEnd > prevBest);

            cycleHistory.push({
              lift: liftKey,
              rmStart: rmStart,
              rmEnd: rmEnd,
              gain: Math.round((rmEnd-rmStart)*10)/10,
              dateEnd: dateEnd,
              id: uid()
            });
            renderCycleHistory();

            // Show PR banner
            if(isPR){
              var liftColors={supino:'#a59eff',agacha:'#2dd4bf',terra:'#fbbf24'};
              var liftLabels={supino:'Supino',agacha:'Agachamento',terra:'Terra'};
              showPRBanner(liftLabels[liftKey], liftColors[liftKey], rmStart, rmEnd, isAllTime);
            }
          }

          g(rmId).value=v;
          // Clear all checkboxes for this lift
          checksState[liftKey]={};
          rmTestValues[liftKey]={};
          buildAllPeriod();
          saveState();
          // Flash the RM input
          var rmEl=g(rmId);
          rmEl.style.transition='color .3s';
          rmEl.style.color='var(--green)';
          setTimeout(function(){rmEl.style.color='';},1200);
        });

        // Also a single checkbox to mark "done"
        var cbWrap=makeCbEl(liftKey, wi, 0, weekState, totalChecks, block, liftKey);
        testWrap.appendChild(inp);
        testWrap.appendChild(updBtn);
        checksWrap.appendChild(cbWrap);
        checksWrap.appendChild(testWrap);
      } else {
        for(var ci=0; ci<numChecks; ci++){
          var cbKey=checkIdx+ci;
          checksWrap.appendChild(makeCbEl(liftKey, wi, cbKey, weekState, totalChecks, block, liftKey));
        }
      }
      checkIdx+=numChecks;

      row.appendChild(checksWrap);
      block.appendChild(row);
    });

    c.appendChild(block);
  });
}

function makeCbEl(liftKey, wi, cbKey, weekState, totalChecks, blockEl, lift){
  var label=document.createElement('label');
  label.className='set-cb';
  label.title='Marcar série concluída';

  var inp=document.createElement('input');
  inp.type='checkbox';
  inp.checked=!!weekState[cbKey];

  var box=document.createElement('span');
  box.className='set-cb-box';
  box.innerHTML='<svg class="set-cb-check" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  inp.addEventListener('change',function(){
    weekState[cbKey]=inp.checked;
    checksState[liftKey][wi]=weekState;
    // Recount
    var done=Object.values(weekState).filter(Boolean).length;
    var allDone=(done>=totalChecks);
    var pf=document.getElementById('pf-'+liftKey+'-'+wi);
    if(pf){
      pf.style.width=Math.round(done/totalChecks*100)+'%';
      if(allDone) pf.classList.add('done'); else pf.classList.remove('done');
    }
    // Update text counter
    var progTxt=blockEl.querySelector('.week-prog-text');
    if(progTxt) progTxt.textContent=done+'/'+totalChecks;
    // Handle completion
    if(allDone && !blockEl.classList.contains('completed')){
      blockEl.classList.add('completed');
      // add done badge if not present
      var hdr=blockEl.querySelector('.week-header');
      if(hdr && !hdr.querySelector('.week-done-badge')){
        var badge=document.createElement('span');
        badge.className='week-done-badge';
        badge.textContent='✓ Concluída';
        hdr.insertBefore(badge, hdr.children[1]||null);
      }
    } else if(!allDone){
      blockEl.classList.remove('completed');
      var badge=blockEl.querySelector('.week-done-badge');
      if(badge) badge.remove();
    }
    saveState();
  });

  label.appendChild(inp);
  label.appendChild(box);
  return label;
}

function buildAllPeriod(){
  var sup=parseFloat(g('rm-supino').value)||BASE_SUP;
  var aga=parseFloat(g('rm-agacha').value)||BASE_AGA;
  var ter=parseFloat(g('rm-terra').value)||BASE_TER;
  buildWeekTable(supBase,'tbl-supino','supino',sup);
  buildWeekTable(agaBase,'tbl-agacha','agacha',aga);
  buildWeekTable(terBase,'tbl-terra','terra',ter);
}

['rm-supino','rm-agacha','rm-terra'].forEach(function(id){
  g(id).addEventListener('input',function(){buildAllPeriod();saveState();});
});

['supino','agacha','terra'].forEach(function(k){
  g('psh-'+k).addEventListener('click',function(){
    var b=g('psb-'+k),open=b.classList.toggle('on');
    g('chev-'+k).textContent=open?'▲':'▼';
  });
});

// ── KANBAN DATA ────────────────────────────────
var DAYS=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
var board=DAYS.map(function(){return [];});
var bank=[
  {id:uid(),name:'Elev. Lateral Halt.',kg:25,reps:'3x12'},
  {id:uid(),name:'Crux. Inv. Máquina',kg:20,reps:'3x12'},
  {id:uid(),name:'Elev. Lat. Máquina',kg:95,reps:'3x10'},
  {id:uid(),name:'Hip Thrust',kg:135,reps:'3x10'},
  {id:uid(),name:'Flexora',kg:200,reps:'3x10'},
  {id:uid(),name:'Bulgaro Uni.',kg:0,reps:'3x8'},
  {id:uid(),name:'Maq. Puxada',kg:60,reps:'3x10'},
  {id:uid(),name:'Maq. Remada',kg:55,reps:'3x10'},
  {id:uid(),name:'Low Row',kg:85,reps:'3x10'},
];

// ── DRAG & DROP ───────────────────────────────
var dragItem=null;
var dragGhost=null;
var isTouch=('ontouchstart' in window||navigator.maxTouchPoints>0);

// ── TOUCH DRAG SUPPORT ────────────────────────
var touchGhost=null;
var touchLastTarget=null;
var touchScrollBlocked=false;
var touchLongPressTimer=null;
var LONG_PRESS_MS=400;
var autoScrollRAF=null;
var autoScrollVel=0;

function runAutoScroll(){
  if(autoScrollVel!==0&&dragItem){
    window.scrollBy(0,autoScrollVel);
    autoScrollRAF=requestAnimationFrame(runAutoScroll);
  } else {
    autoScrollRAF=null;
  }
}
function stopAutoScroll(){
  autoScrollVel=0;
  if(autoScrollRAF){cancelAnimationFrame(autoScrollRAF);autoScrollRAF=null;}
}

function createTouchGhost(el){
  var ghost=el.cloneNode(true);
  var rect=el.getBoundingClientRect();
  ghost.style.cssText='position:fixed;left:'+rect.left+'px;top:'+rect.top+'px;width:'+rect.width+'px;'
    +'opacity:.75;pointer-events:none;z-index:9999;transform:scale(1.05);'
    +'box-shadow:0 8px 24px rgba(0,0,0,.5);transition:none;border-radius:8px;';
  document.body.appendChild(ghost);
  return ghost;
}

function getTouchDropTarget(x,y){
  if(touchGhost) touchGhost.style.display='none';
  var el=document.elementFromPoint(x,y);
  if(touchGhost) touchGhost.style.display='';
  if(!el) return null;
  // Find closest column (.kcol) or bank (#ebank)
  var col=el.closest('.kcol');
  if(col) return col;
  var bk=el.closest('#ebank');
  if(bk) return bk;
  return null;
}

function addTouchDrag(el, getItemFn){
  var startX, startY, moved=false;

  el.addEventListener('touchstart',function(e){
    // se o toque foi em um botão (ou filho de botão), ignora — deixa o clique funcionar normalmente
    if(e.target.closest('button')) return;
    moved=false;
    var t=e.touches[0];
    startX=t.clientX; startY=t.clientY;
    // Long-press to start drag
    touchLongPressTimer=setTimeout(function(){
      if(window.getSelection) window.getSelection().removeAllRanges();
      dragItem=getItemFn();
      touchGhost=createTouchGhost(el);
      el.classList.add('dragging');
      touchScrollBlocked=true;
    }, LONG_PRESS_MS);
  },{passive:true});

  // bloqueia menu de contexto (long-press nativo no Android/iOS) fora de botões
  el.addEventListener('contextmenu',function(e){if(!e.target.closest('button'))e.preventDefault();});

  el.addEventListener('touchmove',function(e){
    // Se o toque começou num botão (startX nunca foi definido), ignora completamente
    if(startX===undefined) return;
    var t=e.touches[0];
    var dx=t.clientX-startX, dy=t.clientY-startY;
    if(!touchScrollBlocked && Math.abs(dx)<6 && Math.abs(dy)<6) return;
    moved=true;
    if(!dragItem){
      clearTimeout(touchLongPressTimer);
      return;
    }
    e.preventDefault();
    // Auto-scroll contínuo via RAF quando dedo perto da borda
    var EDGE=100;
    var vy=t.clientY;
    var vh=window.innerHeight;
    var newVel=0;
    if(vy<EDGE) newVel=-Math.max(4,Math.round((EDGE-vy)/8));
    else if(vy>vh-EDGE) newVel=Math.max(4,Math.round((vy-(vh-EDGE))/8));
    autoScrollVel=newVel;
    if(newVel!==0&&!autoScrollRAF) autoScrollRAF=requestAnimationFrame(runAutoScroll);
    // Move ghost
    if(touchGhost){
      touchGhost.style.left=(t.clientX-touchGhost.offsetWidth/2)+'px';
      touchGhost.style.top=(t.clientY-touchGhost.offsetHeight/2)+'px';
    }
    // Highlight drop target
    var target=getTouchDropTarget(t.clientX,t.clientY);
    if(target!==touchLastTarget){
      if(touchLastTarget){
        touchLastTarget.classList.remove('drag-over');
        touchLastTarget.style.borderColor='';
      }
      if(target){
        if(target.classList.contains('kcol')) target.classList.add('drag-over');
        else target.style.borderColor='var(--accent)';
      }
      touchLastTarget=target;
    }
  },{passive:false});

  el.addEventListener('touchend',function(e){
    clearTimeout(touchLongPressTimer);
    stopAutoScroll();
    touchScrollBlocked=false;
    if(touchGhost){touchGhost.remove();touchGhost=null;}
    el.classList.remove('dragging');
    if(touchLastTarget){
      touchLastTarget.classList.remove('drag-over');
      touchLastTarget.style.borderColor='';
    }
    if(!dragItem){dragItem=null;touchLastTarget=null;return;}
    var t=e.changedTouches[0];
    var target=getTouchDropTarget(t.clientX,t.clientY);
    if(target){
      if(target.classList.contains('kcol')){
        var cols=Array.from(document.querySelectorAll('.kcol'));
        var di=cols.indexOf(target);
        if(di>=0){
          if(dragItem.type==='bank'){
            var ex=bank.find(function(b){return b.id===dragItem.id;});
            if(ex) board[di].push({id:uid(),srcId:ex.id,name:ex.name,kg:ex.kg,reps:ex.reps});
          } else if(dragItem.type==='board'){
            if(dragItem.fromDay!==di){
              var item=board[dragItem.fromDay].splice(dragItem.fromIdx,1)[0];
              if(item) board[di].push(item);
            }
          }
          renderKanban();renderPeriodGrid();
        }
      } else if(target.id==='ebank'){
        if(dragItem.type==='board'){
          board[dragItem.fromDay].splice(dragItem.fromIdx,1);
          renderKanban();renderPeriodGrid();
        }
      }
    }
    dragItem=null;
    touchLastTarget=null;
  },{passive:true});

  el.addEventListener('touchcancel',function(){
    clearTimeout(touchLongPressTimer);
    stopAutoScroll();
    touchScrollBlocked=false;
    if(touchGhost){touchGhost.remove();touchGhost=null;}
    el.classList.remove('dragging');
    if(touchLastTarget){touchLastTarget.classList.remove('drag-over');touchLastTarget.style.borderColor='';}
    dragItem=null;touchLastTarget=null;
  },{passive:true});
}

function makeBankPill(ex){
  var el=document.createElement('div');
  el.className='bpill';
  el.dataset.exid=ex.id;
  el.style.position='relative';
  el.style.paddingRight='52px';

  var info=document.createElement('div');
  info.innerHTML='<div class="bpname">'+ex.name+'</div><div class="bpmeta">'+(ex.kg>0?ex.kg+'kg · ':'')+ex.reps+'</div>';
  info.draggable=false;
  el.appendChild(info);

  // Action buttons
  var acts=document.createElement('div');
  acts.style.cssText='position:absolute;top:50%;right:6px;transform:translateY(-50%);display:flex;gap:3px;';

  var editBtn=document.createElement('button');
  editBtn.textContent='✎';
  editBtn.title='Editar';
  editBtn.style.cssText='background:rgba(108,99,255,.18);border:1px solid rgba(108,99,255,.35);color:#a59eff;font-size:13px;padding:6px 9px;border-radius:5px;cursor:pointer;line-height:1;touch-action:manipulation;';
  editBtn.addEventListener('click',function(e){e.stopPropagation();openEditModal(ex.id);});
  editBtn.addEventListener('touchstart',function(e){e.stopPropagation();},{passive:true});
  editBtn.addEventListener('touchend',function(e){e.stopPropagation();e.preventDefault();openEditModal(ex.id);},{passive:false});

  var delBtn=document.createElement('button');
  delBtn.textContent='×';
  delBtn.title='Remover';
  delBtn.style.cssText='background:rgba(255,107,107,.15);border:1px solid rgba(255,107,107,.3);color:var(--red);font-size:15px;padding:6px 9px;border-radius:5px;cursor:pointer;line-height:1;touch-action:manipulation;';
  delBtn.addEventListener('click',function(e){e.stopPropagation();bank=bank.filter(function(b){return b.id!==ex.id;});renderBank();saveState();});
  delBtn.addEventListener('touchstart',function(e){e.stopPropagation();},{passive:true});
  delBtn.addEventListener('touchend',function(e){e.stopPropagation();e.preventDefault();bank=bank.filter(function(b){return b.id!==ex.id;});renderBank();saveState();},{passive:false});

  acts.appendChild(editBtn);
  acts.appendChild(delBtn);
  el.appendChild(acts);

  if(!isTouch){
    el.draggable=true;
    el.addEventListener('dragstart',function(e){
      dragItem={type:'bank',id:ex.id};
      el.classList.add('dragging');
      e.dataTransfer.effectAllowed='move';
    });
    el.addEventListener('dragend',function(){el.classList.remove('dragging');dragItem=null;});
  }
  addTouchDrag(el,function(){return {type:'bank',id:ex.id};});
  return el;
}

function makeBoardCard(ex,di,ei){
  var el=document.createElement('div');
  el.className='kex';
  el.dataset.exid=ex.id;
  el.innerHTML='<div class="kexname">'+ex.name+'</div><div class="kexmeta">'+(ex.kg>0?ex.kg+'kg · ':'')+ex.reps+'</div>';
  var rm=document.createElement('button');
  rm.className='kexrm'; rm.textContent='×';
  rm.style.touchAction='manipulation';
  rm.addEventListener('click',function(e){e.stopPropagation();board[di].splice(ei,1);renderKanban();renderPeriodGrid();});
  rm.addEventListener('touchstart',function(e){e.stopPropagation();},{passive:true});
  rm.addEventListener('touchend',function(e){e.stopPropagation();e.preventDefault();board[di].splice(ei,1);renderKanban();renderPeriodGrid();},{passive:false});
  el.appendChild(rm);
  if(!isTouch){
    el.draggable=true;
    el.addEventListener('dragstart',function(e){
      dragItem={type:'board',id:ex.id,fromDay:di,fromIdx:ei};
      el.classList.add('dragging');
      e.dataTransfer.effectAllowed='move';
    });
    el.addEventListener('dragend',function(){el.classList.remove('dragging');dragItem=null;});
  }
  addTouchDrag(el,function(){return {type:'board',id:ex.id,fromDay:di,fromIdx:ei};});
  return el;
}

function setupDropzone(colEl,dayIndex){
  colEl.addEventListener('dragover',function(e){
    e.preventDefault();
    colEl.classList.add('drag-over');
    e.dataTransfer.dropEffect='move';
  });
  colEl.addEventListener('dragleave',function(e){
    if(!colEl.contains(e.relatedTarget)) colEl.classList.remove('drag-over');
  });
  colEl.addEventListener('drop',function(e){
    e.preventDefault();
    colEl.classList.remove('drag-over');
    if(!dragItem) return;
    if(dragItem.type==='bank'){
      var ex=bank.find(function(b){return b.id===dragItem.id;});
      if(!ex) return;
      board[dayIndex].push({id:uid(),srcId:ex.id,name:ex.name,kg:ex.kg,reps:ex.reps});
    } else if(dragItem.type==='board'){
      if(dragItem.fromDay===dayIndex) return;
      var item=board[dragItem.fromDay].splice(dragItem.fromIdx,1)[0];
      if(item) board[dayIndex].push(item);
    }
    renderKanban();
    renderPeriodGrid();
  });
}

function setupBankDropzone(){
  var bk=g('ebank');
  bk.addEventListener('dragover',function(e){
    if(dragItem&&dragItem.type==='board'){e.preventDefault();bk.style.borderColor='var(--accent)';}
  });
  bk.addEventListener('dragleave',function(){bk.style.borderColor='';});
  bk.addEventListener('drop',function(e){
    e.preventDefault();
    bk.style.borderColor='';
    if(!dragItem||dragItem.type!=='board') return;
    board[dragItem.fromDay].splice(dragItem.fromIdx,1);
    renderKanban();
    renderPeriodGrid();
  });
}

function renderKanban(){
  var kb=g('kboard'); kb.innerHTML='';
  board.forEach(function(items,di){
    var col=document.createElement('div'); col.className='kcol';
    var kh=document.createElement('div'); kh.className='kch';
    kh.innerHTML='<span class="kday">'+DAYS[di]+'</span><span class="kcnt">'+items.length+'</span>';
    col.appendChild(kh);
    var body=document.createElement('div'); body.className='kbody';
    items.forEach(function(ex,ei){
      body.appendChild(makeBoardCard(ex,di,ei));
    });
    col.appendChild(body);
    setupDropzone(col,di);
    kb.appendChild(col);
  });
}

function renderBank(){
  var bk=g('ebank'); bk.innerHTML='';
  if(!bank.length){bk.innerHTML='<span class="bank-drop-hint">Adicione exercícios com o botão acima ↑</span>';return;}
  bank.forEach(function(ex){bk.appendChild(makeBankPill(ex));});
}

function renderPeriodGrid(){
  var pg=g('pgrid'); if(!pg) return; pg.innerHTML='';
  board.forEach(function(items,di){
    var card=document.createElement('div'); card.className='wcol';
    var h='<div class="wch"><span class="wcname">'+DAYS[di]+'</span></div><div class="wcbody">';
    if(!items.length){h+='<span style="font-size:11px;color:var(--muted);">—</span>';}
    else{items.forEach(function(ex){h+='<div class="srow"><span class="slbl">'+ex.name+'</span><span class="sw">'+(ex.kg>0?ex.kg+'kg':'—')+'</span><span class="sr">'+ex.reps+'</span></div>';});}
    h+='</div>';
    card.innerHTML=h;
    pg.appendChild(card);
  });
}

// Add / Edit exercise modal
var editingExId = null;

function openAddModal(){
  editingExId=null;
  g('mExTitle').textContent='Novo Exercício';
  g('mExName').value='';g('mExKg').value='';g('mExReps').value='';
  g('btnConfirmEx').textContent='Adicionar';
  g('mExDeleteWrap').style.display='none';
  g('mAddEx').classList.add('on');
}

function openEditModal(id){
  var ex=bank.find(function(b){return b.id===id;});
  if(!ex) return;
  editingExId=id;
  g('mExTitle').textContent='Editar Exercício';
  g('mExName').value=ex.name;
  g('mExKg').value=ex.kg||'';
  g('mExReps').value=ex.reps||'';
  g('btnConfirmEx').textContent='Salvar';
  g('mExDeleteWrap').style.display='block';
  g('mAddEx').classList.add('on');
}

g('btnAddEx').addEventListener('click', openAddModal);
g('btnCancelEx').addEventListener('click',function(){g('mAddEx').classList.remove('on');});

g('btnConfirmEx').addEventListener('click',function(){
  var name=g('mExName').value.trim(); if(!name) return;
  var kg=parseFloat(g('mExKg').value)||0;
  var reps=g('mExReps').value.trim()||'3x10';
  if(editingExId){
    var ex=bank.find(function(b){return b.id===editingExId;});
    var oldName=ex?ex.name:null;
    if(ex){
      var oldKg=ex.kg;
      var now=new Date().toLocaleDateString('pt-BR');
      // Record history: if first edit, snapshot the original point too
      if(!kgHistory[editingExId]) kgHistory[editingExId]=[];
      var hist=kgHistory[editingExId];
      if(hist.length===0 && oldKg>0){
        hist.push({date:now, kg:oldKg, name:ex.name, note:'inicial'});
      }
      if(kg!==oldKg && kg>0){
        hist.push({date:now, kg:kg, name:name, note:'editado'});
      }
      ex.name=name; ex.kg=kg; ex.reps=reps;
    }
    board.forEach(function(day){
      day.forEach(function(item){
        // Bate por srcId (itens novos), id legado, ou nome antigo (itens salvos antes do srcId)
        if(item.srcId===editingExId||item.id===editingExId||(oldName&&item.name===oldName)){
          item.name=name; item.kg=kg; item.reps=reps;
          item.srcId=editingExId; // garante que próximos edits já usam srcId
        }
      });
    });
    renderKanban();renderPeriodGrid();
  } else {
    var newId=uid();
    bank.push({id:newId,name:name,kg:kg,reps:reps});
  }
  g('mAddEx').classList.remove('on');
  renderBank();
  renderProgressCharts();
  saveState();
});

// ── PROGRESS CHARTS ──────────────────────────
var progressChartInstances={};

function renderProgressCharts(){
  // Collect all exercises that have history
  var ids=Object.keys(kgHistory).filter(function(id){return kgHistory[id].length>=1;});
  var section=g('progressSection');
  var container=g('progressCharts');
  if(!ids.length){section.style.display='none';return;}
  section.style.display='block';

  // Destroy removed charts
  Object.keys(progressChartInstances).forEach(function(id){
    if(!ids.includes(id)){progressChartInstances[id].destroy();delete progressChartInstances[id];}
  });

  ids.forEach(function(id){
    var hist=kgHistory[id];
    var exName=hist[hist.length-1].name;
    var canvasId='pgchart-'+id;

    // Create card if not exists
    var card=document.getElementById('pgcard-'+id);
    if(!card){
      card=document.createElement('div');
      card.id='pgcard-'+id;
      card.className='card';
      card.style.position='relative';
      card.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">'
        +'<div style="font-size:13px;font-weight:600;" id="pgname-'+id+'">'+exName+'</div>'
        +'<button onclick="clearExHistory(\''+id+'\')" style="background:transparent;border:none;color:var(--muted);font-size:18px;padding:0;cursor:pointer;line-height:1;" title="Limpar histórico">×</button>'
        +'</div>'
        +'<div style="position:relative;height:160px;"><canvas id="'+canvasId+'"></canvas></div>';
      container.appendChild(card);
    } else {
      g('pgname-'+id).textContent=exName;
    }

    var labels=hist.map(function(p){return p.date+(p.note==='inicial'?' (inicial)':'');});
    var values=hist.map(function(p){return p.kg;});

    if(progressChartInstances[id]){
      progressChartInstances[id].data.labels=labels;
      progressChartInstances[id].data.datasets[0].data=values;
      progressChartInstances[id].update();
    } else {
      var ctx=document.getElementById(canvasId).getContext('2d');
      progressChartInstances[id]=new Chart(ctx,{
        type:'line',
        data:{
          labels:labels,
          datasets:[{
            data:values,
            borderColor:'#6c63ff',
            backgroundColor:'rgba(108,99,255,.12)',
            borderWidth:2,
            pointRadius:5,
            pointBackgroundColor:values.map(function(v,i){return i===0?'#8a8898':'#6c63ff';}),
            pointBorderColor:'#0c0c0f',
            pointBorderWidth:2,
            fill:true,
            tension:0.3,
          }]
        },
        options:{
          responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return ctx.parsed.y+' kg';}}}},
          scales:{
            x:{ticks:{color:'#8a8898',font:{size:10}},grid:{color:'rgba(255,255,255,.04)'}},
            y:{ticks:{color:'#8a8898',font:{size:10},callback:function(v){return v+' kg';}},grid:{color:'rgba(255,255,255,.05)'},beginAtZero:false}
          }
        }
      });
    }
  });

  // Remove cards for deleted exercises
  Array.from(container.children).forEach(function(card){
    var id=card.id.replace('pgcard-','');
    if(!ids.includes(id)) container.removeChild(card);
  });
}

function clearExHistory(id){
  delete kgHistory[id];
  if(progressChartInstances[id]){progressChartInstances[id].destroy();delete progressChartInstances[id];}
  var card=document.getElementById('pgcard-'+id);
  if(card) card.remove();
  var section=g('progressSection');
  if(!Object.keys(kgHistory).length) section.style.display='none';
  saveState();
}

g('btnDeleteEx').addEventListener('click',function(){
  if(!editingExId) return;
  bank=bank.filter(function(b){return b.id!==editingExId;});
  g('mAddEx').classList.remove('on');
  renderBank();
  saveState();
});

// ── 1RM ──────────────────────────────────────
function calcRM(){
  var w=parseFloat(g('rmW').value)||0,r=parseInt(g('rmR').value)||1;
  if(r<1||r>36) return;
  var one=w*(36/(37-r));
  g('rmResult').textContent=one.toFixed(1)+' kg';
  var pcts=[100,95,90,85,80,75,70,65],reps=[1,2,4,6,8,10,12,16];
  g('rmTbody').innerHTML=pcts.map(function(p,i){
    return '<tr><td class="dim">'+p+'%</td><td class="hl">'+(one*p/100).toFixed(1)+' kg</td><td>'+reps[i]+'</td></tr>';
  }).join('');
}
g('rmW').addEventListener('input',calcRM);
g('rmR').addEventListener('input',calcRM);

// ── BIKE ─────────────────────────────────────
var bikeBase=[];
var bikeExtra=[];
var bikeCI=null;

function allBikeSessions(){
  return bikeBase.concat(bikeExtra);
}

// Parse "dd/mm" or "dd/mm/aa" or "dd/mm/aaaa" → Date for week detection
function parseBikeDate(dStr){
  var p=dStr.split('/');
  var day=parseInt(p[0])||1;
  var mon=parseInt(p[1])||1;
  var yr;
  if(p[2]){
    yr=parseInt(p[2]);
    if(yr<100) yr+=2000; // handle 2-digit year
  } else {
    // No year: assume current year
    yr=new Date().getFullYear();
  }
  return new Date(yr,mon-1,day);
}

function getWeekRange(){
  var now=new Date();
  var dow=now.getDay(); // 0=Sun
  var monday=new Date(now);
  monday.setDate(now.getDate() - (dow===0?6:dow-1));
  monday.setHours(0,0,0,0);
  var sunday=new Date(monday);
  sunday.setDate(monday.getDate()+6);
  return {start:monday,end:sunday};
}

function updateWeekGoal(){
  var goal=parseInt(g('bikeGoal').value)||300;
  var range=getWeekRange();
  var sessions=allBikeSessions();
  var weekMins=sessions.filter(function(s){
    try{
      var d=parseBikeDate(s.d);
      return d>=range.start && d<=range.end;
    }catch(e){return false;}
  }).reduce(function(a,b){return a+b.t;},0);

  var pct=Math.min(100,Math.round(weekMins/goal*100));
  var left=Math.max(0,goal-weekMins);

  g('bikeWeekMins').textContent=weekMins;
  g('bikeWeekBar').style.width=pct+'%';
  g('bikeWeekBar').style.background=pct>=100
    ?'linear-gradient(90deg,#4ade80,#2dd4bf)'
    :'linear-gradient(90deg,var(--teal),var(--accent))';
  g('bikeWeekPct').textContent=pct+'%';
  g('bikeWeekLeft').textContent=pct>=100?'✓ Meta atingida!':left+' min restantes';

  // Week range label
  var fmt=function(d){return d.getDate()+'/'+(d.getMonth()+1);};
  g('bikeWeekRange').textContent=fmt(range.start)+' – '+fmt(range.end);
}

function renderBikeSessionList(){
  var list=g('bikeSessionList');
  var sessions=bikeExtra.slice().reverse();
  if(!sessions.length){
    list.innerHTML='<div style="font-size:11px;color:var(--muted);padding:4px 0;">Nenhuma sessão adicionada ainda.</div>';
    return;
  }
  list.innerHTML=sessions.map(function(s,i){
    var realIdx=bikeExtra.length-1-i;
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px;">'
      +'<span style="color:var(--muted);font-family:var(--mono);">'+s.d+'</span>'
      +'<span style="font-weight:600;font-family:var(--mono);color:var(--teal);">'+s.t+' min</span>'
      +'<button onclick="removeBikeSession('+realIdx+')" style="background:transparent;border:none;color:var(--muted);font-size:14px;padding:0 4px;cursor:pointer;line-height:1;" title="Remover">×</button>'
      +'</div>';
  }).join('');
}

function removeBikeSession(idx){
  bikeExtra.splice(idx,1);
  refreshBike();
  saveState();
}

// Refresh all bike UI: chart (if visible), week goal, session list, metrics
function refreshBike(){
  var all=allBikeSessions();
  var daily=parseInt(g('bikeDailyGoal').value)||43;
  g('bikeTotal').innerHTML=all.reduce(function(a,b){return a+b.t;},0)+'<span class="mu">min</span>';
  g('bikeExcess').innerHTML=all.reduce(function(a,b){return a+Math.max(0,b.t-daily);},0)+'<span class="mu">min</span>';
  g('bikeSess').textContent=all.length;
  updateWeekGoal();
  renderBikeSessionList();
  // Only rebuild chart if the bike tab is visible
  var bikeTab=g('pg-bike');
  if(bikeTab && bikeTab.classList.contains('on')){
    buildBikeChart();
  }
}

function buildBikeChart(){
  if(bikeCI){bikeCI.destroy();bikeCI=null;}
  var all=allBikeSessions();
  var daily=parseInt(g('bikeDailyGoal').value)||43;
  g('bikeTotal').innerHTML=all.reduce(function(a,b){return a+b.t;},0)+'<span class="mu">min</span>';
  g('bikeExcess').innerHTML=all.reduce(function(a,b){return a+Math.max(0,b.t-daily);},0)+'<span class="mu">min</span>';
  g('bikeSess').textContent=all.length;
  bikeCI=new Chart(g('bikeChart').getContext('2d'),{
    type:'bar',
    data:{
      labels:all.map(function(d){return d.d;}),
      datasets:[{
        data:all.map(function(d){return d.t;}),
        backgroundColor:all.map(function(d,i){
          var isExtra=i>=bikeBase.length;
          return d.t>=60
            ?(isExtra?'rgba(74,222,128,.9)':'rgba(74,222,128,.7)')
            :(isExtra?'rgba(147,197,253,.85)':'rgba(147,197,253,.6)');
        }),
        borderWidth:0,borderRadius:3
      }]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{
        x:{ticks:{color:'#8a8898',font:{size:9},maxRotation:45,autoSkip:true,maxTicksLimit:20},grid:{color:'rgba(255,255,255,.04)'}},
        y:{ticks:{color:'#8a8898',font:{size:10}},grid:{color:'rgba(255,255,255,.05)'}}
      }
    }
  });
  updateWeekGoal();
  renderBikeSessionList();
}

g('btnAddBike').addEventListener('click',function(){
  var date=g('bikeDate').value.trim();
  var mins=parseInt(g('bikeMins').value);
  if(!date||isNaN(mins)||mins<1) return;
  bikeExtra.push({d:date,t:mins});
  g('bikeDate').value='';g('bikeMins').value='';
  refreshBike();
  saveState();
});

g('bikeGoal').addEventListener('input',function(){updateWeekGoal();saveState();});
g('bikeDailyGoal').addEventListener('input',function(){refreshBike();saveState();});

// ── WORKOUT BUILDER ──────────────────────────
var savedWorkouts = [];
var editingWktId = null;

// Builder state: array of {zone, mins}
var builderSegs = [];
var modalSegs   = [];

var ZONE_COLORS = {Z1:'#bfdbfe',Z2:'#93c5fd',Z3:'#4ade80',Z4:'#fbbf24',Z5:'#ff6b6b'};
var ZONE_LABELS = {Z1:'Muito Leve — Recuperação ativa',Z2:'Leve — Base aeróbica',Z3:'Moderado — Condicionamento',Z4:'Forte — Limiar de performance',Z5:'Muito Forte — Tiros curtos'};

function zoneClass(z){ return z.toLowerCase()+'-row'; }
function segClass(z){ return z.toLowerCase()+'-seg'; }

function renderTimeline(segs, containerId){
  var el=g(containerId); el.innerHTML='';
  var total=segs.reduce(function(a,s){return a+s.mins;},0);
  if(!total){ el.style.background='var(--bg3)'; return; }
  el.style.background='transparent';
  segs.forEach(function(s){
    var div=document.createElement('div');
    div.className='tl-seg '+segClass(s.zone);
    div.style.flex=s.mins;
    div.title=s.zone+' · '+s.mins+'min';
    if(s.mins>=8) div.textContent=s.zone;
    el.appendChild(div);
  });
}

function updateBuilderTimeline(){
  renderTimeline(builderSegs,'wktTimeline');
  var total=builderSegs.reduce(function(a,s){return a+s.mins;},0);
  g('wktTotalMin').textContent=total?total+' min':'';
}

function renderBuilderSegs(){
  var c=g('wktSegments'); c.innerHTML='';
  builderSegs.forEach(function(s,i){
    c.appendChild(makeSegRow(s,i,builderSegs,'wktSegments',updateBuilderTimeline));
  });
  updateBuilderTimeline();
}

function makeSegRow(s,i,arr,containerId,onUpdate){
  var row=document.createElement('div');
  row.className='seg-row '+zoneClass(s.zone);

  var tag=document.createElement('span');
  tag.className='seg-zone-tag';
  tag.style.color=ZONE_COLORS[s.zone];
  tag.textContent=s.zone;

  var desc=document.createElement('span');
  desc.className='seg-desc';
  desc.textContent=ZONE_LABELS[s.zone];

  var inp=document.createElement('input');
  inp.type='number'; inp.min='1'; inp.step='1';
  inp.className='seg-min-input';
  inp.value=s.mins;
  inp.addEventListener('input',function(){
    arr[i].mins=Math.max(1,parseInt(inp.value)||1);
    onUpdate();
  });

  var muLabel=document.createElement('span');
  muLabel.style.cssText='font-size:10px;color:var(--muted);white-space:nowrap;';
  muLabel.textContent='min';

  var del=document.createElement('button');
  del.className='seg-del'; del.textContent='×';
  del.addEventListener('click',function(){
    arr.splice(i,1);
    if(containerId==='wktSegments') renderBuilderSegs();
    else renderModalSegs();
  });

  row.appendChild(tag); row.appendChild(desc); row.appendChild(inp); row.appendChild(muLabel); row.appendChild(del);
  return row;
}

function addWktSegment(zone,mins){
  builderSegs.push({zone:zone,mins:mins});
  renderBuilderSegs();
}

function clearBuilder(){
  builderSegs=[];
  g('wktName').value='';
  g('wktBuilderTitle').textContent='Novo Treino';
  editingWktId=null;
  renderBuilderSegs();
}

g('btnClearWkt').addEventListener('click',clearBuilder);

g('btnSaveWkt').addEventListener('click',function(){
  var name=g('wktName').value.trim()||'Treino sem nome';
  if(!builderSegs.length) return;
  if(editingWktId){
    var w=savedWorkouts.find(function(w){return w.id===editingWktId;});
    if(w){w.name=name; w.segs=JSON.parse(JSON.stringify(builderSegs));}
    editingWktId=null;
    g('wktBuilderTitle').textContent='Novo Treino';
  } else {
    savedWorkouts.push({id:uid(),name:name,segs:JSON.parse(JSON.stringify(builderSegs))});
  }
  clearBuilder();
  renderSavedWorkouts();
  saveState();
});

function renderSavedWorkouts(){
  var c=g('savedWktsList');
  if(!savedWorkouts.length){
    c.innerHTML='<div style="font-size:12px;color:var(--muted);padding:4px 0;">Nenhum treino salvo ainda. Crie um acima ↑</div>';
    return;
  }
  c.innerHTML='';
  savedWorkouts.forEach(function(w){
    var total=w.segs.reduce(function(a,s){return a+s.mins;},0);
    var card=document.createElement('div');
    card.className='wkt-card';

    // Header
    var hdr=document.createElement('div');
    hdr.className='wkt-card-header';
    var nm=document.createElement('div'); nm.className='wkt-card-name'; nm.textContent=w.name;
    var tt=document.createElement('div'); tt.className='wkt-card-total'; tt.textContent=total+' min';
    hdr.appendChild(nm); hdr.appendChild(tt);

    // Zone pills summary
    var pills=document.createElement('div');
    pills.style.cssText='display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;';
    var zoneMap={};
    w.segs.forEach(function(s){zoneMap[s.zone]=(zoneMap[s.zone]||0)+s.mins;});
    Object.keys(zoneMap).sort().forEach(function(z){
      var pill=document.createElement('span');
      pill.className='zbadge '+z.toLowerCase();
      pill.textContent=z+' '+zoneMap[z]+'min';
      pills.appendChild(pill);
    });

    // Timeline
    var tlWrap=document.createElement('div');
    tlWrap.className='wkt-timeline';
    tlWrap.id='tl-'+w.id;

    // Segment list
    var segList=document.createElement('div');
    segList.style.cssText='margin-top:8px;display:flex;flex-direction:column;gap:4px;';
    w.segs.forEach(function(s){
      var srow=document.createElement('div');
      srow.style.cssText='display:flex;align-items:center;gap:8px;font-size:12px;';
      srow.innerHTML='<span style="font-family:var(--mono);font-weight:700;color:'+ZONE_COLORS[s.zone]+';">'+s.zone+'</span>'
        +'<span style="color:var(--muted);">'+ZONE_LABELS[s.zone]+'</span>'
        +'<span style="margin-left:auto;font-family:var(--mono);color:var(--text);">'+s.mins+' min</span>';
      segList.appendChild(srow);
    });

    // Actions
    var acts=document.createElement('div');
    acts.className='wkt-actions';

    var editBtn=document.createElement('button');
    editBtn.className='sec';
    editBtn.style.cssText='font-size:11px;padding:5px 12px;';
    editBtn.textContent='✎ Editar';
    editBtn.addEventListener('click',function(){
      // Load into main builder
      builderSegs=JSON.parse(JSON.stringify(w.segs));
      g('wktName').value=w.name;
      g('wktBuilderTitle').textContent='Editando: '+w.name;
      editingWktId=w.id;
      renderBuilderSegs();
      g('wktName').scrollIntoView({behavior:'smooth',block:'center'});
    });

    var delBtn=document.createElement('button');
    delBtn.className='sec';
    delBtn.style.cssText='font-size:11px;padding:5px 12px;border-color:rgba(255,107,107,.3);color:var(--red);';
    delBtn.textContent='× Remover';
    delBtn.addEventListener('click',function(){
      savedWorkouts=savedWorkouts.filter(function(x){return x.id!==w.id;});
      renderSavedWorkouts();
      saveState();
    });

    var logBtn=document.createElement('button');
    logBtn.style.cssText='font-size:11px;padding:5px 12px;background:linear-gradient(135deg,var(--teal),#2596be);border:none;';
    logBtn.textContent='▶ Registrar no dia';
    logBtn.addEventListener('click',function(){
      openLogWktModal(w);
    });

    acts.appendChild(logBtn); acts.appendChild(editBtn); acts.appendChild(delBtn);
    card.appendChild(hdr); card.appendChild(pills); card.appendChild(tlWrap);
    card.appendChild(segList); card.appendChild(acts);
    c.appendChild(card);

    renderTimeline(w.segs,'tl-'+w.id);
  });
}

// Modal edit helpers (unused inline, kept for future)
function renderModalSegs(){
  var c=g('mWktSegments'); c.innerHTML='';
  modalSegs.forEach(function(s,i){
    c.appendChild(makeSegRow(s,i,modalSegs,'mWktSegments',function(){
      renderTimeline(modalSegs,'mWktTimeline');
    }));
  });
  renderTimeline(modalSegs,'mWktTimeline');
}
function addMWktSegment(zone,mins){
  modalSegs.push({zone:zone,mins:mins});
  renderModalSegs();
}
g('btnCancelEditWkt').addEventListener('click',function(){g('mEditWkt').classList.remove('on');});
g('btnConfirmEditWkt').addEventListener('click',function(){
  var name=g('mWktName').value.trim()||'Treino';
  if(editingWktId){
    var w=savedWorkouts.find(function(x){return x.id===editingWktId;});
    if(w){w.name=name;w.segs=JSON.parse(JSON.stringify(modalSegs));}
    editingWktId=null;
  }
  g('mEditWkt').classList.remove('on');
  renderSavedWorkouts();
  saveState();
});

// ── CYCLE HISTORY ────────────────────────────
var cycleChartInst = null;
var LIFT_LABELS = {supino:'Supino', agacha:'Agachamento', terra:'Terra'};
var LIFT_COLORS = {supino:'rgba(108,99,255,.9)', agacha:'rgba(45,212,191,.9)', terra:'rgba(251,191,36,.9)'};
var LIFT_FILL  = {supino:'rgba(108,99,255,.12)', agacha:'rgba(45,212,191,.12)', terra:'rgba(251,191,36,.12)'};
var LIFT_SOLID = {supino:'#6c63ff', agacha:'#2dd4bf', terra:'#fbbf24'};

function renderCycleHistory(){
  var section=g('cycleHistorySection');
  var list=g('cycleList');
  if(!cycleHistory.length){section.style.display='none';return;}
  section.style.display='block';

  // ── Chart ──
  if(cycleChartInst){cycleChartInst.destroy();cycleChartInst=null;}

  var lifts=['supino','agacha','terra'];
  var allDates=[...new Set(cycleHistory.map(function(c){return c.dateEnd;}))].sort(function(a,b){
    return parseCycleDate(a)-parseCycleDate(b);
  });

  var datasets=lifts.map(function(lk){
    var pts=allDates.map(function(d){
      var entries=cycleHistory.filter(function(c){return c.lift===lk&&c.dateEnd===d;});
      return entries.length?entries[entries.length-1].rmEnd:null;
    });
    if(pts.every(function(p){return p===null;})) return null;

    return {
      label:LIFT_LABELS[lk],
      data:pts,
      borderColor:LIFT_COLORS[lk],
      backgroundColor:LIFT_FILL[lk],
      borderWidth:2.5,
      pointRadius:6,
      pointHoverRadius:9,
      pointBackgroundColor:LIFT_SOLID[lk],
      pointBorderColor:'#0c0c0f',
      pointBorderWidth:2,
      fill:true,
      tension:0.4,
      spanGaps:true,
    };
  }).filter(Boolean);

  var ctx=g('cycleChart').getContext('2d');
  cycleChartInst=new Chart(ctx,{
    type:'line',
    data:{labels:allDates, datasets:datasets},
    options:{
      responsive:true,
      maintainAspectRatio:false,
      animation:{
        duration:900,
        easing:'easeInOutQuart',
        onProgress:function(anim){
          // draw progress glow on active dataset points
        }
      },
      transitions:{
        active:{animation:{duration:200}}
      },
      interaction:{mode:'index',intersect:false},
      plugins:{
        legend:{
          display:true,
          labels:{color:'#8a8898',font:{size:11},boxWidth:12,padding:16}
        },
        tooltip:{
          backgroundColor:'rgba(30,30,40,.95)',
          borderColor:'rgba(255,255,255,.1)',
          borderWidth:1,
          titleColor:'#f0eee8',
          bodyColor:'#8a8898',
          padding:10,
          callbacks:{
            label:function(ctx){
              var v=ctx.parsed.y;
              if(v===null) return null;
              return ' '+ctx.dataset.label+': '+v+' kg';
            }
          }
        }
      },
      scales:{
        x:{
          ticks:{color:'#8a8898',font:{size:10}},
          grid:{color:'rgba(255,255,255,.04)'}
        },
        y:{
          ticks:{color:'#8a8898',font:{size:10},callback:function(v){return v+' kg';}},
          grid:{color:'rgba(255,255,255,.05)'},
          beginAtZero:false
        }
      }
    }
  });

  // ── List ──
  list.innerHTML='';
  var sorted=cycleHistory.slice().reverse();
  sorted.forEach(function(c){
    var gained=c.gain>=0;
    var gainColor=gained?'var(--green)':'var(--red)';
    var gainSign=c.gain>0?'+':'';
    var dot='<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:'+LIFT_SOLID[c.lift]+';margin-right:6px;vertical-align:middle;"></span>';
    var card=document.createElement('div');
    card.style.cssText='background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:12px 14px;display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:12px;transition:border-color .15s;';
    card.onmouseenter=function(){this.style.borderColor='rgba(255,255,255,.15)';};
    card.onmouseleave=function(){this.style.borderColor='';};
    card.innerHTML=
      '<div>'
      +'<div style="font-size:12px;font-weight:600;margin-bottom:3px;">'+dot+LIFT_LABELS[c.lift]+'</div>'
      +'<div style="font-size:11px;color:var(--muted);">'+c.dateEnd
      +(c.rmStart?' &nbsp;·&nbsp; <span style="font-family:var(--mono);">'+c.rmStart+' → '+c.rmEnd+' kg</span>':'')
      +'</div>'
      +'</div>'
      +'<div style="text-align:right;">'
      +'<div style="font-family:var(--mono);font-size:14px;font-weight:700;color:'+gainColor+';">'+gainSign+c.gain+' kg</div>'
      +'</div>'
      +'<button onclick="deleteCycle(\''+c.id+'\')" style="background:transparent;border:none;color:var(--muted);font-size:16px;padding:0 2px;cursor:pointer;line-height:1;transition:color .15s;" onmouseenter="this.style.color=\'var(--red)\'" onmouseleave="this.style.color=\'\'" title="Remover">×</button>';
    list.appendChild(card);
  });
}

function parseCycleDate(dStr){
  var p=dStr.split('/');
  return new Date(parseInt(p[2]),parseInt(p[1])-1,parseInt(p[0]));
}

function deleteCycle(id){
  cycleHistory=cycleHistory.filter(function(c){return c.id!==id;});
  renderCycleHistory();
  saveState();
}

// ── LOG WORKOUT MODAL ────────────────────────
var logWktTarget = null;

function openLogWktModal(w){
  logWktTarget = w;
  var total = w.segs.reduce(function(a,s){return a+s.mins;},0);
  g('mLogWktTitle').textContent = 'Registrar: '+w.name;
  g('mLogWktTotal').textContent = total+' min';

  // Fill timeline preview
  var tl = g('mLogWktTimeline');
  tl.innerHTML = '';
  w.segs.forEach(function(s){
    var div = document.createElement('div');
    div.className = 'tl-seg '+segClass(s.zone);
    div.style.flex = s.mins;
    div.title = s.zone+' · '+s.mins+'min';
    if(s.mins >= 8) div.textContent = s.zone;
    tl.appendChild(div);
  });

  // Fill segment list
  var sl = g('mLogWktSegs');
  sl.innerHTML = '';
  w.segs.forEach(function(s){
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:6px;';
    row.innerHTML = '<span style="font-family:var(--mono);font-weight:700;color:'+ZONE_COLORS[s.zone]+';">'+s.zone+'</span>'
      +'<span style="color:var(--muted);flex:1;">'+ZONE_LABELS[s.zone]+'</span>'
      +'<span style="font-family:var(--mono);">'+s.mins+'min</span>';
    sl.appendChild(row);
  });

  // Default date: today dd/mm
  var now = new Date();
  var dd = String(now.getDate()).padStart(2,'0');
  var mm = String(now.getMonth()+1).padStart(2,'0');
  g('mLogWktDate').value = dd+'/'+mm;

  g('mLogWkt').classList.add('on');
}

g('btnCancelLogWkt').addEventListener('click', function(){
  g('mLogWkt').classList.remove('on');
  logWktTarget = null;
});

g('btnConfirmLogWkt').addEventListener('click', function(){
  if(!logWktTarget) return;
  var date = g('mLogWktDate').value.trim();
  if(!date) return;
  var total = logWktTarget.segs.reduce(function(a,s){return a+s.mins;},0);
  bikeExtra.push({d:date, t:total});
  g('mLogWkt').classList.remove('on');
  logWktTarget = null;
  refreshBike();
  saveState();
});

// ── PR BANNER ────────────────────────────────
var _prDismissTimer = null;

function showPRBanner(liftLabel, liftColor, rmStart, rmEnd, isAllTime){
  var gain = Math.round((rmEnd - rmStart) * 10) / 10;
  var banner = document.getElementById('pr-banner');
  if(!banner){
    banner = document.createElement('div');
    banner.id = 'pr-banner';
    document.body.appendChild(banner);
  }

  banner.innerHTML =
    '<span class="pr-icon">'+(isAllTime ? '🏆' : '📈')+'</span>'
    +'<div class="pr-title">'+(isAllTime ? 'Novo Recorde Pessoal!' : 'Evolução no Ciclo!')+'</div>'
    +'<div class="pr-lift" style="color:'+liftColor+';">'+liftLabel+'</div>'
    +'<div class="pr-numbers">'
    +rmStart+' kg &rarr; <span class="pr-gain">'+rmEnd+' kg</span>'
    +' &nbsp;&middot;&nbsp; <span class="pr-gain">+'+gain+' kg</span>'
    +'</div>'
    +'<span class="pr-dismiss">toque para fechar</span>';

  if(_prDismissTimer) clearTimeout(_prDismissTimer);
  banner.classList.add('show');

  _prDismissTimer = setTimeout(function(){
    banner.classList.remove('show');
  }, 5500);

  banner.onclick = function(){
    clearTimeout(_prDismissTimer);
    banner.classList.remove('show');
  };
}

// ── INIT ─────────────────────────────────────
function applyState(saved){
  if(saved){
    if(saved.rmSupino) g('rm-supino').value=saved.rmSupino;
    if(saved.rmAgacha) g('rm-agacha').value=saved.rmAgacha;
    if(saved.rmTerra)  g('rm-terra').value=saved.rmTerra;
    if(saved.checks)   checksState=saved.checks;
    if(saved.rmTests)  rmTestValues=saved.rmTests;
    if(saved.board)    board=saved.board;
    if(saved.bank)     bank=saved.bank;
    if(saved.kgHistory)   kgHistory=saved.kgHistory;
    if(saved.cycleHistory)cycleHistory=saved.cycleHistory;
    if(saved.bikeExtra)  bikeExtra=saved.bikeExtra;
    if(saved.bikeGoal)   g('bikeGoal').value=saved.bikeGoal;
    if(saved.bikeDailyGoal) g('bikeDailyGoal').value=saved.bikeDailyGoal;
    if(saved.savedWorkouts) savedWorkouts=saved.savedWorkouts;
  }
  buildAllPeriod();
  calcRM();
  renderKanban();renderBank();setupBankDropzone();
  renderPeriodGrid();
  renderProgressCharts();
  renderBuilderSegs();
  renderSavedWorkouts();
  renderCycleHistory();
  var origRenderKanban=renderKanban;
  renderKanban=function(){origRenderKanban();saveState();};
}

loadState().then(applyState).catch(function(){ applyState(null); });

// Register Service Worker
if('serviceWorker' in navigator){
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('./sw.js').then(function(reg){
      console.log('[SW] Registered:', reg.scope);
    }).catch(function(err){
      console.warn('[SW] Registration failed:', err);
    });
  });
}
