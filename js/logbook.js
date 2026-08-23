// ── GORILA GYM — logbook.js ──────────────────
// Kanban, banco de exercícios, drag-and-drop e progresso de carga

import { uid, g, round05, parseSetCount, getWeekRange, showUndo, saveState, kgHistory, exerciseNotes } from './state.js';
import { workoutLog } from './workoutlog.js';
import { DAYS } from './constants.js';
var _bankQuery = '';
var _bankGroup = localStorage.getItem('bankGroupFilter') || '';

function saveBoardState() {
  saveState();
}

var DELOAD_FACTOR = 0.6;
export var deloadMode = false;
export function setDeloadMode(v) { deloadMode = v; }

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

  // ── ISOLADOS ─────────────────────────────────────────
  // Movimentos uni-articulares não contam para MEV/MAV/MRV
  if (/elev.*later|elev.*front|lateral.*raise|front.*raise|crucifixo|voador|flye?\b|pec.?deck|cable.*cross|cross.*over|polia.*cross|\brosca\b|\bcurl\b|\bbicep|martelo|zottman|concentration|preacher|scott|spider.?curl|pushdown|pressdown|skull|frances|kickback.*tri|tri.*kickback|coice.*tri|tri.*coice|extens.*tri|tri.*extens|testa.*halt|testa.*barra|triceps.*testa|triceps.*halt|encolhim|shrug|face.?pull|reverse.?fl|voador.*post|passaro\b|rear.*delt|posterior.*ombro|leg.?curl|leg.?extens|cadeira.?flex|cadeira.?ext|extensao.*joelho|extensora\b|flexora\b|panturrilha|\bcalf\b|gemeos?\b|standing.*calf|seated.*calf|donkey.*calf|aducao|abducao|adutor|abdutor|maq.*adut|maq.*abdut|hip.?abduct|hip.?adduct|inner.?thigh|outer.?thigh|donkey.?kick|kickback.*glut|glut.*kickback|\bcoice\b|sissy/.test(n)) return '';

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
export let board      = DAYS.map(function() { return []; });
export let boardNames = DAYS.map(function() { return ''; });
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
export function setBoardNames(v) { boardNames = v; }
export function setBank(v) { bank = v; }

export let altBoards = [];
export function setAltBoards(v) { altBoards = v; }

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
  document.querySelectorAll('.kex.drop-before,.kex.drop-after,.altex.drop-before,.altex.drop-after').forEach(function(el) {
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
  return el.closest('.altex') || el.closest('.altcol') || el.closest('.kex') || el.closest('.kcol') || el.closest('#ebank') || null;
}

function addTouchDrag(el, getItemFn) {
  var startX, startY;

  el.addEventListener('touchstart', function(e) {
    // Grip handle: drag imediato sem long-press
    var onGrip = e.target.closest('.kexgrip');
    if (!onGrip && e.target.closest('button')) return;
    var t = e.touches[0];
    startX = t.clientX; startY = t.clientY;
    if (onGrip) {
      if (window.getSelection) window.getSelection().removeAllRanges();
      dragItem    = getItemFn();
      touchGhost  = createTouchGhost(el);
      el.classList.add('dragging');
      touchScrollBlocked = true;
      return;
    }
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
      if (target.classList.contains('altex') || target.classList.contains('kex')) {
        var rect   = target.getBoundingClientRect();
        var before = t.clientY < rect.top + rect.height / 2;
        target.classList.toggle('drop-before', before);
        target.classList.toggle('drop-after',  !before);
      } else if (target.classList.contains('altcol') || target.classList.contains('kcol')) {
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
      if (target.classList.contains('altex')) {
        var colEl = target.closest('.altcol');
        var altCols = Array.from(document.querySelectorAll('.altcol'));
        var bi = altCols.indexOf(colEl);
        var cards = Array.from(colEl.querySelectorAll('.altex'));
        var cardIdx = cards.indexOf(target);
        var rect = target.getBoundingClientRect();
        var before = t.clientY < rect.top + rect.height / 2;
        var insertIdx = before ? cardIdx : cardIdx + 1;
        if (bi >= 0) {
          if (dragItem.type === 'bank') {
            var ex = bank.find(function(b) { return b.id === dragItem.id; });
            if (ex) altBoards[bi].exercises.splice(insertIdx, 0, { id:uid(), srcId:ex.id, name:ex.name, kg:ex.kg, reps:ex.reps, group:ex.group||'', bilateral:ex.bilateral||false });
          } else if (dragItem.type === 'board') {
            var item = board[dragItem.fromDay].splice(dragItem.fromIdx, 1)[0];
            if (item) altBoards[bi].exercises.splice(insertIdx, 0, item);
            renderKanban(); renderPeriodGrid();
          } else if (dragItem.type === 'alt') {
            var fromBi = dragItem.fromBoard, fromEi = dragItem.fromIdx;
            var item = altBoards[fromBi].exercises.splice(fromEi, 1)[0];
            if (item) {
              if (fromBi === bi && fromEi < insertIdx) insertIdx--;
              altBoards[bi].exercises.splice(Math.max(0, insertIdx), 0, item);
            }
          }
          renderAltBoards(); saveBoardState();
        }
      } else if (target.classList.contains('altcol')) {
        var altCols = Array.from(document.querySelectorAll('.altcol'));
        var bi = altCols.indexOf(target);
        if (bi >= 0) {
          if (dragItem.type === 'bank') {
            var ex = bank.find(function(b) { return b.id === dragItem.id; });
            if (ex) altBoards[bi].exercises.push({ id:uid(), srcId:ex.id, name:ex.name, kg:ex.kg, reps:ex.reps, group:ex.group||'', bilateral:ex.bilateral||false });
          } else if (dragItem.type === 'board') {
            var item = board[dragItem.fromDay].splice(dragItem.fromIdx, 1)[0];
            if (item) altBoards[bi].exercises.push(item);
            renderKanban(); renderPeriodGrid();
          } else if (dragItem.type === 'alt' && dragItem.fromBoard !== bi) {
            var item = altBoards[dragItem.fromBoard].exercises.splice(dragItem.fromIdx, 1)[0];
            if (item) altBoards[bi].exercises.push(item);
          }
          renderAltBoards(); saveBoardState();
        }
      } else if (target.classList.contains('kex')) {
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
            if (ex) board[di].splice(insertIdx, 0, { id:uid(), srcId:ex.id, name:ex.name, kg:ex.kg, reps:ex.reps, group:ex.group||'', bilateral:ex.bilateral||false });
          } else if (dragItem.type === 'board') {
            var fromDay = dragItem.fromDay, fromIdx = dragItem.fromIdx;
            var item = board[fromDay].splice(fromIdx, 1)[0];
            if (item) {
              if (fromDay === di && fromIdx < insertIdx) insertIdx--;
              board[di].splice(Math.max(0, insertIdx), 0, item);
            }
          } else if (dragItem.type === 'alt') {
            var item = altBoards[dragItem.fromBoard].exercises.splice(dragItem.fromIdx, 1)[0];
            if (item) board[di].splice(insertIdx, 0, item);
            renderAltBoards();
          }
          renderKanban(); renderPeriodGrid(); saveBoardState();
        }
      } else if (target.classList.contains('kcol')) {
        var cols = Array.from(document.querySelectorAll('.kcol'));
        var di   = cols.indexOf(target);
        if (di >= 0) {
          if (dragItem.type === 'bank') {
            var ex = bank.find(function(b) { return b.id === dragItem.id; });
            if (ex) board[di].push({ id:uid(), srcId:ex.id, name:ex.name, kg:ex.kg, reps:ex.reps, group:ex.group||'', bilateral:ex.bilateral||false });
          } else if (dragItem.type === 'board' && dragItem.fromDay !== di) {
            var item = board[dragItem.fromDay].splice(dragItem.fromIdx, 1)[0];
            if (item) board[di].push(item);
          } else if (dragItem.type === 'alt') {
            var item = altBoards[dragItem.fromBoard].exercises.splice(dragItem.fromIdx, 1)[0];
            if (item) board[di].push(item);
            renderAltBoards();
          }
          renderKanban(); renderPeriodGrid(); saveBoardState();
        }
      } else if (target.id === 'ebank') {
        if (dragItem.type === 'board') {
          board[dragItem.fromDay].splice(dragItem.fromIdx, 1);
          renderKanban(); renderPeriodGrid(); saveBoardState();
        } else if (dragItem.type === 'alt') {
          altBoards[dragItem.fromBoard].exercises.splice(dragItem.fromIdx, 1);
          renderAltBoards(); saveBoardState();
        }
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
  row1.innerHTML = (groupBadge ? groupBadge + ' ' : '') + '<span class="bpname" title="Clique para ver detalhes">' + ex.name + '</span>' + (ex.bilateral ? ' <span class="bilat-badge">×2</span>' : '');
  row1.draggable = false;
  el.appendChild(row1);
  var bpNameEl = row1.querySelector('.bpname');
  if (bpNameEl) {
    bpNameEl.style.cursor = 'pointer';
    bpNameEl.addEventListener('click', function(e) { e.stopPropagation(); openExDetail(ex); });
  }

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
  var _delPending = false, _delTimer = null;
  var _cancelDelPending = function() {
    _delPending = false;
    clearTimeout(_delTimer);
    delBtn.textContent = '×';
    delBtn.style.background = '';
    delBtn.style.color = '';
  };
  var _delBank = function(e) {
    e.stopPropagation();
    if (!_delPending) {
      _delPending = true;
      delBtn.textContent = '✓?';
      delBtn.style.background = 'var(--red,#e05)';
      delBtn.style.color = '#fff';
      _delTimer = setTimeout(_cancelDelPending, 3000);
    } else {
      clearTimeout(_delTimer);
      _delPending = false;
      var saved = JSON.parse(JSON.stringify(ex));
      var idx   = bank.findIndex(function(b) { return b.id === ex.id; });
      bank = bank.filter(function(b) { return b.id !== ex.id; });
      renderBank();
      showUndo('"' + ex.name + '" removido do banco', function() { bank.splice(idx, 0, saved); renderBank(); saveState(); }, saveState);
    }
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

// Trava de edição de peso — persistida em localStorage. Evita cliques acidentais no mobile.
var _kgEditLocked = localStorage.getItem('kgEditLocked') === '1';
if (_kgEditLocked && typeof document !== 'undefined' && document.body) document.body.classList.add('kg-locked');

function isKgEditLocked() { return _kgEditLocked; }

// Ícones Material Design (filled) 24×24 — herdam cor via fill=currentColor
var _SVG_LOCK      = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>';
var _SVG_LOCK_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>';

function syncKgLockBtn() {
  var btn = g('btnKgLock'); if (!btn) return;
  btn.innerHTML = _kgEditLocked ? _SVG_LOCK : _SVG_LOCK_OPEN;
  btn.title     = _kgEditLocked ? 'Destravar edição de peso' : 'Travar edição de peso';
  btn.setAttribute('aria-label', btn.title);
  btn.classList.toggle('kg-lock-on', _kgEditLocked);
}

(function() {
  var btn = g('btnKgLock'); if (!btn) return;
  btn.addEventListener('click', function() {
    _kgEditLocked = !_kgEditLocked;
    localStorage.setItem('kgEditLocked', _kgEditLocked ? '1' : '0');
    document.body.classList.toggle('kg-locked', _kgEditLocked);
    syncKgLockBtn();
  });
  syncKgLockBtn();
})();

// Anexa edição inline do peso a um span. onSave(newKg) é chamado após validação.
function attachInlineKgEditor(span, ex, onSave) {
  span.style.cursor = 'pointer';
  span.title = ex.kg > 0 ? 'Clique para editar peso' : 'Clique para definir peso';
  var startEdit = function(e) {
    if (isKgEditLocked()) { e.stopPropagation(); return; }
    e.stopPropagation();
    if (span.dataset.editing === '1') return;
    span.dataset.editing = '1';
    var inp = document.createElement('input');
    inp.type = 'number'; inp.step = '0.5'; inp.min = '0';
    inp.value = ex.kg > 0 ? String(ex.kg) : '';
    inp.draggable = false;
    inp.style.cssText = 'width:52px;font-family:var(--mono);font-size:10px;padding:1px 4px;background:var(--bg2);border:1px solid var(--accent);color:var(--text);border-radius:3px;';
    span.replaceWith(inp);
    inp.focus(); inp.select();
    var done = false;
    var commit = function(save) {
      if (done) return; done = true;
      var changed = false;
      if (save) {
        var v = parseFloat(inp.value);
        if (isFinite(v) && v >= 0 && v !== ex.kg) { onSave(v); changed = true; }
      }
      // Se onSave foi chamado, a re-render substitui o card inteiro.
      // Sem mudança (ou cancel), restaura o span manualmente para fechar o input.
      if (!changed && inp.parentNode) {
        inp.replaceWith(span);
        span.dataset.editing = '';
      }
    };
    inp.addEventListener('blur',    function() { commit(true); });
    inp.addEventListener('keydown', function(ev) {
      if (ev.key === 'Enter')  { ev.preventDefault(); inp.blur(); }
      if (ev.key === 'Escape') { ev.preventDefault(); commit(false); }
    });
    // Impede drag/touch enquanto edita
    inp.addEventListener('mousedown',  function(ev) { ev.stopPropagation(); });
    inp.addEventListener('touchstart', function(ev) { ev.stopPropagation(); }, { passive:true });
  };
  span.addEventListener('click', startEdit);
  span.addEventListener('mousedown',  function(e) { e.stopPropagation(); });
  span.addEventListener('touchstart', function(e) { e.stopPropagation(); }, { passive:true });
  span.addEventListener('touchend',   function(e) { e.stopPropagation(); e.preventDefault(); startEdit(e); }, { passive:false });
}

// Atualiza kgHistory ao editar peso inline (mesma lógica do editor do banco)
function recordKgHistoryChange(srcId, oldKg, newKg, name) {
  if (!srcId) return;
  var now = new Date().toLocaleDateString('pt-BR');
  if (!kgHistory[srcId]) kgHistory[srcId] = [];
  var hist = kgHistory[srcId];
  if (hist.length === 0 && oldKg > 0) hist.push({ date:now, kg:oldKg, name:name, note:'inicial' });
  if (newKg !== oldKg && newKg > 0)   hist.push({ date:now, kg:newKg, name:name, note:'editado' });
}

function makeBoardCard(ex, di, ei) {
  var el = document.createElement('div');
  el.className   = 'kex';
  el.dataset.exid = ex.id;
  var dispKg = (deloadMode && ex.kg > 0) ? Math.round(ex.kg * DELOAD_FACTOR) : ex.kg;
  if (deloadMode && ex.kg > 0) el.classList.add('kex--deload');
  var kgLabel = dispKg > 0 ? (dispKg + 'kg') : '+ peso';
  el.innerHTML = '<span class="kexgrip" title="Arraste para mover">⋮⋮</span>'
    + '<div class="kexname" title="Clique para ver detalhes">' + ex.name + (ex.bilateral ? ' <span class="bilat-badge">×2</span>' : '') + '</div>'
    + '<div class="kexmeta' + (deloadMode && ex.kg > 0 ? ' kexmeta--deload' : '') + '">'
    + '<span class="kexkg">' + kgLabel + '</span> · ' + ex.reps + '</div>';
  attachInlineKgEditor(el.querySelector('.kexkg'), ex, function(newKg) {
    var srcId = ex.srcId || ex.id;
    recordKgHistoryChange(srcId, ex.kg, newKg, ex.name);
    board[di][ei].kg = newKg;
    renderKanban(); renderPeriodGrid();
    if (typeof renderProgressCharts === 'function') renderProgressCharts();
    saveBoardState();
  });
  var nameEl = el.querySelector('.kexname');
  if (nameEl) {
    nameEl.style.cursor = 'pointer';
    nameEl.addEventListener('click', function(e) { e.stopPropagation(); openExDetail(ex); });
  }

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
  var _rmPending = false, _rmTimer = null;
  var _doRemove = function() {
    var saved = JSON.parse(JSON.stringify(board[di][ei]));
    var savedDi = di, savedEi = ei;
    board[di].splice(ei, 1);
    renderKanban(); renderPeriodGrid();
    showUndo('"' + saved.name + '" removido de ' + DAYS[savedDi], function() { board[savedDi].splice(savedEi, 0, saved); renderKanban(); renderPeriodGrid(); saveState(); }, saveState);
  };
  var _cancelPending = function() {
    _rmPending = false;
    clearTimeout(_rmTimer);
    rm.textContent = '×';
    rm.style.background = '';
    rm.style.color = '';
  };
  var _removeCard = function(e) {
    e.stopPropagation();
    if (!_rmPending) {
      _rmPending = true;
      rm.textContent = '✓?';
      rm.style.background = 'var(--red,#e05)';
      rm.style.color = '#fff';
      _rmTimer = setTimeout(_cancelPending, 3000);
    } else {
      clearTimeout(_rmTimer);
      _doRemove();
    }
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
        if (ex2) board[di].splice(insertIdx, 0, { id:uid(), srcId:ex2.id, name:ex2.name, kg:ex2.kg, reps:ex2.reps, group:ex2.group||'', bilateral:ex2.bilateral||false });
      } else if (dragItem.type === 'board') {
        var fromDay = dragItem.fromDay, fromIdx = dragItem.fromIdx;
        var item = board[fromDay].splice(fromIdx, 1)[0];
        if (item) {
          if (fromDay === di && fromIdx < insertIdx) insertIdx--;
          board[di].splice(Math.max(0, insertIdx), 0, item);
        }
      } else if (dragItem.type === 'alt') {
        var item = altBoards[dragItem.fromBoard].exercises.splice(dragItem.fromIdx, 1)[0];
        if (item) board[di].splice(insertIdx, 0, item);
        renderAltBoards();
      }
      dragOverCard = null;
      renderKanban(); renderPeriodGrid(); saveBoardState();
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
      board[dayIndex].push({ id:uid(), srcId:ex.id, name:ex.name, kg:ex.kg, reps:ex.reps, group:ex.group||'', bilateral:ex.bilateral||false });
    } else if (dragItem.type === 'board') {
      if (dragItem.fromDay === dayIndex) return; // solto no espaço vazio da mesma coluna → sem mudança
      var item = board[dragItem.fromDay].splice(dragItem.fromIdx, 1)[0];
      if (item) board[dayIndex].push(item);
    } else if (dragItem.type === 'alt') {
      var item = altBoards[dragItem.fromBoard].exercises.splice(dragItem.fromIdx, 1)[0];
      if (item) board[dayIndex].push(item);
      renderAltBoards();
    }
    renderKanban(); renderPeriodGrid(); saveBoardState();
  });
}

export function setupBankDropzone() {
  var bk = g('ebank');
  bk.addEventListener('dragover',  function(e) { if (dragItem && (dragItem.type === 'board' || dragItem.type === 'alt')) { e.preventDefault(); bk.style.borderColor = 'var(--accent)'; } });
  bk.addEventListener('dragleave', function()  { bk.style.borderColor = ''; });
  bk.addEventListener('drop', function(e) {
    e.preventDefault(); bk.style.borderColor = '';
    if (!dragItem) return;
    if (dragItem.type === 'board') {
      board[dragItem.fromDay].splice(dragItem.fromIdx, 1);
      renderKanban(); renderPeriodGrid(); saveBoardState();
    } else if (dragItem.type === 'alt') {
      altBoards[dragItem.fromBoard].exercises.splice(dragItem.fromIdx, 1);
      renderAltBoards(); saveBoardState();
    }
  });
}

// ── Render ────────────────────────────────────
function updateWeeklyVolume() {
  var banner = g('weeklyVolumeBanner');
  var valEl  = g('weeklyVolumeVal');
  var daysEl = g('weeklyVolumeDays');
  if (!banner || !valEl) return;
  var total    = board.reduce(function(sum, day) { return sum + parseVolume(day); }, 0) * (deloadMode ? DELOAD_FACTOR : 1);
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
    var vol  = parseVolume(items) * (deloadMode ? DELOAD_FACTOR : 1);
    var volStr = vol >= 1000 ? (vol / 1000).toFixed(1) + 't' : (vol > 0 ? vol + 'kg' : '');
    var bname = boardNames[di] || '';
    kh.innerHTML =
      '<div class="kch-top">'
      + '<span class="kday">' + DAYS[di] + '</span>'
      + '<span class="kcnt">' + items.length + '</span>'
      + (volStr ? '<span class="kvol">' + volStr + '</span>' : '')
      + '</div>'
      + '<span class="kwname' + (bname ? '' : ' kwname-empty') + '">'
      + (bname ? bname : '+ treino')
      + '</span>';
    kh.querySelector('.kwname').addEventListener('click', function(e) {
      e.stopPropagation();
      var span = e.currentTarget;
      var inp  = document.createElement('input');
      inp.className   = 'kwname-inp';
      inp.value       = boardNames[di] || '';
      inp.placeholder = 'ex: Push A';
      inp.maxLength   = 24;
      span.replaceWith(inp);
      inp.focus(); inp.select();
      function save() { boardNames[di] = inp.value.trim(); renderKanban(); saveBoardState(); }
      inp.addEventListener('keydown', function(ev) {
        if (ev.key === 'Enter')  { inp.blur(); }
        if (ev.key === 'Escape') { renderKanban(); }
      });
      inp.addEventListener('blur', save);
    });
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
    var h = '<div class="wch"><span class="wcname">' + DAYS[di] + '</span>'
      + (boardNames[di] ? '<span class="wctag">' + boardNames[di] + '</span>' : '')
      + '</div><div class="wcbody">';
    if (!items.length) { h += '<span style="font-size:11px;color:var(--muted);">—</span>'; }
    else { items.forEach(function(ex) { var pgKg = (deloadMode && ex.kg > 0) ? Math.round(ex.kg * DELOAD_FACTOR) : ex.kg; h += '<div class="srow"><span class="slbl">' + ex.name + '</span><span class="sw' + (deloadMode && ex.kg > 0 ? ' sw--deload' : '') + '">' + (pgKg > 0 ? pgKg + 'kg' : '—') + '</span><span class="sr">' + ex.reps + '</span></div>'; }); }
    h += '</div>'; card.innerHTML = h; pg.appendChild(card);
  });
}

// ── Treinos Alternativos ──────────────────────

function makeAltCard(ex, bi, ei) {
  var el = document.createElement('div');
  el.className = 'altex';
  el.dataset.exid = ex.id;
  var dispKg = (deloadMode && ex.kg > 0) ? Math.round(ex.kg * DELOAD_FACTOR) : ex.kg;
  if (deloadMode && ex.kg > 0) el.classList.add('kex--deload');
  var kgLabel = dispKg > 0 ? (dispKg + 'kg') : '+ peso';
  el.innerHTML = '<span class="kexgrip" title="Arraste para mover">⋮⋮</span>'
    + '<div class="kexname" title="Clique para ver detalhes">' + ex.name + (ex.bilateral ? ' <span class="bilat-badge">×2</span>' : '') + '</div>'
    + '<div class="kexmeta' + (deloadMode && ex.kg > 0 ? ' kexmeta--deload' : '') + '">'
    + '<span class="kexkg">' + kgLabel + '</span> · ' + ex.reps + '</div>';
  attachInlineKgEditor(el.querySelector('.kexkg'), ex, function(newKg) {
    var srcId = ex.srcId || ex.id;
    recordKgHistoryChange(srcId, ex.kg, newKg, ex.name);
    altBoards[bi].exercises[ei].kg = newKg;
    renderAltBoards();
    if (typeof renderProgressCharts === 'function') renderProgressCharts();
    saveBoardState();
  });
  var altNameEl = el.querySelector('.kexname');
  if (altNameEl) {
    altNameEl.style.cursor = 'pointer';
    altNameEl.addEventListener('click', function(e) { e.stopPropagation(); openExDetail(ex); });
  }

  if (ex.kg > 0) {
    var logBtn = document.createElement('button');
    logBtn.className = 'kexlog'; logBtn.textContent = '▶'; logBtn.title = 'Registrar série';
    logBtn.style.touchAction = 'manipulation';
    var _openLog = function(e) {
      e.stopPropagation();
      if (typeof openAltExLog === 'function') openAltExLog(bi, ei);
    };
    logBtn.addEventListener('click', _openLog);
    logBtn.addEventListener('touchstart', function(e) { e.stopPropagation(); }, { passive:true });
    logBtn.addEventListener('touchend', function(e) { e.stopPropagation(); e.preventDefault(); _openLog(e); }, { passive:false });
    el.appendChild(logBtn);
  }

  var rm = document.createElement('button');
  rm.className = 'kexrm'; rm.textContent = '×';
  rm.style.touchAction = 'manipulation';
  var _rmPending = false, _rmTimer = null;
  var _cancelPending = function() {
    _rmPending = false; clearTimeout(_rmTimer);
    rm.textContent = '×'; rm.style.background = ''; rm.style.color = '';
  };
  var _removeCard = function(e) {
    e.stopPropagation();
    if (!_rmPending) {
      _rmPending = true; rm.textContent = '✓?';
      rm.style.background = 'var(--red,#e05)'; rm.style.color = '#fff';
      _rmTimer = setTimeout(_cancelPending, 3000);
    } else {
      clearTimeout(_rmTimer);
      altBoards[bi].exercises.splice(ei, 1);
      renderAltBoards(); saveBoardState();
    }
  };
  rm.addEventListener('click', _removeCard);
  rm.addEventListener('touchstart', function(e) { e.stopPropagation(); }, { passive:true });
  rm.addEventListener('touchend', function(e) { e.stopPropagation(); e.preventDefault(); _removeCard(e); }, { passive:false });
  el.appendChild(rm);

  if (!isTouch) {
    el.draggable = true;
    el.addEventListener('dragstart', function(e) {
      dragItem = { type:'alt', id:ex.id, fromBoard:bi, fromIdx:ei };
      el.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move';
    });
    el.addEventListener('dragend', function() {
      el.classList.remove('dragging'); clearCardDropIndicators(); dragItem = null;
    });
    el.addEventListener('dragover', function(e) {
      if (!dragItem) return;
      e.preventDefault(); e.stopPropagation();
      var rect = el.getBoundingClientRect();
      var before = e.clientY < rect.top + rect.height / 2;
      clearCardDropIndicators();
      el.classList.toggle('drop-before', before);
      el.classList.toggle('drop-after', !before);
      dragOverCard = { board: bi, idx: ei, before: before };
    });
    el.addEventListener('dragleave', function(e) {
      if (el.contains(e.relatedTarget)) return;
      el.classList.remove('drop-before', 'drop-after');
      dragOverCard = null;
    });
    el.addEventListener('drop', function(e) {
      e.preventDefault(); e.stopPropagation();
      el.classList.remove('drop-before', 'drop-after');
      if (!dragItem) return;
      var before = dragOverCard ? dragOverCard.before : true;
      var insertIdx = before ? ei : ei + 1;
      if (dragItem.type === 'bank') {
        var ex2 = bank.find(function(b) { return b.id === dragItem.id; });
        if (ex2) altBoards[bi].exercises.splice(insertIdx, 0, { id:uid(), srcId:ex2.id, name:ex2.name, kg:ex2.kg, reps:ex2.reps, group:ex2.group||'', bilateral:ex2.bilateral||false });
      } else if (dragItem.type === 'board') {
        var item = board[dragItem.fromDay].splice(dragItem.fromIdx, 1)[0];
        if (item) altBoards[bi].exercises.splice(insertIdx, 0, item);
        renderKanban(); renderPeriodGrid();
      } else if (dragItem.type === 'alt') {
        var fromBi = dragItem.fromBoard, fromEi = dragItem.fromIdx;
        var item = altBoards[fromBi].exercises.splice(fromEi, 1)[0];
        if (item) {
          if (fromBi === bi && fromEi < insertIdx) insertIdx--;
          altBoards[bi].exercises.splice(Math.max(0, insertIdx), 0, item);
        }
      }
      dragOverCard = null;
      renderAltBoards(); saveBoardState();
    });
  }
  addTouchDrag(el, function() { return { type:'alt', id:ex.id, fromBoard:bi, fromIdx:ei }; });
  return el;
}

function setupAltDropzone(colEl, bi) {
  colEl.addEventListener('dragover', function(e) {
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
      altBoards[bi].exercises.push({ id:uid(), srcId:ex.id, name:ex.name, kg:ex.kg, reps:ex.reps, group:ex.group||'', bilateral:ex.bilateral||false });
    } else if (dragItem.type === 'board') {
      var item = board[dragItem.fromDay].splice(dragItem.fromIdx, 1)[0];
      if (item) altBoards[bi].exercises.push(item);
      renderKanban(); renderPeriodGrid();
    } else if (dragItem.type === 'alt') {
      if (dragItem.fromBoard === bi) return;
      var item = altBoards[dragItem.fromBoard].exercises.splice(dragItem.fromIdx, 1)[0];
      if (item) altBoards[bi].exercises.push(item);
    }
    renderAltBoards(); saveBoardState();
  });
}

export function renderAltBoards() {
  var container = g('altboards');
  if (!container) return;
  container.innerHTML = '';
  if (!altBoards.length) {
    container.innerHTML = '<span style="font-size:12px;color:var(--muted);padding:6px 0;display:block;">Nenhum treino alternativo — clique em "+ Novo" para criar.</span>';
    return;
  }
  altBoards.forEach(function(ab, bi) {
    var col = document.createElement('div');
    col.className = 'altcol';

    var hdr = document.createElement('div');
    hdr.className = 'kch';
    var kchTop = document.createElement('div');
    kchTop.className = 'kch-top';

    var nameSpan = document.createElement('span');
    nameSpan.className = 'kwname' + (ab.name ? '' : ' kwname-empty');
    nameSpan.textContent = ab.name || '+ nome';
    nameSpan.style.flex = '1';
    nameSpan.addEventListener('click', function(e) {
      e.stopPropagation();
      var inp = document.createElement('input');
      inp.className = 'kwname-inp';
      inp.value = ab.name || '';
      inp.placeholder = 'ex: Push A';
      inp.maxLength = 32;
      nameSpan.replaceWith(inp);
      inp.focus(); inp.select();
      function save() { ab.name = inp.value.trim(); renderAltBoards(); saveBoardState(); }
      inp.addEventListener('keydown', function(ev) {
        if (ev.key === 'Enter') inp.blur();
        if (ev.key === 'Escape') renderAltBoards();
      });
      inp.addEventListener('blur', save);
    });

    var cntSpan = document.createElement('span');
    cntSpan.className = 'kcnt';
    cntSpan.textContent = ab.exercises.length;

    var delBtn = document.createElement('button');
    delBtn.className = 'sec';
    delBtn.textContent = '×';
    delBtn.title = 'Remover treino';
    delBtn.style.cssText = 'padding:2px 7px;font-size:13px;line-height:1;flex-shrink:0;margin-left:8px;';
    var _delPending = false, _delTimer = null;
    delBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (!_delPending) {
        _delPending = true; delBtn.textContent = '✓?';
        delBtn.style.background = 'var(--red,#e05)'; delBtn.style.color = '#fff';
        delBtn.style.borderColor = 'var(--red,#e05)';
        _delTimer = setTimeout(function() {
          _delPending = false; delBtn.textContent = '×';
          delBtn.style.background = ''; delBtn.style.color = ''; delBtn.style.borderColor = '';
        }, 3000);
      } else {
        clearTimeout(_delTimer);
        altBoards.splice(bi, 1);
        renderAltBoards(); saveBoardState();
      }
    });

    kchTop.appendChild(nameSpan);
    kchTop.appendChild(cntSpan);
    kchTop.appendChild(delBtn);
    hdr.appendChild(kchTop);
    col.appendChild(hdr);

    var body = document.createElement('div');
    body.className = 'kbody';
    ab.exercises.forEach(function(ex, ei) { body.appendChild(makeAltCard(ex, bi, ei)); });
    col.appendChild(body);

    setupAltDropzone(col, bi);
    container.appendChild(col);
  });
}

(function() {
  var btn = g('btnAddAltBoard');
  if (btn) btn.addEventListener('click', function() {
    altBoards.push({ id: uid(), name: '', exercises: [] });
    renderAltBoards(); saveBoardState();
  });
})();

// ── Modal de exercício ────────────────────────
var editingExId = null;
var DRAFT_KEY   = 'mAddExDraft';

function saveDraft() {
  if (editingExId) return; // Rascunho só no modo "Novo"
  var d = {
    name:      g('mExName').value,
    kg:        g('mExKg').value,
    reps:      g('mExReps').value,
    repGoal:   g('mExRepGoal').value,
    group:     g('mExGroup').value,
    bilateral: g('mExBilateral').checked,
  };
  if (!d.name && !d.kg && !d.reps && !d.repGoal && !d.bilateral) {
    sessionStorage.removeItem(DRAFT_KEY); return;
  }
  try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch(e) {}
}
function restoreDraft() {
  try {
    var raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return false;
    var d = JSON.parse(raw);
    if (d.name)      g('mExName').value      = d.name;
    if (d.kg)        g('mExKg').value        = d.kg;
    if (d.reps)      g('mExReps').value      = d.reps;
    if (d.repGoal)   g('mExRepGoal').value   = d.repGoal;
    if (d.group)     g('mExGroup').value     = d.group;
    if (d.bilateral) g('mExBilateral').checked = true;
    return !!(d.name || d.kg || d.reps || d.repGoal || d.bilateral);
  } catch(e) { return false; }
}
function clearDraft() { try { sessionStorage.removeItem(DRAFT_KEY); } catch(e) {} }

function openAddModal() {
  editingExId = null;
  g('mExTitle').textContent = 'Novo Exercício';
  g('mExName').value = ''; g('mExKg').value = ''; g('mExReps').value = ''; g('mExRepGoal').value = '';
  g('mExGroup').value = _bankGroup || '';
  g('mExBilateral').checked = false;
  g('btnConfirmEx').textContent = 'Adicionar';
  g('mExDeleteWrap').style.display = 'none';
  if (restoreDraft()) g('mExTitle').textContent = 'Novo Exercício · rascunho';
  g('mAddEx').classList.add('on');
}

function openEditModal(id) {
  var ex = bank.find(function(b) { return b.id === id; });
  if (!ex) return;
  editingExId = id;
  g('mExTitle').textContent = 'Editar Exercício';
  g('mExName').value = ex.name; g('mExKg').value = ex.kg || ''; g('mExReps').value = ex.reps || ''; g('mExRepGoal').value = ex.repGoal || '';
  g('mExGroup').value = ex.group || '';
  g('mExBilateral').checked = !!ex.bilateral;
  g('btnConfirmEx').textContent = 'Salvar';
  g('mExDeleteWrap').style.display = 'block';
  g('mAddEx').classList.add('on');
}

g('bankSearch').addEventListener('input', function() { _bankQuery = this.value.trim(); renderBank(); });

g('mExName').addEventListener('input', function() {
  g('mExGroup').value = detectExerciseGroup(this.value);
});

// Auto-save de rascunho enquanto o usuário digita
['mExName','mExKg','mExReps','mExRepGoal','mExGroup'].forEach(function(id) {
  var el = g(id); if (el) el.addEventListener('input', saveDraft);
});
var _mExBil = g('mExBilateral');
if (_mExBil) _mExBil.addEventListener('change', saveDraft);

g('btnAddEx').addEventListener('click', openAddModal);

(function() {
  var body = g('bankBody');
  var btn  = g('btnToggleBank');
  if (!body || !btn) return;
  var hidden = localStorage.getItem('bankHidden') === '1';
  function applyBankToggle() {
    body.style.display = hidden ? 'none' : '';
    btn.textContent = hidden ? '▼ mostrar' : '▲ ocultar';
    btn.title = hidden ? 'Mostrar banco' : 'Ocultar banco';
  }
  applyBankToggle();
  btn.addEventListener('click', function() {
    hidden = !hidden;
    localStorage.setItem('bankHidden', hidden ? '1' : '0');
    applyBankToggle();
  });
})();

// Toggle Progresso de Carga
(function() {
  var body = g('progressCharts');
  var btn  = g('btnToggleProgress');
  if (!body || !btn) return;
  var hidden = localStorage.getItem('progressHidden') === '1';
  function apply() {
    body.style.display = hidden ? 'none' : '';
    btn.textContent = hidden ? '▼ mostrar' : '▲ ocultar';
    btn.title = hidden ? 'Mostrar progresso de carga' : 'Ocultar progresso de carga';
  }
  apply();
  btn.addEventListener('click', function() {
    hidden = !hidden;
    localStorage.setItem('progressHidden', hidden ? '1' : '0');
    apply();
  });
})();

// Toggle Histórico de Ciclos
(function() {
  var body = g('cycleHistoryBody');
  var btn  = g('btnToggleCycleHistory');
  if (!body || !btn) return;
  var hidden = localStorage.getItem('cycleHistoryHidden') === '1';
  function apply() {
    body.style.display = hidden ? 'none' : '';
    btn.textContent = hidden ? '▼ mostrar' : '▲ ocultar';
    btn.title = hidden ? 'Mostrar histórico de ciclos' : 'Ocultar histórico de ciclos';
  }
  apply();
  btn.addEventListener('click', function() {
    hidden = !hidden;
    localStorage.setItem('cycleHistoryHidden', hidden ? '1' : '0');
    apply();
  });
})();
g('btnCancelEx').addEventListener('click', function() {
  g('mAddEx').classList.remove('on');
  if (!editingExId) clearDraft();
});

g('bankGroupFilter').addEventListener('click', function(e) {
  var btn = e.target.closest('.bank-filter-btn'); if (!btn) return;
  _bankGroup = btn.dataset.group;
  localStorage.setItem('bankGroupFilter', _bankGroup);
  g('bankGroupFilter').querySelectorAll('.bank-filter-btn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  renderBank();
});

// Restaura visualmente o botão ativo do filtro do banco a partir do localStorage
(function() {
  var wrap = g('bankGroupFilter'); if (!wrap) return;
  wrap.querySelectorAll('.bank-filter-btn').forEach(function(b) {
    if (b.dataset.group === _bankGroup) b.classList.add('active');
    else                                 b.classList.remove('active');
  });
})();

g('btnConfirmEx').addEventListener('click', function() {
  var name     = g('mExName').value.trim(); if (!name) return;
  var kg       = parseFloat(g('mExKg').value) || 0;
  var reps     = g('mExReps').value.trim() || '3x10';
  var group    = g('mExGroup').value;
  var repGoal  = parseInt(g('mExRepGoal').value, 10) || 0;
  var bilateral = g('mExBilateral').checked;
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
      ex.name = name; ex.kg = kg; ex.reps = reps; ex.group = group; ex.repGoal = repGoal; ex.bilateral = bilateral;
    }
    board.forEach(function(day) {
      day.forEach(function(item) {
        if (item.srcId === editingExId || item.id === editingExId || (oldName && item.name === oldName)) {
          item.name = name; item.kg = kg; item.reps = reps;
          item.srcId = editingExId; item.bilateral = bilateral;
        }
      });
    });
    altBoards.forEach(function(ab) {
      ab.exercises.forEach(function(item) {
        if (item.srcId === editingExId || item.id === editingExId || (oldName && item.name === oldName)) {
          item.name = name; item.kg = kg; item.reps = reps;
          item.srcId = editingExId; item.bilateral = bilateral;
        }
      });
    });
    renderKanban(); renderPeriodGrid(); renderAltBoards();
  } else {
    bank.push({ id:uid(), name:name, kg:kg, reps:reps, group:group, repGoal:repGoal, bilateral:bilateral });
  }
  g('mAddEx').classList.remove('on');
  if (!editingExId) clearDraft();
  renderBank();
  renderProgressCharts();
  saveState();
});

g('btnDeleteEx').addEventListener('click', function() {
  if (!editingExId) return;
  var idx   = bank.findIndex(function(b) { return b.id === editingExId; });
  if (idx === -1) return;
  var saved = JSON.parse(JSON.stringify(bank[idx]));
  bank.splice(idx, 1);
  g('mAddEx').classList.remove('on');
  renderBank();
  showUndo('"' + saved.name + '" removido do banco', function() {
    bank.splice(idx, 0, saved);
    renderBank();
    saveState();
  }, saveState);
});

// ── Modal de Detalhe do Exercício ─────────────
var _exDetailChart = null;

export function openExDetail(ex) {
  var srcId = ex.srcId || ex.id;
  var name  = ex.name;

  g('mExDetailTitle').textContent = name;
  var groupBadge = ex.group && GROUP_CSS[ex.group]
    ? '<span class="bpgroup ' + GROUP_CSS[ex.group] + '">' + GROUP_LABEL[ex.group] + '</span> · '
    : '';
  g('mExDetailMeta').innerHTML = groupBadge
    + (ex.kg > 0 ? ex.kg + 'kg · ' : '')
    + ex.reps
    + (ex.bilateral ? ' · bilateral' : '');

  // Notas — salvamento automático no blur/input com debounce
  var notesEl = g('mExDetailNotes');
  notesEl.value = exerciseNotes[srcId] || '';
  notesEl.oninput = function() {
    exerciseNotes[srcId] = notesEl.value;
    saveState();
  };

  // PRs a partir das sessões finalizadas
  var prKg = 0, prSingle = 0, prVol = 0;
  workoutLog.forEach(function(s) {
    if (!s.finishedAt) return;
    s.exercises.forEach(function(e) {
      if (e.name !== name) return;
      e.sets.forEach(function(set) {
        var kg = +set.kg || 0, r = +set.reps || 0;
        if (kg > prKg) prKg = kg;
        if (r === 1 && kg > prSingle) prSingle = kg;
        var v = kg * r; if (v > prVol) prVol = v;
      });
    });
  });
  function prCard(lbl, val, suffix) {
    return '<div style="background:var(--bg3);border-radius:6px;padding:8px 10px;text-align:center;">'
      + '<div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px;">' + lbl + '</div>'
      + '<div style="font-family:var(--mono);font-size:14px;font-weight:700;color:var(--accent);">' + (val > 0 ? val + suffix : '—') + '</div>'
      + '</div>';
  }
  g('mExDetailPRs').innerHTML =
    prCard('Máx carga', prKg, ' kg') +
    prCard('Máx 1 rep', prSingle, ' kg') +
    prCard('Máx vol/set', prVol, ' kg');

  // Gráfico kgHistory (só mostra se >= 2 pontos)
  var hist = kgHistory[srcId] || [];
  var wrap = g('mExDetailChartWrap');
  if (_exDetailChart) { _exDetailChart.destroy(); _exDetailChart = null; }
  if (hist.length >= 2 && typeof Chart !== 'undefined') {
    wrap.style.display = '';
    var ctx = g('mExDetailChart').getContext('2d');
    _exDetailChart = new Chart(ctx, {
      type: 'line',
      data: { labels: hist.map(function(p) { return p.date; }), datasets: [{
        data: hist.map(function(p) { return p.kg; }),
        borderColor:'#6c63ff', backgroundColor:'rgba(108,99,255,.12)',
        borderWidth:2, pointRadius:4, fill:true, tension:0.3,
      }]},
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:{callbacks:{label:function(c){return c.parsed.y+' kg';}}}},
        scales:{
          x:{ ticks:{color:'#8a8898',font:{size:9}}, grid:{color:'rgba(255,255,255,.04)'}},
          y:{ ticks:{color:'#8a8898',font:{size:9},callback:function(v){return v+' kg';}}, grid:{color:'rgba(255,255,255,.05)'}, beginAtZero:false }
        }
      }
    });
  } else {
    wrap.style.display = 'none';
  }

  // Últimas 5 sessões
  var last5 = [];
  workoutLog.forEach(function(s) {
    if (!s.finishedAt) return;
    var e = s.exercises.find(function(x) { return x.name === name; });
    if (e && e.sets.length) last5.push({ date: s.date, sets: e.sets, ts: s.startedAt });
  });
  last5.sort(function(a, b) { return b.ts - a.ts; });
  last5 = last5.slice(0, 5);
  g('mExDetailSessions').innerHTML = last5.length
    ? last5.map(function(h) {
        return '<div style="display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid var(--border);padding:4px 0;">'
          + '<span style="color:var(--muted);">' + h.date + '</span>'
          + '<span>' + h.sets.map(function(s){ return s.kg+'kg×'+s.reps; }).join(' · ') + '</span>'
          + '</div>';
      }).join('')
    : '<span style="color:var(--muted);font-family:var(--sans);font-size:11px;">Nenhuma sessão registrada</span>';

  g('mExDetail').classList.add('on');
}

(function() {
  var btn = g('btnCloseExDetail');
  if (!btn) return;
  btn.addEventListener('click', function() {
    g('mExDetail').classList.remove('on');
    if (_exDetailChart) { _exDetailChart.destroy(); _exDetailChart = null; }
  });
  // Fechar clicando no backdrop
  var bg = g('mExDetail');
  if (bg) bg.addEventListener('click', function(e) {
    if (e.target === bg) { bg.classList.remove('on'); if (_exDetailChart) { _exDetailChart.destroy(); _exDetailChart = null; } }
  });
})();

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
