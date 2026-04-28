// ── GORILA GYM — fadiga.js ────────────────────
// Modelo Banister completo: ATL + CTL + TSB
// ATL = fadiga (τ curto, por lift) | CTL = fitness (τ=42d) | TSB = CTL − ATL
//
// Melhorias biológicas aplicadas:
//   1. CTL/TSB — fitness acumulado e saldo de treino
//   2. Sobreposição muscular cruzada (terra↔agacha: eretores/glúteos/isquio)
//   3. Fator excêntrico por lift (agacha 1.4×, supino 1.3×, terra 1.0×)
//   4. Densidade intra-dia: 2º treino no mesmo dia → +25% (stacking simplificado)
//   5. Perfil de recuperação individual (idade, anos de treino)
//   6. effortFactor com corte abaixo de 40% 1RM
//   7. intensityFromSet via Epley (intensidade real considerando reps)
//   8. Cross-fatigue quadrático (score²)
//   9. SS_FLOOR dinâmico baseado no RM do usuário
//  10. Rampa neural quadrática acima de 92% 1RM
//  11. Padrões push/pull/legs/isolation/cardio para exercícios _other

import { g, BASE_SUP, BASE_AGA, BASE_TER, customLifts, periodLog } from './state.js';
import { workoutLog } from './workoutlog.js';
import { rpeBlocks } from './rpe.js';

// ── Constantes temporais (lifts nomeados) ─────
var SS_WIN_MS          = 42 * 24 * 3600 * 1000;
var _TAU_CTL_MS        = 42 * 86400000;

var _TAU_MS            = { agacha: 14 * 86400000, terra: 14 * 86400000, supino: 7 * 86400000 };
var _TAU_DEF_MS        = 6 * 86400000;

var _TAU_NEURAL_MS     = { terra: 18 * 86400000, agacha: 16 * 86400000, supino: 12 * 86400000 };
var _TAU_NEURAL_DEF_MS = 10 * 86400000;

// ── Fatores biomecânicos (lifts nomeados) ─────
var _ECCENTRIC = { agacha: 1.4, supino: 1.3, terra: 1.0 };

var _MUSCLE_OVERLAP = {
  terra:  { eretores: 1.0, gluteos: 0.8, isquio: 0.7, trapezio: 0.5, dorsais: 0.4 },
  agacha: { eretores: 0.6, gluteos: 0.9, isquio: 0.5, quadriceps: 1.0 },
  supino: { peitoral: 1.0, triceps: 0.8, deltoid_ant: 0.6 },
};

// ── Padrões de movimento para exercícios _other ─
var MOVEMENT_PATTERNS = {
  legs: {
    tau: 12 * 86400000, tauNeural: 14 * 86400000, eccentric: 1.35, defaultInt: 0.75, tlScale: 1.0,
    muscles: { gluteos: 0.8, quadriceps: 0.9, isquio: 0.7, eretores: 0.5 },
  },
  pull: {
    tau: 9 * 86400000, tauNeural: 11 * 86400000, eccentric: 1.2, defaultInt: 0.73, tlScale: 1.0,
    muscles: { dorsais: 1.0, biceps: 0.8, trapezio: 0.6, deltoid_post: 0.5 },
  },
  push: {
    tau: 7 * 86400000, tauNeural: 9 * 86400000, eccentric: 1.15, defaultInt: 0.72, tlScale: 1.0,
    muscles: { peitoral: 1.0, triceps: 0.8, deltoid_ant: 0.6 },
  },
  isolation: {
    tau: 3 * 86400000, tauNeural: 4 * 86400000, eccentric: 1.05, defaultInt: 0.70, tlScale: 0.35,
    muscles: {},
  },
  cardio: {
    tau: 1.5 * 86400000, tauNeural: 2 * 86400000, eccentric: 1.0, defaultInt: 0.55, tlScale: 0.5,
    muscles: {},
  },
};

// Keywords → padrão. Ordem importa: mais específico primeiro.
// Todas as keywords em ASCII (sem acentos) — comparação usa _normalizeStr.
var PATTERN_KEYWORDS = [
  // LEGS
  ['agachamento','legs'],['squat','legs'],['leg press','legs'],['legpress','legs'],
  ['cadeira','legs'],['extensao','legs'],['flexora','legs'],['leg curl','legs'],
  ['stiff','legs'],['rdl','legs'],['avanco','legs'],['lunge','legs'],
  ['hack','legs'],['bulgaro','legs'],['hip thrust','legs'],['hipthrust','legs'],
  ['gluteo','legs'],['abdutora','legs'],['adutora','legs'],['panturrilha','legs'],
  ['calf','legs'],
  // PULL (terra → pull via padrão; o lift "terra" tem chave própria e não chega aqui)
  ['remada','pull'],['row','pull'],['puxada','pull'],['pulldown','pull'],
  ['pull up','pull'],['pullup','pull'],['barra fixa','pull'],['chin','pull'],
  ['facepull','pull'],['encolhimento','pull'],['shrug','pull'],
  ['terra','pull'],['deadlift','pull'],['trapezio','pull'],
  // ISOLATION: monoarticulares (antes de PUSH para evitar match errado)
  ['rosca','isolation'],['curl','isolation'],
  ['elevacao lateral','isolation'],['lateral raise','isolation'],
  ['elevacao frontal','isolation'],['front raise','isolation'],
  ['crucifixo','isolation'],['fly','isolation'],['voador','isolation'],
  ['crossover','isolation'],
  ['triceps','isolation'],['tricep','isolation'],
  // PUSH: compostos de empurrar
  ['supino','push'],['bench','push'],['desenvolvimento','push'],['overhead','push'],
  ['ohp','push'],['press','push'],
  ['mergulho','push'],['dip','push'],
  // CARDIO / CORE
  ['prancha','cardio'],['plank','cardio'],['abdominal','cardio'],['crunch','cardio'],
  ['esteira','cardio'],['bike','cardio'],['spinning','cardio'],['eliptico','cardio'],
];

// Popula _MUSCLE_OVERLAP para chaves _other:* (cross-fatigue automático)
['legs','pull','push','isolation','cardio'].forEach(function(p) {
  _MUSCLE_OVERLAP['_other:' + p] = MOVEMENT_PATTERNS[p].muscles;
});

// Remove diacríticos para comparar nomes com acentos contra keywords ASCII
function _normalizeStr(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

// Cache: name → { key, pat } para evitar re-scan do array a cada set
var _patternCache = {};
function _resolvePattern(name) {
  var k = _normalizeStr(name);
  if (_patternCache[k]) return _patternCache[k];
  var found = PATTERN_KEYWORDS.find(function(pair) { return k.includes(pair[0]); });
  var pkey  = found ? found[1] : 'isolation';
  var entry = { key: pkey, pat: MOVEMENT_PATTERNS[pkey] };
  _patternCache[k] = entry;
  return entry;
}
function _patternOf(name)    { return _resolvePattern(name).pat; }
function _patternKeyOf(name) { return _resolvePattern(name).key; }

// Chave completa: lk nomeado ou '_other:<padrão>'
function _lkFull(lk, name) {
  return lk !== '_other' ? lk : '_other:' + _patternKeyOf(name);
}

// ── Perfil de recuperação ──────────────────────
var _recoveryProfile = { age: 28, trainingYears: 3 };
globalThis.recoveryProfile = _recoveryProfile;

function _recoveryMult() {
  var age = parseFloat((g('user-age') || {}).value) || _recoveryProfile.age || 28;
  var exp = parseFloat((g('user-exp') || {}).value) || _recoveryProfile.trainingYears || 3;
  return (age < 30 ? 1.0 : age < 40 ? 1.15 : 1.35) * (exp > 5 ? 0.85 : 1.0);
}

// τ dinâmico: base × multiplicador de intensidade × perfil de recuperação
function _tauMs(lk, intensity, name) {
  var base = lk !== '_other' ? (_TAU_MS[lk] || _TAU_DEF_MS) : _patternOf(name).tau;
  var mult = intensity >= 0.9 ? 2.0 : intensity >= 0.8 ? 1.4 : 1.0;
  return base * mult * _recoveryMult();
}

// τ para steady-state (sem mult dinâmico). Aceita chaves _other:* compostas.
function _tauDay(lkFull) {
  if (lkFull.startsWith('_other:')) {
    var pname = lkFull.slice(7);
    return ((MOVEMENT_PATTERNS[pname] || MOVEMENT_PATTERNS.push).tau) / 86400000;
  }
  return (_TAU_MS[lkFull] || _TAU_DEF_MS) / 86400000;
}

function _tauNeuralMs(lk, name) {
  return lk !== '_other'
    ? (_TAU_NEURAL_MS[lk] || _TAU_NEURAL_DEF_MS)
    : _patternOf(name).tauNeural;
}

function _eccentricOf(lk, name) {
  return _ECCENTRIC[lk] || _patternOf(name).eccentric || 1.0;
}

function _tlScaleOf(lk, name) {
  if (lk !== '_other') return 1.0;
  return _patternOf(name).tlScale || 1.0;
}

// Custo de esforço exponencial. Referência = 65% 1RM (carga de trabalho típica = 1.0).
// Abaixo de 40%: quadrático (aquecimentos leves = fadiga desprezível).
function effortFactor(intensity) {
  if (intensity < 0.4) return Math.pow(intensity / 0.4, 2) * 0.3;
  return Math.exp(2 * (intensity - 0.65));
}

// Intensidade efetiva via Epley, normalizada pelo 1RM real.
function intensityFromSet(kg, reps, rm) {
  var est1RM = kg * (1 + reps / 30);
  return Math.min(est1RM / rm, 1.0);
}

// Para _other não há 1RM real — usa Epley direto (= 1/(1+reps/30)) clipado em 95%.
function _intensityFor(lk, kg, reps, rm, name) {
  if (lk !== '_other') return intensityFromSet(kg, reps, rm);
  var est1RM = kg * (1 + reps / 30);
  return Math.min(kg / est1RM, 0.95);
}

// Sobreposição muscular entre dois lifts (0–1, normalizado pelo lift-alvo)
function _sharedMuscleScore(lkA, lkB) {
  var a = _MUSCLE_OVERLAP[lkA], b = _MUSCLE_OVERLAP[lkB];
  if (!a || !b) return 0;
  var shared = 0, maxA = 0;
  Object.keys(a).forEach(function(m) { maxA += a[m]; if (b[m]) shared += Math.min(a[m], b[m]); });
  return maxA > 0 ? Math.min(1, shared / maxA) : 0;
}

// 2º treino no mesmo dia custa +25% (densidade intra-dia)
function _sameDayMult(ts, allTs) {
  var dayStart = Math.floor(ts / 86400000) * 86400000;
  return allTs.filter(function(t) { return t >= dayStart && t < ts; }).length > 0 ? 1.25 : 1.0;
}

// Mapeia nome de exercício para lift key; usa helper registrado em globalThis pelo app.js
function _lkOf(name) {
  if (typeof globalThis.liftKeyForExerciseName === 'function')
    return globalThis.liftKeyForExerciseName(name || '') || '_other';
  return '_other';
}

// Desconto adaptativo: cargas abaixo da intensidade habitual custam menos fadiga.
var _ADAPT_MIN = 0.45;
function _adaptScale(intensity, lkFull, avgIntByLift) {
  var avg = avgIntByLift[lkFull];
  if (!avg) return 1.0;
  var ratio = intensity / avg;
  if (ratio >= 1.0) return 1.0;
  return _ADAPT_MIN + (1.0 - _ADAPT_MIN) * ratio;
}

// ── Núcleo: calcula ATL/CTL/TSB para um dado refTime ──
export function getFatigaRaw(refTime) {
  var t   = refTime !== undefined ? refTime : Date.now();
  var now = Date.now();

  var oneRMs = {
    supino: parseFloat((g('rm-supino') || {}).value) || BASE_SUP,
    agacha: parseFloat((g('rm-agacha') || {}).value) || BASE_AGA,
    terra:  parseFloat((g('rm-terra')  || {}).value) || BASE_TER,
  };
  customLifts.forEach(function(cl) { oneRMs[cl.id] = cl.rm || 1; });
  function rmFor(lk) { return oneRMs[lk] || 100; }
  var SS_FLOOR = Math.max((oneRMs.supino + oneRMs.agacha + oneRMs.terra) * 20, 3000);

  var allSessionTs = [];
  workoutLog.forEach(function(s) { if (s.startedAt) allSessionTs.push(s.startedAt); });
  rpeBlocks.forEach(function(blk) {
    if (blk.execHistory) blk.execHistory.forEach(function(exec) { if (exec.date) allSessionTs.push(exec.date); });
  });
  periodLog.forEach(function(e) { if (e.ts) allSessionTs.push(e.ts); });
  allSessionTs.sort(function(a, b) { return a - b; });

  // ── Pré-passo: intensidade média por lift nos últimos 42d (base do adaptScale) ──
  var cutoff42 = now - SS_WIN_MS;
  var avgIntByLift = {}, countByLift = {};
  workoutLog.forEach(function(s) {
    if (!s.startedAt || s.startedAt < cutoff42 || !s.exercises) return;
    s.exercises.forEach(function(ex) {
      if (!ex || !ex.sets) return;
      var lk  = _lkOf(ex.name), rm = rmFor(lk);
      var lkf = _lkFull(lk, ex.name);
      ex.sets.forEach(function(set) {
        var kg = +(set.kg) || 0, reps = +(set.reps) || 0;
        if (!kg || !reps) return;
        var i = _intensityFor(lk, kg, reps, rm, ex.name);
        avgIntByLift[lkf] = (avgIntByLift[lkf] || 0) + i;
        countByLift[lkf]  = (countByLift[lkf]  || 0) + 1;
      });
    });
  });
  periodLog.forEach(function(e) {
    if (!e.ts || e.ts < cutoff42 || !e.vol || !e.liftKey) return;
    var i = +e.pct || 0.75;
    avgIntByLift[e.liftKey] = (avgIntByLift[e.liftKey] || 0) + i;
    countByLift[e.liftKey]  = (countByLift[e.liftKey]  || 0) + 1;
  });
  rpeBlocks.forEach(function(blk) {
    if (!blk.execHistory) return;
    blk.execHistory.forEach(function(exec) {
      if (!exec.date || exec.date < cutoff42 || !exec.exercises) return;
      exec.exercises.forEach(function(ex) {
        if (!ex || !ex.sets) return;
        var lk  = _lkOf(ex.name), rm = +ex.rmAfter || +ex.rmBefore || rmFor(lk);
        var lkf = _lkFull(lk, ex.name);
        ex.sets.forEach(function(set) {
          var kg = +(set.kg) || 0, reps = +(set.reps) || 0;
          if (!kg || !reps) return;
          var i = _intensityFor(lk, kg, reps, rm, ex.name);
          avgIntByLift[lkf] = (avgIntByLift[lkf] || 0) + i;
          countByLift[lkf]  = (countByLift[lkf]  || 0) + 1;
        });
      });
    });
  });
  Object.keys(avgIntByLift).forEach(function(lkf) { avgIntByLift[lkf] /= countByLift[lkf]; });

  var perLiftATL = {};
  var ctl = 0;

  // ── Logbook de execução ──
  workoutLog.forEach(function(s) {
    if (!s.startedAt || s.startedAt > now || !s.exercises) return;
    s.exercises.forEach(function(ex) {
      if (!ex || !ex.sets) return;
      var lk  = _lkOf(ex.name);
      var lkf = _lkFull(lk, ex.name);
      var rm  = rmFor(lk);
      ex.sets.forEach(function(set) {
        var kg = +(set.kg) || 0, reps = +(set.reps) || 0;
        if (!kg || !reps) return;
        var intensity = _intensityFor(lk, kg, reps, rm, ex.name);
        var tlBase    = reps * kg * intensity * effortFactor(intensity) * (ex.bilateral ? 2 : 1);
        if (!isFinite(tlBase) || tlBase <= 0) return;
        var eccentric = _eccentricOf(lk, ex.name);
        var sdMult    = _sameDayMult(s.startedAt, allSessionTs);
        var tl        = tlBase * eccentric * sdMult * _adaptScale(intensity, lkf, avgIntByLift) * _tlScaleOf(lk, ex.name);
        var elapsed   = t - s.startedAt;
        if (elapsed < 0) return;
        var tauDyn    = _tauMs(lk, intensity, ex.name);
        var decayATL  = Math.exp(-elapsed / tauDyn);
        var decayCTL  = Math.exp(-elapsed / _TAU_CTL_MS);
        if (decayATL >= 0.001) perLiftATL[lkf] = (perLiftATL[lkf] || 0) + tl * decayATL;
        if (decayCTL >= 0.001) ctl += tl * decayCTL;
        if (intensity > 0.85) {
          var tauN   = _tauNeuralMs(lk, ex.name);
          var decayN = Math.exp(-elapsed / tauN);
          if (decayN >= 0.001) {
            var tlN = tl * 0.3 * Math.pow((intensity - 0.85) / 0.15, 2);
            perLiftATL[lkf] = (perLiftATL[lkf] || 0) + tlN * decayN;
            ctl += tlN * Math.exp(-elapsed / _TAU_CTL_MS);
          }
        }
      });
    });
  });

  // ── Log da periodização (checkboxes marcados) — sempre liftKey nomeado ──
  periodLog.forEach(function(e) {
    if (!e.ts || e.ts > now || !e.vol || !e.liftKey) return;
    var lk        = e.liftKey;
    var intensity = +e.pct || 0.75;
    var vol       = +e.vol;
    var tlBase    = vol * intensity * effortFactor(intensity);
    if (!isFinite(tlBase) || tlBase <= 0) return;
    var eccentric = _ECCENTRIC[lk] || 1.0;
    var sdMult    = _sameDayMult(e.ts, allSessionTs);
    var tl        = tlBase * eccentric * sdMult * _adaptScale(intensity, lk, avgIntByLift);
    var elapsed   = t - e.ts;
    if (elapsed < 0) return;
    var tauDyn    = _tauMs(lk, intensity);
    var decayATL  = Math.exp(-elapsed / tauDyn);
    var decayCTL  = Math.exp(-elapsed / _TAU_CTL_MS);
    if (decayATL >= 0.001) perLiftATL[lk] = (perLiftATL[lk] || 0) + tl * decayATL;
    if (decayCTL >= 0.001) ctl += tl * decayCTL;
    if (intensity > 0.85) {
      var tauN   = _TAU_NEURAL_MS[lk] || _TAU_NEURAL_DEF_MS;
      var decayN = Math.exp(-elapsed / tauN);
      if (decayN >= 0.001) {
        var tlN = tl * 0.3 * Math.pow((intensity - 0.85) / 0.15, 2);
        perLiftATL[lk] = (perLiftATL[lk] || 0) + tlN * decayN;
        ctl += tlN * Math.exp(-elapsed / _TAU_CTL_MS);
      }
    }
  });

  // ── Blocos RPE executados ──
  rpeBlocks.forEach(function(blk) {
    if (!blk.execHistory) return;
    blk.execHistory.forEach(function(exec) {
      if (!exec.date || exec.date > now || !exec.exercises) return;
      exec.exercises.forEach(function(ex) {
        if (!ex || !ex.sets) return;
        var lk  = _lkOf(ex.name);
        var lkf = _lkFull(lk, ex.name);
        var rm  = +ex.rmAfter || +ex.rmBefore || rmFor(lk);
        ex.sets.forEach(function(set) {
          var kg = +(set.kg) || 0, reps = +(set.reps) || 0;
          if (!kg || !reps) return;
          var intensity = _intensityFor(lk, kg, reps, rm, ex.name);
          var tlBase    = reps * kg * intensity * effortFactor(intensity) * (ex.bilateral ? 2 : 1);
          if (!isFinite(tlBase) || tlBase <= 0) return;
          var eccentric = _eccentricOf(lk, ex.name);
          var sdMult    = _sameDayMult(exec.date, allSessionTs);
          var tl        = tlBase * eccentric * sdMult * _adaptScale(intensity, lkf, avgIntByLift) * _tlScaleOf(lk, ex.name);
          var elapsed   = t - exec.date;
          if (elapsed < 0) return;
          var tauDyn    = _tauMs(lk, intensity, ex.name);
          var decayATL  = Math.exp(-elapsed / tauDyn);
          var decayCTL  = Math.exp(-elapsed / _TAU_CTL_MS);
          if (decayATL >= 0.001) perLiftATL[lkf] = (perLiftATL[lkf] || 0) + tl * decayATL;
          if (decayCTL >= 0.001) ctl += tl * decayCTL;
          if (intensity > 0.85) {
            var tauN   = _tauNeuralMs(lk, ex.name);
            var decayN = Math.exp(-elapsed / tauN);
            if (decayN >= 0.001) {
              var tlN = tl * 0.3 * Math.pow((intensity - 0.85) / 0.15, 2);
              perLiftATL[lkf] = (perLiftATL[lkf] || 0) + tlN * decayN;
              ctl += tlN * Math.exp(-elapsed / _TAU_CTL_MS);
            }
          }
        });
      });
    });
  });

  // ── Cross-fatigue: leak muscular quadrático (score²) ──
  // _MUSCLE_OVERLAP já inclui '_other:legs', '_other:pull', '_other:push'
  var crossATL = {};
  var allLks = Object.keys(perLiftATL);
  allLks.forEach(function(lkA) {
    allLks.forEach(function(lkB) {
      if (lkA === lkB) return;
      var score = _sharedMuscleScore(lkA, lkB);
      if (score > 0) crossATL[lkB] = (crossATL[lkB] || 0) + perLiftATL[lkA] * score * score;
    });
  });

  var fatigue = 0;
  allLks.forEach(function(lk) { fatigue += (perLiftATL[lk] || 0) + (crossATL[lk] || 0); });

  // ── Steady-state: TL/dia médio dos últimos 42d × τ por lift ──
  var cutoff   = now - SS_WIN_MS;
  var tlByLift = {};
  workoutLog.forEach(function(s) {
    if (!s.startedAt || s.startedAt < cutoff || !s.exercises) return;
    s.exercises.forEach(function(ex) {
      if (!ex || !ex.sets) return;
      var lk  = _lkOf(ex.name);
      var lkf = _lkFull(lk, ex.name);
      var rm  = rmFor(lk);
      ex.sets.forEach(function(set) {
        var kg = +(set.kg) || 0, reps = +(set.reps) || 0;
        if (!kg || !reps) return;
        var intensity = _intensityFor(lk, kg, reps, rm, ex.name);
        if (!isFinite(intensity)) return;
        tlByLift[lkf] = (tlByLift[lkf] || 0) + reps * kg * intensity * effortFactor(intensity) * _eccentricOf(lk, ex.name) * _tlScaleOf(lk, ex.name) * (ex.bilateral ? 2 : 1);
      });
    });
  });
  periodLog.forEach(function(e) {
    if (!e.ts || e.ts < cutoff || e.ts > now || !e.vol || !e.liftKey) return;
    var lk        = e.liftKey;
    var intensity = +e.pct || 0.75;
    tlByLift[lk] = (tlByLift[lk] || 0) + (+e.vol) * intensity * effortFactor(intensity) * (_ECCENTRIC[lk] || 1.0);
  });
  rpeBlocks.forEach(function(blk) {
    if (!blk.execHistory) return;
    blk.execHistory.forEach(function(exec) {
      if (!exec.date || exec.date < cutoff || !exec.exercises) return;
      exec.exercises.forEach(function(ex) {
        if (!ex || !ex.sets) return;
        var lk  = _lkOf(ex.name);
        var lkf = _lkFull(lk, ex.name);
        var rm  = +ex.rmAfter || +ex.rmBefore || rmFor(lk);
        ex.sets.forEach(function(set) {
          var kg = +(set.kg) || 0, reps = +(set.reps) || 0;
          if (!kg || !reps) return;
          var intensity = _intensityFor(lk, kg, reps, rm, ex.name);
          if (!isFinite(intensity)) return;
          tlByLift[lkf] = (tlByLift[lkf] || 0) + reps * kg * intensity * effortFactor(intensity) * _eccentricOf(lk, ex.name) * _tlScaleOf(lk, ex.name) * (ex.bilateral ? 2 : 1);
        });
      });
    });
  });
  var ss = 0;
  Object.keys(tlByLift).forEach(function(lkf) { ss += (tlByLift[lkf] / 42) * _tauDay(lkf); });

  return { fatigue: fatigue, ctl: ctl, tsb: ctl - fatigue, steadyState: Math.max(ss, SS_FLOOR) };
}

export function calcFadiga() {
  var r = getFatigaRaw();
  return Math.round(r.fatigue / r.steadyState * 100);
}

// Verifica se ATL esteve acima de 110% do steady-state por >= 3 dias consecutivos.
export function checkDeload() {
  var DAY = 86400000, now = Date.now();
  var THRESHOLD = 1.10, MIN_DAYS = 3;
  var days = 0;
  for (var d = 0; d < 7; d++) {
    var r = getFatigaRaw(now - d * DAY);
    if (r.fatigue >= THRESHOLD * r.steadyState) days++;
    else break;
  }
  var cur = getFatigaRaw();
  return {
    needed:       days >= MIN_DAYS,
    days:         days,
    atlPct:       Math.round(cur.fatigue / cur.steadyState * 100),
    suggestedPct: 45,
  };
}

export function calcRestDays() {
  var base   = getFatigaRaw();
  var target = 0.8 * base.steadyState;
  if (base.fatigue <= target) return 0;
  var DAY = 86400000, now = Date.now();
  var lo = 1, hi = 60, best = 60;
  while (lo <= hi) {
    var mid = (lo + hi) >> 1;
    if (getFatigaRaw(now + mid * DAY).fatigue <= target) { best = mid; hi = mid - 1; }
    else lo = mid + 1;
  }
  return best;
}
globalThis.calcRestDays = calcRestDays;

export function updateFadigaBar() {
  var r;
  try {
    r = getFatigaRaw();
  } catch (e) {
    console.error('[Fadiga] getFatigaRaw():', e);
    var ev = document.getElementById('ftgAtlVal');
    if (ev) { ev.textContent = 'ERR'; ev.style.color = '#ff5555'; }
    return;
  }

  var ss  = r.steadyState;
  var atl = isFinite(r.fatigue / ss) ? Math.round(r.fatigue / ss * 100) : 0;
  var ctl = isFinite(r.ctl     / ss) ? Math.round(r.ctl     / ss * 100) : 0;
  var tsb = isFinite(r.tsb     / ss) ? Math.round(r.tsb     / ss * 100) : 0;

  var atlBar = document.getElementById('ftgAtlBar');
  var atlVal = document.getElementById('ftgAtlVal');
  var ctlBar = document.getElementById('ftgCtlBar');
  var ctlVal = document.getElementById('ftgCtlVal');
  var tsbBar = document.getElementById('ftgTsbBar');
  var tsbVal = document.getElementById('ftgTsbVal');

  if (atlBar) {
    atlBar.style.width      = Math.min(100, atl) + '%';
    atlBar.style.background = atl < 80 ? '#c9ff3a' : atl < 120 ? '#ffb534' : '#ff5555';
  }
  if (atlVal) {
    atlVal.textContent = atl + '%';
    atlVal.style.color = atl < 80 ? '' : atl < 120 ? '#ffb534' : '#ff5555';
  }
  if (ctlBar) ctlBar.style.width = Math.min(100, ctl) + '%';
  if (ctlVal) { ctlVal.textContent = ctl + '%'; ctlVal.style.color = ''; }
  if (tsbBar) {
    tsbBar.style.width      = Math.min(100, Math.abs(tsb)) + '%';
    tsbBar.style.background = tsb >= 0 ? '#c9ff3a' : '#ff5555';
  }
  if (tsbVal) {
    tsbVal.textContent = (tsb >= 0 ? '+' : '') + tsb + '%';
    tsbVal.style.color = tsb > 10 ? '#c9ff3a' : tsb < -10 ? '#ffb534' : '';
  }
}
globalThis.updateFadigaBar = updateFadigaBar;

// Popover ATL/CTL/TSB
(function () {
  var btn = document.getElementById('fadigaHelpBtn');
  var pop = document.getElementById('fadigaHelpPop');
  if (!btn || !pop) return;
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (pop.classList.contains('on')) { pop.classList.remove('on'); return; }
    var rc   = btn.getBoundingClientRect();
    var left = Math.min(rc.right - 280, window.innerWidth - 292);
    pop.style.top  = (rc.bottom + 8) + 'px';
    pop.style.left = Math.max(8, left) + 'px';
    pop.classList.add('on');
  });
  document.addEventListener('click', function () { pop.classList.remove('on'); });
  pop.addEventListener('click', function (e) { e.stopPropagation(); });
}());

// Popover MEV/MAV/MRV — fecha ao clicar fora
(function () {
  var pop = document.getElementById('vmrvHelpPop');
  if (!pop) return;
  document.addEventListener('click', function () { pop.classList.remove('on'); });
  pop.addEventListener('click', function (e) { e.stopPropagation(); });
}());