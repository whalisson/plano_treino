// ── GORILA GYM — logbook.js ──────────────────
// Kanban, banco de exercícios, drag-and-drop e progresso de carga

import { uid, g, round05, parseSetCount, getWeekRange, showUndo, saveState, kgHistory } from './state.js';

var DAYS = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
var _bankQuery = '';
var _bankGroup = '';

var GROUP_CSS   = { push:'bpg-push', pull:'bpg-pull', legs:'bpg-legs', core:'bpg-core' };
var GROUP_LABEL = { push:'Push', pull:'Pull', legs:'Legs', core:'Core' };

// ── Detecção automática de grupo por palavras-chave ──
export function detectExerciseGroup(rawName) {
  if (!rawName || !rawName.trim()) return '';
  var n = rawName.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // remove acentos
    .replace(/[^a-z0-9\s]/g, ' ');                     // pontuação → espaço

  // ── CORE ────────────────────────────────────────────
  // abdômen, prancha, rotações, anti-rotação, estabilização
  if (/\bcore\b|abdom|crunch|sit.?up|prancha|plank|obliq|russian.?twist|twist|vacuum|hipopressiv|hipopress|bird.?dog|hollow.?body|dragon.?flag|ab.?wheel|roda.?ab|rollout|hanging.*leg|knee.*raise|elevacao.*perna.*sus|captain.?chair|decline.*crunch|cable.*crunch|pallof|woodchop|wood.?chop|mountain.*climb|toe.?touch|v.?up|jackknife|suitcase.*crunch|windmill|turkish.?get|dead.?bug|side.?plank|reverse.?crunch|bicycle.*crunch|bicicleta.*abd|toque.*tornozelo|prancha.*lat|superman.*abd|estabilizacao|anti.?rotacao/.test(n)) return 'core';

  // ── LEGS ────────────────────────────────────────────
  // quadríceps, posterior, glúteo, panturrilha, adutores, cargas
  if (/agacham|squat|leg.?press|leg.?curl|leg.?extens|\bleg\b|perna|afundo|lunge|bulgar|passada|split.?squat|pistol|goblet|front.?squat|zercher|pause.?squat|box.?squat|agach.*front|agach.*gobl|agach.*sumo|sumo.?agach|hip.?thrust|glut|elevacao.?pelvica|ponte.?glut|kickback.*glut|glut.*kickback|coice|donkey.?kick|flexora|extensora|cadeira.?flex|cadeira.?ext|leg.?curl|leg.?ext|panturrilha|calf|gemeo|gemeos|standing.?calf|seated.?calf|donkey.?calf|stiff|rdl|romanian|good.?morning|nordic.?curl|single.?leg|unilateral.*perna|terra.?sumo|terra.?conv|terra.?defic|deficit.?dead|rack.?dead|snatch|aducao|abducao|adutor|abdutor|maq.*adut|maq.*abdut|inner.?thigh|outer.?thigh|hip.?abduct|hip.?adduct|sissy|wall.?sit|step.?up|box.?jump|box.?step|farmer.?walk|sled|prowler|plie|elev.*quadril|swing.*kettle|kb.?swing|kettlebell.?swing|hack.?squat|hack\b|45.?grau|45\s*graus|cadeira.*leg|leg.*machine|extensao.*joelho|45.*graus/.test(n)) return 'legs';

  // ── PULL ────────────────────────────────────────────
  // costas, bíceps, posteriores de ombro, trapézio, puxadas
  if (/remada|row|puxada|pulldown|pull.?up|chin.?up|barra.?fixa|lat\b|lat.*pull|levant.*terra|\bterra\b|deadlift|sumo.?dead|rack.?pull|block.?pull|rosca|curl|bicep|biceps|hammer.*curl|martelo|zottman|concentration|preacher|scott|spider.?curl|cable.*curl|reverse.?curl|supinado|encolhim|shrug|trapez|face.?pull|high.?row|seal.?row|meadow|pendlay|yates|t.?bar|kroc|pullov|pullover|snatch.?grip|chest.?support|apoio.*peito|costas.*maq|maq.*costas|hiperextens|extensao.?lombar|back.?ext|superman\b|dorsal|lombar|gran.?dorsal|latissimo|voador.*post|pec.?deck.*post|posterior.*ombro|passaro|bird|reverse.?fly|reverse.?flye|remada.*baixo|polia.*baixa|polia.*alta|baixa.*polia|alta.*polia|pulley|serrr|remo|renegade.*row|one.?arm.*row|dumbbell.*row|barbell.*row|cable.*row|inverted.*row|australian/.test(n)) return 'pull';

  // ── PUSH ────────────────────────────────────────────
  // peito, ombros, tríceps, variações de press e fly
  if (/supino|bench|desenvolv|overhead|press\b|militar|arnold|push.?press|seated.*press|standing.*press|z.?press|landmine.*press|behind.*neck|btn|crucifixo|fly\b|flye|pec.?deck|pec\b|peito|chest|dip\b|paralela|fundos|mergulho|tricep|extens.*tri|tri.*extens|pushdown|pressdown|skull|testa|frances|kickback.*tri|tri.*kickback|push.?up|flexao.*solo|flexao.*chao|flexao.*barra|elev.*front|elev.*later|lateral.*raise|front.*raise|upright.*row|remada.*alta|ombro|shoulder|deltoid|delt\b|close.?grip|cgbp|pike|handstand|hspu|chest.*press|cable.*cross|cross.*over|polia.*cross|voador.*peito|inclinado|declinado|reto.*supino|supino.*reto|maq.*peito|maq.*ombro|maq.*tricep|shoulder.*press|chest.*fly|cable.*fly|low.*cable.*fly|high.*cable.*fly|coice.*tri|tri.*coice|testa.*barra|testa.*halt|halt.*testa|extensao.*tri|triceps.*testa|triceps.*halt|triceps.*barra|serrril|serrrate|serratus/.test(n)) return 'push';

  return '';
}

export function parseVolume(items) {
  return items.reduce(function(total, ex) {
    if (!ex.kg || ex.kg <= 0) return total;
    var m = String(ex.reps).match(/^(\d+)x(\d+)/i);
    var r = m ? parseInt(m[1]) * parseInt(m[2]) : (parseInt(ex.reps) || 0);
    return total + r * ex.kg;
  }, 0);
}
export let board = DAYS.map(function() { return []; });
export let bank  = [
  { id:uid(), name:'Elev. Lateral Halt.',  kg:25,  reps:'3x12', group:'push' },
  { id:uid(), name:'Crux. Inv. Máquina',   kg:20,  reps:'3x12', group:'push' },
  { id:uid(), name:'Elev. Lat. Máquina',   kg:95,  reps:'3x10', group:'push' },
  { id:uid(), name:'Hip Thrust',           kg:135, reps:'3x10', group:'legs' },
  { id:uid(), name:'Flexora',              kg:200, reps:'3x10', group:'legs' },
  { id:uid(), name:'Bulgaro Uni.',          kg:0,   reps:'3x8',  group:'legs' },
  { id:uid(), name:'Maq. Puxada',          kg:60,  reps:'3x10', group:'pull' },
  { id:uid(), name:'Maq. Remada',          kg:55,  reps:'3x10', group:'pull' },
  { id:uid(), name:'Low Row',              kg:85,  reps:'3x10', group:'pull' },
];

export function setBoard(v) { board = v; }
export function setBank(v) { bank = v; }

// ── Drag & Drop ───────────────────────────────
var dragItem  = null;
var dragOverCard = null; // { day, idx, before } — posição de inserção dentro da coluna
let isTouch   = ('ontouchstart' in window || navigator.maxTouchPoints > 0);
var touchGhost      = null;
var touchLastTarget = null;
var touchScrollBlocked = false;
var touchLongPressTimer = null;
var LONG_PRESS_MS = 400;
var autoScrollRAF = null;
var autoScrollVel = 0;

export function clearCardDropIndicators() {
  document.querySelectorAll('.kex.drop-before,.kex.drop-after').forEach(function(el) {
    el.classList.remove('drop-before', 'drop-after');
  });
  dragOverCard = null;
}

function runAutoScroll() {
  if (autoScrollVel !== 0 && dragItem) {
    window.scrollBy(0, autoScrollVel);
    autoScrollRAF = requestAnimationFrame(runAutoScroll);
  } else {
    autoScrollRAF = null;
  }
}
function stopAutoScroll() {
  autoScrollVel = 0;
  if (autoScrollRAF) { cancelAnimationFrame(autoScrollRAF); autoScrollRAF = null; }
}

function createTouchGhost(el) {
  var ghost = el.cloneNode(true);
  var rect  = el.getBoundingClientRect();
  ghost.style.cssText = 'position:fixed;left:' + rect.left + 'px;top:' + rect.top + 'px;width:' + rect.width + 'px;'
    + 'opacity:.75;pointer-events:none;z-index:9999;transform:scale(1.05);'
    + 'box-shadow:0 8px 24px rgba(0,0,0,.5);transition:none;border-radius:8px;';
  document.body.appendChild(ghost);
  return ghost;
}

function getTouchDropTarget(x, y) {
  if (touchGhost) touchGhost.style.display = 'none';
  var el = document.elementFromPoint(x, y);
  if (touchGhost) touchGhost.style.display = '';
  if (!el) return null;
  return el.closest('.kex') || el.closest('.kcol') || el.closest('#ebank') || null;
}

function addTouchDrag(el, getItemFn) {
  var startX, startY;

  el.addEventListener('touchstart', function(e) {
    if (e.target.closest('button')) return;
    var t = e.touches[0];
    startX = t.clientX; startY = t.clientY;
    touchLongPressTimer = setTimeout(function() {
      if (window.getSelection) window.getSelection().removeAllRanges();
      dragItem    = getItemFn();
      touchGhost  = createTouchGhost(el);
      el.classList.add('dragging');
      touchScrollBlocked = true;
    }, LONG_PRESS_MS);
  }, { passive:true });

  el.addEventListener('contextmenu', function(e) { if (!e.target.closest('button')) e.preventDefault(); });

  el.addEventListener('touchmove', function(e) {
    if (startX === undefined) return;
    var t  = e.touches[0];
    var dx = t.clientX - startX, dy = t.clientY - startY;
    if (!touchScrollBlocked && Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
    if (!dragItem) { clearTimeout(touchLongPressTimer); return; }
    e.preventDefault();

    var EDGE = 100, vy = t.clientY, vh = window.innerHeight, newVel = 0;
    if (vy < EDGE)      newVel = -Math.max(4, Math.round((EDGE - vy) / 8));
    else if (vy > vh - EDGE) newVel = Math.max(4, Math.round((vy - (vh - EDGE)) / 8));
    autoScrollVel = newVel;
    if (newVel !== 0 && !autoScrollRAF) autoScrollRAF = requestAnimationFrame(runAutoScroll);

    if (touchGhost) {
      touchGhost.style.left = (t.clientX - touchGhost.offsetWidth  / 2) + 'px';
      touchGhost.style.top  = (t.clientY - touchGhost.offsetHeight / 2) + 'px';
    }

    var target = getTouchDropTarget(t.clientX, t.clientY);
    if (target !== touchLastTarget) {
      if (touchLastTarget) {
        touchLastTarget.classList.remove('drag-over', 'drop-before', 'drop-after');
        touchLastTarget.style.borderColor = '';
      }
      touchLastTarget = target;
    }
    if (target) {
      if (target.classList.contains('kex')) {
        var rect   = target.getBoundingClientRect();
        var before = t.clientY < rect.top + rect.height / 2;
        target.classList.toggle('drop-before', before);
        target.classList.toggle('drop-after',  !before);
      } else if (target.classList.contains('kcol')) {
        target.classList.add('drag-over');
      } else {
        target.style.borderColor = 'var(--accent)';
      }
    }
  }, { passive:false });

  el.addEventListener('touchend', function(e) {
    clearTimeout(touchLongPressTimer);
    stopAutoScroll();
    touchScrollBlocked = false;
    if (touchGhost) { touchGhost.remove(); touchGhost = null; }
    el.classList.remove('dragging');
    if (touchLastTarget) { touchLastTarget.classList.remove('drag-over'); touchLastTarget.style.borderColor = ''; }
    if (!dragItem) { dragItem = null; touchLastTarget = null; return; }

    var t      = e.changedTouches[0];
    var target = getTouchDropTarget(t.clientX, t.clientY);
    if (target) {
      if (target.classList.contains('kex')) {
        // Drop sobre um card — insere antes ou depois
        var colEl = target.closest('.kcol');
        var cols  = Array.from(document.querySelectorAll('.kcol'));
        var di    = cols.indexOf(colEl);
        var cards = Array.from(colEl.querySelectorAll('.kex'));
        var cardIdx = cards.indexOf(target);
        var rect    = target.getBoundingClientRect();
        var before  = t.clientY < rect.top + rect.height / 2;
        var insertIdx = before ? cardIdx : cardIdx + 1;
        if (di >= 0) {
          if (dragItem.type === 'bank') {
            var ex = bank.find(function(b) { return b.id === dragItem.id; });
            if (ex) board[di].splice(insertIdx, 0, { id:uid(), srcId:ex.id, name:ex.name, kg:ex.kg, reps:ex.reps });
          } else if (dragItem.type === 'board') {
            var fromDay = dragItem.fromDay, fromIdx = dragItem.fromIdx;
            var item = board[fromDay].splice(fromIdx, 1)[0];
            if (item) {
              if (fromDay === di && fromIdx < insertIdx) insertIdx--;
              board[di].splice(Math.max(0, insertIdx), 0, item);
            }
          }
          renderKanban(); renderPeriodGrid(); saveState();
        }
      } else if (target.classList.contains('kcol')) {
        var cols = Array.from(document.querySelectorAll('.kcol'));
        var di   = cols.indexOf(target);
        if (di >= 0) {
          if (dragItem.type === 'bank') {
            var ex = bank.find(function(b) { return b.id === dragItem.id; });
            if (ex) board[di].push({ id:uid(), srcId:ex.id, name:ex.name, kg:ex.kg, reps:ex.reps });
          } else if (dragItem.type === 'board' && dragItem.fromDay !== di) {
            var item = board[dragItem.fromDay].splice(dragItem.fromIdx, 1)[0];
            if (item) board[di].push(item);
          }
          renderKanban(); renderPeriodGrid(); saveState();
        }
      } else if (target.id === 'ebank' && dragItem.type === 'board') {
        board[dragItem.fromDay].splice(dragItem.fromIdx, 1);
        renderKanban(); renderPeriodGrid(); saveState();
      }
    }
    dragItem = null; touchLastTarget = null;
  }, { passive:true });

  el.addEventListener('touchcancel', function() {
    clearTimeout(touchLongPressTimer);
    stopAutoScroll();
    touchScrollBlocked = false;
    if (touchGhost) { touchGhost.remove(); touchGhost = null; }
    el.classList.remove('dragging');
    if (touchLastTarget) { touchLastTarget.classList.remove('drag-over'); touchLastTarget.style.borderColor = ''; }
    dragItem = null; touchLastTarget = null;
  }, { passive:true });
}

// ── Criação de cards ──────────────────────────
function makeBankPill(ex) {
  var el = document.createElement('div');
  el.className = 'bpill';
  el.dataset.exid = ex.id;

  // Linha 1: badge grupo + nome
  var groupBadge = ex.group && GROUP_CSS[ex.group]
    ? '<span class="bpgroup ' + GROUP_CSS[ex.group] + '">' + GROUP_LABEL[ex.group] + '</span>'
    : '';
  var row1 = document.createElement('div');
  row1.className = 'bprow1';
  row1.innerHTML = (groupBadge ? groupBadge + ' ' : '') + '<span class="bpname">' + ex.name + '</span>';
  row1.draggable = false;
  el.appendChild(row1);

  // Linha 2: meta + botões
  var row2 = document.createElement('div');
  row2.className = 'bprow2';

  var meta = document.createElement('span');
  meta.className = 'bpmeta';
  meta.textContent = (ex.kg > 0 ? ex.kg + 'kg · ' : '') + ex.reps;
  row2.appendChild(meta);

  var acts = document.createElement('div');
  acts.className = 'bpacts';

  var editBtn = document.createElement('button');
  editBtn.className = 'bpedit';
  editBtn.textContent = '✎';
  editBtn.title = 'Editar';
  editBtn.addEventListener('click',      function(e) { e.stopPropagation(); openEditModal(ex.id); });
  editBtn.addEventListener('touchstart', function(e) { e.stopPropagation(); }, { passive:true });
  editBtn.addEventListener('touchend',   function(e) { e.stopPropagation(); e.preventDefault(); openEditModal(ex.id); }, { passive:false });

  var delBtn = document.createElement('button');
  delBtn.className = 'bpdel';
  delBtn.textContent = '×';
  delBtn.title = 'Remover';
  var _delBank = function(e) {
    e.stopPropagation();
    var saved = JSON.parse(JSON.stringify(ex));
    var idx   = bank.findIndex(function(b) { return b.id === ex.id; });
    bank = bank.filter(function(b) { return b.id !== ex.id; });
    renderBank();
    showUndo('"' + ex.name + '" removido do banco', function() { bank.splice(idx, 0, saved); renderBank(); }, saveState);
  };
  delBtn.addEventListener('click',      _delBank);
  delBtn.addEventListener('touchend',   function(e) { e.preventDefault(); _delBank(e); }, { passive:false });
  delBtn.addEventListener('touchstart', function(e) { e.stopPropagation(); }, { passive:true });

  acts.appendChild(editBtn); acts.appendChild(delBtn);
  row2.appendChild(acts);
  el.appendChild(row2);

  if (!isTouch) {
    el.draggable = true;
    el.addEventListener('dragstart', function(e) { dragItem = { type:'bank', id:ex.id }; el.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
    el.addEventListener('dragend',   function()  { el.classList.remove('dragging'); dragItem = null; });
  }
  addTouchDrag(el, function() { return { type:'bank', id:ex.id }; });
  return el;
}

function makeBoardCard(ex, di, ei) {
  var el = document.createElement('div');
  el.className   = 'kex';
  el.dataset.exid = ex.id;
  el.innerHTML = '<div class="kexname">' + ex.name + '</div>'
    + '<div class="kexmeta">' + (ex.kg > 0 ? ex.kg + 'kg · ' : '') + ex.reps + '</div>';

  if (ex.kg > 0) {
    var logBtn = document.createElement('button');
    logBtn.className = 'kexlog'; logBtn.textContent = '▶'; logBtn.title = 'Registrar série';
    logBtn.style.touchAction = 'manipulation';
    var _openLog = function(e) {
      e.stopPropagation();
      if (typeof openExLog === 'function') openExLog(di, ei);
    };
    logBtn.addEventListener('click',    _openLog);
    logBtn.addEventListener('touchstart', function(e) { e.stopPropagation(); }, { passive:true });
    logBtn.addEventListener('touchend',   function(e) { e.stopPropagation(); e.preventDefault(); _openLog(e); }, { passive:false });
    el.appendChild(logBtn);
  }

  var rm = document.createElement('button');
  rm.className = 'kexrm'; rm.textContent = '×';
  rm.style.touchAction = 'manipulation';
  var _removeCard = function(e) {
    e.stopPropagation();
    var saved = JSON.parse(JSON.stringify(board[di][ei]));
    var savedDi = di, savedEi = ei;
    board[di].splice(ei, 1);
    renderKanban(); renderPeriodGrid();
    showUndo('"' + saved.name + '" removido de ' + DAYS[savedDi], function() { board[savedDi].splice(savedEi, 0, saved); renderKanban(); renderPeriodGrid(); saveState(); }, saveState);
  };
  rm.addEventListener('click',      _removeCard);
  rm.addEventListener('touchstart', function(e) { e.stopPropagation(); }, { passive:true });
  rm.addEventListener('touchend',   function(e) { e.stopPropagation(); e.preventDefault(); _removeCard(e); }, { passive:false });
  el.appendChild(rm);

  if (!isTouch) {
    el.draggable = true;
    el.addEventListener('dragstart', function(e) {
      dragItem = { type:'board', id:ex.id, fromDay:di, fromIdx:ei };
      el.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    el.addEventListener('dragend', function() {
      el.classList.remove('dragging');
      clearCardDropIndicators();
      dragItem = null;
    });
    el.addEventListener('dragover', function(e) {
      if (!dragItem) return;
      e.preventDefault();
      e.stopPropagation(); // não propaga para a coluna (evita flash do indicador da coluna)
      var rect   = el.getBoundingClientRect();
      var before = e.clientY < rect.top + rect.height / 2;
      clearCardDropIndicators();
      el.classList.toggle('drop-before', before);
      el.classList.toggle('drop-after',  !before);
      dragOverCard = { day: di, idx: ei, before: before };
    });
    el.addEventListener('dragleave', function(e) {
      if (el.contains(e.relatedTarget)) return;
      el.classList.remove('drop-before', 'drop-after');
      dragOverCard = null;
    });
    el.addEventListener('drop', function(e) {
      e.preventDefault();
      e.stopPropagation();
      el.classList.remove('drop-before', 'drop-after');
      if (!dragItem) return;
      var before    = dragOverCard ? dragOverCard.before : true;
      var insertIdx = before ? ei : ei + 1;
      if (dragItem.type === 'bank') {
        var ex2 = bank.find(function(b) { return b.id === dragItem.id; });
        if (ex2) board[di].splice(insertIdx, 0, { id:uid(), srcId:ex2.id, name:ex2.name, kg:ex2.kg, reps:ex2.reps });
      } else if (dragItem.type === 'board') {
        var fromDay = dragItem.fromDay, fromIdx = dragItem.fromIdx;
        var item = board[fromDay].splice(fromIdx, 1)[0];
        if (item) {
          if (fromDay === di && fromIdx < insertIdx) insertIdx--;
          board[di].splice(Math.max(0, insertIdx), 0, item);
        }
      }
      dragOverCard = null;
      renderKanban(); renderPeriodGrid(); saveState();
    });
  }
  addTouchDrag(el, function() { return { type:'board', id:ex.id, fromDay:di, fromIdx:ei }; });
  return el;
}

function setupDropzone(colEl, dayIndex) {
  colEl.addEventListener('dragover', function(e) {
    // Se o dragover veio de um card filho ele já foi stopPropagated — só chega aqui no espaço vazio
    e.preventDefault();
    colEl.classList.add('drag-over');
    e.dataTransfer.dropEffect = 'move';
  });
  colEl.addEventListener('dragleave', function(e) {
    if (!colEl.contains(e.relatedTarget)) colEl.classList.remove('drag-over');
  });
  colEl.addEventListener('drop', function(e) {
    e.preventDefault();
    colEl.classList.remove('drag-over');
    clearCardDropIndicators();
    if (!dragItem) return;
    if (dragItem.type === 'bank') {
      var ex = bank.find(function(b) { return b.id === dragItem.id; });
      if (!ex) return;
      board[dayIndex].push({ id:uid(), srcId:ex.id, name:ex.name, kg:ex.kg, reps:ex.reps });
    } else if (dragItem.type === 'board') {
      if (dragItem.fromDay === dayIndex) return; // solto no espaço vazio da mesma coluna → sem mudança
      var item = board[dragItem.fromDay].splice(dragItem.fromIdx, 1)[0];
      if (item) board[dayIndex].push(item);
    }
    renderKanban(); renderPeriodGrid(); saveState();
  });
}

export function setupBankDropzone() {
  var bk = g('ebank');
  bk.addEventListener('dragover',  function(e) { if (dragItem && dragItem.type === 'board') { e.preventDefault(); bk.style.borderColor = 'var(--accent)'; } });
  bk.addEventListener('dragleave', function()  { bk.style.borderColor = ''; });
  bk.addEventListener('drop', function(e) {
    e.preventDefault(); bk.style.borderColor = '';
    if (!dragItem || dragItem.type !== 'board') return;
    board[dragItem.fromDay].splice(dragItem.fromIdx, 1);
    renderKanban(); renderPeriodGrid(); saveState();
  });
}

// ── Render ────────────────────────────────────
function updateWeeklyVolume() {
  var banner = g('weeklyVolumeBanner');
  var valEl  = g('weeklyVolumeVal');
  var daysEl = g('weeklyVolumeDays');
  if (!banner || !valEl) return;
  var total    = board.reduce(function(sum, day) { return sum + parseVolume(day); }, 0);
  var daysWithWork = board.filter(function(day) { return day.length > 0; }).length;
  if (total > 0) {
    banner.style.display = 'flex';
    valEl.textContent  = total >= 1000 ? (total / 1000).toFixed(1) + 't' : total + ' kg';
    daysEl.textContent = daysWithWork + ' dia' + (daysWithWork !== 1 ? 's' : '') + ' com treino';
  } else {
    banner.style.display = 'none';
  }
}

export function renderKanban() {
  var kb = g('kboard'); kb.innerHTML = '';
  updateWeeklyVolume();
  board.forEach(function(items, di) {
    var col  = document.createElement('div'); col.className = 'kcol';
    var kh   = document.createElement('div'); kh.className  = 'kch';
    var vol  = parseVolume(items);
    var volStr = vol >= 1000 ? (vol / 1000).toFixed(1) + 't' : (vol > 0 ? vol + 'kg' : '');
    kh.innerHTML = '<span class="kday">' + DAYS[di] + '</span><span class="kcnt">' + items.length + '</span>'
      + (volStr ? '<span class="kvol">' + volStr + '</span>' : '');
    col.appendChild(kh);
    var body = document.createElement('div'); body.className = 'kbody';
    items.forEach(function(ex, ei) { body.appendChild(makeBoardCard(ex, di, ei)); });
    col.appendChild(body);
    setupDropzone(col, di);
    kb.appendChild(col);
  });
}

export function renderBank() {
  var bk = g('ebank'); bk.innerHTML = '';
  var q  = _bankQuery.toLowerCase();
  var filtered = bank.filter(function(ex) {
    var matchQ = !q || ex.name.toLowerCase().indexOf(q) !== -1;
    var matchG = !_bankGroup || (ex.group || '') === _bankGroup;
    return matchQ && matchG;
  });
  if (!filtered.length) {
    bk.innerHTML = '<span class="bank-drop-hint">' + (q || _bankGroup ? 'Nenhum exercício encontrado.' : 'Adicione exercícios com o botão acima ↑') + '</span>';
    return;
  }
  filtered.forEach(function(ex) { bk.appendChild(makeBankPill(ex)); });
}

export function renderPeriodGrid() {
  var pg = g('pgrid'); if (!pg) return; pg.innerHTML = '';
  board.forEach(function(items, di) {
    var card = document.createElement('div'); card.className = 'wcol';
    var h = '<div class="wch"><span class="wcname">' + DAYS[di] + '</span></div><div class="wcbody">';
    if (!items.length) { h += '<span style="font-size:11px;color:var(--muted);">—</span>'; }
    else { items.forEach(function(ex) { h += '<div class="srow"><span class="slbl">' + ex.name + '</span><span class="sw">' + (ex.kg > 0 ? ex.kg + 'kg' : '—') + '</span><span class="sr">' + ex.reps + '</span></div>'; }); }
    h += '</div>'; card.innerHTML = h; pg.appendChild(card);
  });
}

// ── Modal de exercício ────────────────────────
var editingExId = null;

function openAddModal() {
  editingExId = null;
  g('mExTitle').textContent = 'Novo Exercício';
  g('mExName').value = ''; g('mExKg').value = ''; g('mExReps').value = ''; g('mExRepGoal').value = '';
  g('mExGroup').value = _bankGroup || '';
  g('btnConfirmEx').textContent = 'Adicionar';
  g('mExDeleteWrap').style.display = 'none';
  g('mAddEx').classList.add('on');
}

function openEditModal(id) {
  var ex = bank.find(function(b) { return b.id === id; });
  if (!ex) return;
  editingExId = id;
  g('mExTitle').textContent = 'Editar Exercício';
  g('mExName').value = ex.name; g('mExKg').value = ex.kg || ''; g('mExReps').value = ex.reps || ''; g('mExRepGoal').value = ex.repGoal || '';
  g('mExGroup').value = ex.group || '';
  g('btnConfirmEx').textContent = 'Salvar';
  g('mExDeleteWrap').style.display = 'block';
  g('mAddEx').classList.add('on');
}

g('bankSearch').addEventListener('input', function() { _bankQuery = this.value.trim(); renderBank(); });

g('mExName').addEventListener('input', function() {
  g('mExGroup').value = detectExerciseGroup(this.value);
});

g('btnAddEx').addEventListener('click', openAddModal);
g('btnCancelEx').addEventListener('click', function() { g('mAddEx').classList.remove('on'); });

g('bankGroupFilter').addEventListener('click', function(e) {
  var btn = e.target.closest('.bank-filter-btn'); if (!btn) return;
  _bankGroup = btn.dataset.group;
  document.querySelectorAll('.bank-filter-btn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  renderBank();
});

g('btnConfirmEx').addEventListener('click', function() {
  var name    = g('mExName').value.trim(); if (!name) return;
  var kg      = parseFloat(g('mExKg').value) || 0;
  var reps    = g('mExReps').value.trim() || '3x10';
  var group   = g('mExGroup').value;
  var repGoal = parseInt(g('mExRepGoal').value, 10) || 0;
  if (editingExId) {
    var ex      = bank.find(function(b) { return b.id === editingExId; });
    var oldName = ex ? ex.name : null;
    if (ex) {
      var oldKg = ex.kg;
      var now   = new Date().toLocaleDateString('pt-BR');
      if (!kgHistory[editingExId]) kgHistory[editingExId] = [];
      var hist = kgHistory[editingExId];
      if (hist.length === 0 && oldKg > 0) hist.push({ date:now, kg:oldKg, name:ex.name, note:'inicial' });
      if (kg !== oldKg && kg > 0)         hist.push({ date:now, kg:kg, name:name, note:'editado' });
      ex.name = name; ex.kg = kg; ex.reps = reps; ex.group = group; ex.repGoal = repGoal;
    }
    board.forEach(function(day) {
      day.forEach(function(item) {
        if (item.srcId === editingExId || item.id === editingExId || (oldName && item.name === oldName)) {
          item.name = name; item.kg = kg; item.reps = reps;
          item.srcId = editingExId;
        }
      });
    });
    renderKanban(); renderPeriodGrid();
  } else {
    bank.push({ id:uid(), name:name, kg:kg, reps:reps, group:group, repGoal:repGoal });
  }
  g('mAddEx').classList.remove('on');
  renderBank();
  renderProgressCharts();
  saveState();
});

g('btnDeleteEx').addEventListener('click', function() {
  if (!editingExId) return;
  bank = bank.filter(function(b) { return b.id !== editingExId; });
  g('mAddEx').classList.remove('on');
  renderBank();
  saveState();
});

// ── Progresso de Carga ────────────────────────
var progressChartInstances = {};

export function renderProgressCharts() {
  var ids       = Object.keys(kgHistory).filter(function(id) { return kgHistory[id].length >= 1; });
  var section   = g('progressSection');
  var container = g('progressCharts');
  if (!ids.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';

  Object.keys(progressChartInstances).forEach(function(id) {
    if (!ids.includes(id)) { progressChartInstances[id].destroy(); delete progressChartInstances[id]; }
  });

  ids.forEach(function(id) {
    var hist     = kgHistory[id];
    var exName   = hist[hist.length - 1].name;
    var canvasId = 'pgchart-' + id;

    var card = document.getElementById('pgcard-' + id);
    if (!card) {
      card    = document.createElement('div');
      card.id = 'pgcard-' + id;
      card.className = 'card';
      card.style.position = 'relative';
      card.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">'
        + '<div style="font-size:13px;font-weight:600;" id="pgname-' + id + '">' + exName + '</div>'
        + '<button data-exid="' + id + '" class="pg-clear-btn" style="background:transparent;border:none;color:var(--muted);font-size:18px;padding:0;cursor:pointer;line-height:1;" title="Limpar histórico">×</button>'
        + '</div>'
        + '<div style="position:relative;height:160px;"><canvas id="' + canvasId + '"></canvas></div>';
      card.querySelector('.pg-clear-btn').addEventListener('click', function() { clearExHistory(this.dataset.exid); });
      container.appendChild(card);
    } else {
      g('pgname-' + id).textContent = exName;
    }

    var labels = hist.map(function(p) { return p.date + (p.note === 'inicial' ? ' (inicial)' : ''); });
    var values = hist.map(function(p) { return p.kg; });

    if (progressChartInstances[id]) {
      progressChartInstances[id].data.labels = labels;
      progressChartInstances[id].data.datasets[0].data = values;
      progressChartInstances[id].update();
    } else {
      var ctx = document.getElementById(canvasId).getContext('2d');
      progressChartInstances[id] = new Chart(ctx, {
        type: 'line',
        data: { labels:labels, datasets:[{
          data:values, borderColor:'#6c63ff', backgroundColor:'rgba(108,99,255,.12)',
          borderWidth:2, pointRadius:5,
          pointBackgroundColor:values.map(function(v,i) { return i === 0 ? '#8a8898' : '#6c63ff'; }),
          pointBorderColor:'#0c0c0f', pointBorderWidth:2, fill:true, tension:0.3,
        }] },
        options: {
          responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{display:false}, tooltip:{callbacks:{label:function(c){return c.parsed.y+' kg';}}} },
          scales:{
            x:{ ticks:{color:'#8a8898',font:{size:10}}, grid:{color:'rgba(255,255,255,.04)'} },
            y:{ ticks:{color:'#8a8898',font:{size:10},callback:function(v){return v+' kg';}}, grid:{color:'rgba(255,255,255,.05)'}, beginAtZero:false }
          }
        }
      });
    }
  });

  Array.from(container.children).forEach(function(card) {
    var id = card.id.replace('pgcard-', '');
    if (!ids.includes(id)) container.removeChild(card);
  });
}

function clearExHistory(id) {
  delete kgHistory[id];
  if (progressChartInstances[id]) { progressChartInstances[id].destroy(); delete progressChartInstances[id]; }
  var card = document.getElementById('pgcard-' + id);
  if (card) card.remove();
  if (!Object.keys(kgHistory).length) g('progressSection').style.display = 'none';
  saveState();
}
