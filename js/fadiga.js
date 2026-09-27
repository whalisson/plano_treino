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
//   6. effortFactor com corte abaixo de 55% 1RM (aquecimentos)
//   7. intensityFromSet via Epley (intensidade real considerando reps)
//   8. Cross-fatigue quadrático (score²)
//   9. SS_FLOOR dinâmico baseado no RM do usuário
//  10. Rampa neural quadrática acima de 92% 1RM
//  11. Padrões push/pull/legs/isolation/cardio para exercícios _other

import { g, BASE_SUP, BASE_AGA, BASE_TER, customLifts, periodLog } from './state.js';
import { workoutLog } from './workoutlog.js';
import { rpeBlocks } from './rpe.js';

// Mapeia nome de exercício para lift key; usa helper registrado em globalThis pelo app.js
function _lkOf(name) {
  if (typeof globalThis.liftKeyForExerciseName === 'function')
    return globalThis.liftKeyForExerciseName(name || '') || '_other';
  return '_other';
}

// ── Cache de pseudo-1RM ───────────────────────
// _pseudoRM é reconstruído quando os dados mudam OU quando o dia de referência
// muda — uma consulta histórica não pode enxergar séries posteriores a ela.
// _fatigaCacheVer só sobe quando os DADOS mudam, para que o memo por dia de
// getFatigaRaw continue válido ao varrer vários refTimes.
let _pseudoRM = {};
let _pseudoRMKey    = '';   // hash dos dados + dia de referência
let _pseudoDataHash = NaN;  // hash só dos dados
let _fatigaCacheVer = 0;    // invalida o cache de getFatigaRaw

// FNV-1a: mistura dependente da ordem. Uma soma simples colide ao trocar
// valores entre séries (ex: 100kg×5 ↔ 5kg×100) e deixaria o cache obsoleto.
function _pseudoRMHash() {
  let h = 2166136261;
  function mix(v) {
    h = Math.imul(h ^ ((v | 0) & 0xffff),       16777619);
    h = Math.imul(h ^ (((v | 0) >>> 16) & 0xffff), 16777619);
  }
  function mixSets(sets) {
    (sets || []).forEach(function(st) {
      mix(Math.round((+st.kg || 0) * 10));
      mix(Math.round(+st.reps || 0));
    });
  }
  workoutLog.forEach(function(s) {
    mix(Math.round((s.startedAt || 0) / 1000));
    (s.exercises || []).forEach(function(ex) { mixSets(ex.sets); });
  });
  rpeBlocks.forEach(function(blk) {
    (blk.execHistory || []).forEach(function(exec) {
      mix(Math.round((exec.date || 0) / 1000));
      (exec.exercises || []).forEach(function(ex) { mixSets(ex.sets); });
    });
  });
  return h >>> 0;
}

function _ensurePseudoRM(refTime) {
  const evalNow  = refTime !== undefined ? refTime : Date.now();
  const dataHash = _pseudoRMHash();
  if (dataHash !== _pseudoDataHash) {
    _pseudoDataHash = dataHash;
    _fatigaCacheVer++;   // só mudança de dados invalida o memo por dia
  }
  const key = dataHash + '|' + _localDayStart(evalNow);
  if (key === _pseudoRMKey) return;
  _pseudoRMKey = key;
  _pseudoRM = {};
  function _updatePseudo(name, kg, reps, ts) {
    if (!kg || !reps || _lkOf(name) !== '_other') return;
    // Série posterior ao instante consultado não existe para essa consulta
    if (ts && ts > evalNow) return;
    const est    = kg * (1 + reps / 30);
    const age    = Math.max(0, evalNow - (ts || evalNow));
    const weight = Math.exp(-age / (90 * 86400000));
    if (!_pseudoRM[name]) {
      _pseudoRM[name] = { val: est, w: weight };
    } else if (est * weight > _pseudoRM[name].val * _pseudoRM[name].w) {
      _pseudoRM[name] = { val: est, w: weight };
    }
  }
  workoutLog.forEach(function(s) {
    if (!s.exercises) return;
    s.exercises.forEach(function(ex) {
      if (!ex || !ex.sets) return;
      ex.sets.forEach(function(set) { _updatePseudo(ex.name, +(set.kg), +(set.reps), s.startedAt); });
    });
  });
  rpeBlocks.forEach(function(blk) {
    if (!blk.execHistory) return;
    blk.execHistory.forEach(function(exec) {
      if (!exec.exercises) return;
      exec.exercises.forEach(function(ex) {
        if (!ex || !ex.sets) return;
        ex.sets.forEach(function(set) { _updatePseudo(ex.name, +(set.kg), +(set.reps), exec.date); });
      });
    });
  });
}

// ── Constantes temporais (lifts nomeados) ─────
const SS_WIN_MS          = 42 * 24 * 3600 * 1000;
const SS_FLOOR_MIN       = 3000;   // piso do denominador: evita ATL% absurdo sem histórico
const DELOAD_THRESHOLD   = 1.10;   // ATL acima de 110% do steady-state
const DELOAD_MIN_DAYS    = 3;
const DELOAD_SUGGESTED_PCT = 45;   // % de carga sugerida na semana de deload
const OVERREACH_THRESHOLD  = -0.30;
const REST_TARGET_PCT    = 0.8;    // alvo de ATL para "descansado"
const _TAU_CTL_MS        = 42 * 86400000;
const TAU_ATL_FALLBACK_DAYS = 10;  // usado só quando não há ATL para ponderar

const _TAU_MS            = { agacha: 14 * 86400000, terra: 14 * 86400000, supino: 7 * 86400000 };
const _TAU_DEF_MS        = 6 * 86400000;

const _TAU_NEURAL_MS     = { terra: 18 * 86400000, agacha: 16 * 86400000, supino: 12 * 86400000 };
const _TAU_NEURAL_DEF_MS = 10 * 86400000;

// ── Fatores biomecânicos (lifts nomeados) ─────
const _ECCENTRIC = { agacha: 1.4, supino: 1.3, terra: 1.0 };

const _MUSCLE_OVERLAP = {
  terra:  { eretores: 1.0, gluteos: 0.8, isquio: 0.7, trapezio: 0.5, dorsais: 0.4 },
  agacha: { eretores: 0.6, gluteos: 0.9, isquio: 0.5, quadriceps: 1.0 },
  supino: { peitoral: 1.0, triceps: 0.8, deltoid_ant: 0.6 },
};

// ── Padrões de movimento para exercícios _other ─
// `muscles` alimenta o cross-fatigue. Um mapa vazio zera o vazamento nos DOIS
// sentidos, então só fica vazio onde o músculo é genuinamente desconhecido
// (isolado não reconhecido) ou não se aplica (cardio, fadiga sistêmica).
const MOVEMENT_PATTERNS = {
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
  core: {
    tau: 4 * 86400000, tauNeural: 5 * 86400000, eccentric: 1.10, defaultInt: 0.65, tlScale: 0.5,
    muscles: { core: 1.0, eretores: 0.4 },
  },
  // Isolados reconhecidos: τ curto e tlScale baixo, mas com músculo conhecido
  // para que a fadiga vaze corretamente nos compostos que dividem o mesmo motor.
  iso_biceps: {
    tau: 3 * 86400000, tauNeural: 4 * 86400000, eccentric: 1.05, defaultInt: 0.70, tlScale: 0.35,
    muscles: { biceps: 1.0 },
  },
  iso_triceps: {
    tau: 3 * 86400000, tauNeural: 4 * 86400000, eccentric: 1.05, defaultInt: 0.70, tlScale: 0.35,
    muscles: { triceps: 1.0 },
  },
  iso_delts: {
    tau: 3 * 86400000, tauNeural: 4 * 86400000, eccentric: 1.05, defaultInt: 0.70, tlScale: 0.35,
    muscles: { deltoid_lat: 1.0, deltoid_ant: 0.5 },
  },
  iso_chest: {
    tau: 4 * 86400000, tauNeural: 5 * 86400000, eccentric: 1.20, defaultInt: 0.70, tlScale: 0.4,
    muscles: { peitoral: 1.0, deltoid_ant: 0.4 },
  },
  // Fallback de isolado não reconhecido — músculo desconhecido, sem vazamento
  isolation: {
    tau: 3 * 86400000, tauNeural: 4 * 86400000, eccentric: 1.05, defaultInt: 0.70, tlScale: 0.35,
    muscles: {},
  },
  // Fadiga sistêmica, não muscular — sem vazamento por sobreposição
  cardio: {
    tau: 1.5 * 86400000, tauNeural: 2 * 86400000, eccentric: 1.0, defaultInt: 0.55, tlScale: 0.5,
    muscles: {},
  },
};

// Grupo persistido pelo logbook (detectExerciseGroup) → padrão de movimento.
// Fonte de verdade preferencial: o dicionário do logbook é mais rico que as
// keywords daqui e o valor fica gravado em cada exercício.
const GROUP_TO_PATTERN = { push: 'push', pull: 'pull', legs: 'legs', core: 'core' };

// Keywords → padrão. Ordem importa: mais específico primeiro.
// Todas as keywords em ASCII (sem acentos) — comparação usa _normalizeStr.
const PATTERN_KEYWORDS = [
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
  ['rosca','iso_biceps'],['curl','iso_biceps'],
  ['elevacao lateral','iso_delts'],['lateral raise','iso_delts'],
  ['elevacao frontal','iso_delts'],['front raise','iso_delts'],
  ['crucifixo','iso_chest'],['fly','iso_chest'],['voador','iso_chest'],
  ['crossover','iso_chest'],
  ['triceps','iso_triceps'],['tricep','iso_triceps'],
  // PUSH: compostos de empurrar
  ['supino','push'],['bench','push'],['desenvolvimento','push'],['overhead','push'],
  ['ohp','push'],['press','push'],
  ['mergulho','push'],['dip','push'],
  // CORE
  ['prancha','core'],['plank','core'],['abdominal','core'],['crunch','core'],
  // CARDIO
  ['esteira','cardio'],['bike','cardio'],['spinning','cardio'],['eliptico','cardio'],
];

// Popula _MUSCLE_OVERLAP para chaves _other:* (cross-fatigue automático)
Object.keys(MOVEMENT_PATTERNS).forEach(function(p) {
  _MUSCLE_OVERLAP['_other:' + p] = MOVEMENT_PATTERNS[p].muscles;
});

// Remove diacríticos para comparar nomes com acentos contra keywords ASCII
function _normalizeStr(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

// Cache: chave → { key, pat } para evitar re-scan do array a cada set
let _patternCache = {};

// O grupo gravado no exercício (push/pull/legs/core) vence as keywords: vem do
// dicionário do logbook, que é mais rico, e foi confirmado na criação do card.
// Isolados e nomes não classificados chegam com group vazio → cai nas keywords.
function _resolvePattern(name, group) {
  const fromGroup = GROUP_TO_PATTERN[group];
  const ck = fromGroup ? 'g:' + fromGroup : 'n:' + _normalizeStr(name);
  if (_patternCache[ck]) return _patternCache[ck];
  let pkey = fromGroup;
  if (!pkey) {
    const nk    = _normalizeStr(name);
    const found = PATTERN_KEYWORDS.find(function(pair) { return nk.includes(pair[0]); });
    pkey = found ? found[1] : 'isolation';
  }
  const entry = { key: pkey, pat: MOVEMENT_PATTERNS[pkey] };
  _patternCache[ck] = entry;
  return entry;
}
export function _patternOf(name, group)    { return _resolvePattern(name, group).pat; }
export function _patternKeyOf(name, group) { return _resolvePattern(name, group).key; }

// Chave completa: lk nomeado ou '_other:<padrão>'
function _lkFull(lk, name, group) {
  return lk !== '_other' ? lk : '_other:' + _patternKeyOf(name, group);
}

// Padrão de movimento de uma chave completa. null para os 3 lifts nomeados,
// que têm τ e excêntrico próprios em _TAU_MS / _ECCENTRIC.
function _patOfLkf(lkf) {
  if (lkf.indexOf('_other:') === 0) return MOVEMENT_PATTERNS[lkf.slice(7)] || MOVEMENT_PATTERNS.isolation;
  const cl = customLifts.find(function(c) { return c.id === lkf; });
  return cl ? _patternOf(cl.name) : null;
}

// ── Perfil de recuperação ──────────────────────
const _recoveryProfile = { age: 28, trainingYears: 3 };
globalThis.recoveryProfile = _recoveryProfile;

// Cache de 60s — g() lê DOM; getFatigaRaw chama _recoveryMult centenas de vezes por set
let _recovMultVal = null, _recovMultStamp = 0;
function _recoveryMult() {
  const now = Date.now();
  if (_recovMultVal !== null && now - _recovMultStamp < 60000) return _recovMultVal;
  const ageRaw = parseFloat((g('user-age') || {}).value);
  const expRaw = parseFloat((g('user-exp') || {}).value);
  const age = isNaN(ageRaw) || ageRaw <= 0 ? (_recoveryProfile.age || 28) : ageRaw;
  const exp = isNaN(expRaw)               ? (_recoveryProfile.trainingYears || 3) : expRaw;
  const next = (age < 30 ? 1.0 : age < 40 ? 1.15 : 1.35) * (exp > 5 ? 0.85 : 1.0);
  // Perfil alterado muda todos os τ — projeções e checkDeload em cache ficariam velhos
  if (_recovMultVal !== null && next !== _recovMultVal) _fatigaCacheVer++;
  _recovMultVal   = next;
  _recovMultStamp = now;
  return _recovMultVal;
}

// τ base de uma chave completa, antes do perfil de recuperação
function _tauBaseMs(lkf) {
  if (_TAU_MS[lkf]) return _TAU_MS[lkf];
  const pat = _patOfLkf(lkf);
  return pat ? pat.tau : _TAU_DEF_MS;
}

// τ dinâmico: base × multiplicador de intensidade × perfil de recuperação
function _tauMs(lkf, intensity) {
  const mult = intensity >= 0.9 ? 2.0 : intensity >= 0.8 ? 1.4 : 1.0;
  return _tauBaseMs(lkf) * mult * _recoveryMult();
}

// τ em dias para steady-state (sem mult dinâmico)
function _tauDay(lkf) {
  return _tauBaseMs(lkf) * _recoveryMult() / 86400000;
}

function _tauNeuralMs(lkf) {
  if (_TAU_NEURAL_MS[lkf]) return _TAU_NEURAL_MS[lkf];
  const pat = _patOfLkf(lkf);
  return pat ? pat.tauNeural : _TAU_NEURAL_DEF_MS;
}

function _eccentricOf(lkf) {
  if (_ECCENTRIC[lkf]) return _ECCENTRIC[lkf];
  const pat = _patOfLkf(lkf);
  return (pat && pat.eccentric) || 1.0;
}

// Só exercícios _other escalam: lifts nomeados e customizados valem 1.0
function _tlScaleOf(lkf) {
  if (lkf.indexOf('_other:') !== 0) return 1.0;
  return _patOfLkf(lkf).tlScale || 1.0;
}

// Custo de esforço exponencial. Referência = 65% 1RM (carga de trabalho típica = 1.0).
// Ramo quadrático abaixo de 55% casado com o exponencial em 0.55: exp(2×(0.55−0.65)) = exp(−0.2).
const _EF_JOIN = Math.exp(-0.2); // ≈ 0.8187 — valor do exponencial exatamente em 0.55
export function effortFactor(intensity) {
  if (intensity < 0.55) return Math.pow(intensity / 0.55, 2) * _EF_JOIN;
  return Math.exp(2 * (intensity - 0.65));
}

// Intensidade efetiva via Epley, normalizada pelo 1RM real.
export function intensityFromSet(kg, reps, rm) {
  const est1RM = kg * (1 + reps / 30);
  return Math.min(est1RM / rm, 1.0);
}

// Joelho da rampa neural. O cap de _other precisa ficar ACIMA dele, senão
// nenhum exercício sem lift nomeado alcança o componente neural.
export const NEURAL_KNEE   = 0.92;
const NEURAL_SPAN          = 1 - NEURAL_KNEE;
export const OTHER_INT_CAP = 0.95;

// Para _other: evita circularidade onde pseudo-RM = est1RM do próprio set → intensity 1.0.
// relInt (rep-based) é o piso independente de kg; absInt (RM-based) escala com histórico.
// Retorna o mais conservador, capado para não explodir o effortFactor.
function _intensityFor(lk, kg, reps, rm, name) {
  if (lk !== '_other') return intensityFromSet(kg, reps, rm);
  const relInt = 1 / (1 + reps / 30);
  const stored = _pseudoRM[name];
  if (stored) {
    const absInt = Math.min(intensityFromSet(kg, reps, stored.val), OTHER_INT_CAP);
    return Math.min(relInt, absInt);
  }
  return Math.min(relInt, OTHER_INT_CAP);
}

// Sobreposição muscular — inicialização lazy de customLifts + cache de pares O(1)
let _customOverlapLen = -1;
let _sharedMuscleCache = {};

function _ensureCustomOverlap() {
  if (_customOverlapLen === customLifts.length) return;
  _customOverlapLen = customLifts.length;
  _sharedMuscleCache = {};  // invalida scores ao adicionar novos lifts
  _fatigaCacheVer++;        // queries históricas em cache podem referenciar overlap desatualizado
  customLifts.forEach(function(cl) {
    if (!_MUSCLE_OVERLAP[cl.id]) {
      const pat = _patternKeyOf(cl.name);
      _MUSCLE_OVERLAP[cl.id] = (MOVEMENT_PATTERNS[pat] || MOVEMENT_PATTERNS.isolation).muscles;
    }
  });
}

// Assimetria intencional: score(A→B) mede quanto A "vaza" em B normalizado pela capacidade de A.
// score(B→A) normaliza pela capacidade de B — valores diferentes são corretos.
// Ex: terra vaza muito em agacha (eretores/glúteos compartilhados, alta capacidade de A),
// mas agacha vaza menos em terra (quadríceps não contribui para terra).
function _sharedMuscleScore(lkA, lkB) {
  const key = lkA + '|' + lkB;
  if (key in _sharedMuscleCache) return _sharedMuscleCache[key];
  const a = _MUSCLE_OVERLAP[lkA], b = _MUSCLE_OVERLAP[lkB];
  if (!a || !b) return (_sharedMuscleCache[key] = 0);
  let shared = 0, maxA = 0;
  Object.keys(a).forEach(function(m) { maxA += a[m]; if (b[m]) shared += Math.min(a[m], b[m]); });
  return (_sharedMuscleCache[key] = maxA > 0 ? Math.min(1, shared / maxA) : 0);
}

function _localDayStart(ts) {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// Desconto adaptativo: cargas abaixo da intensidade habitual custam menos fadiga.
const _ADAPT_MIN = 0.45;
function _adaptScale(intensity, lkFull, avgIntByLift) {
  const avg = avgIntByLift[lkFull];
  if (!avg || avg <= 0) return 1.0;
  const ratio = intensity / avg;
  if (ratio >= 1.0) return 1.0;
  return _ADAPT_MIN + (1.0 - _ADAPT_MIN) * ratio;
}

// ── SS_FLOOR derivado de princípios físicos ───────────────────────────────
// ATL steady-state = Σ_lifts [ RM × K × eccentric × τ_dias ]
// K = sets × reps × intensity × effortFactor(intensity) × (freq/7)
// Parâmetros: 3 séries, 5 reps, 73% 1RM, frequência real (mín 2×/semana).
function _computeSsFloor(oneRMs, allSessionTs, now) {
  const TYPICAL_SETS = 3;
  const TYPICAL_REPS = 5;
  const TYPICAL_INT  = 0.73;

  const recentSessions = allSessionTs.filter(function(ts) {
    return ts >= now - SS_WIN_MS && ts <= now;
  }).length;
  const freqPerDay = Math.max(recentSessions / 42, 2 / 7);

  const K = TYPICAL_SETS * TYPICAL_REPS * TYPICAL_INT * TYPICAL_INT
          * effortFactor(TYPICAL_INT)
          * freqPerDay;

  // Lifts efetivamente treinados nos últimos 42d — evita que lifts não praticados
  // (supino, terra) inflam o denominador quando o usuário só treina um lift.
  const trainedLifts = new Set();
  const _win = now - SS_WIN_MS;
  workoutLog.forEach(function(s) {
    if (!s.startedAt || s.startedAt < _win) return;
    (s.exercises || []).forEach(function(ex) {
      const lk = _lkOf(ex.name);
      if (lk !== '_other') trainedLifts.add(lk);
    });
  });
  rpeBlocks.forEach(function(blk) {
    if (!blk.execHistory) return;
    blk.execHistory.forEach(function(exec) {
      if (!exec.date || exec.date < _win) return;
      (exec.exercises || []).forEach(function(ex) {
        const lk = _lkOf(ex.name);
        if (lk !== '_other') trainedLifts.add(lk);
      });
    });
  });
  periodLog.forEach(function(e) {
    if (e.ts && e.ts >= _win && e.liftKey) trainedLifts.add(e.liftKey);
  });

  let ss = 0;

  [{ lk: 'supino', rm: oneRMs.supino },
   { lk: 'agacha', rm: oneRMs.agacha },
   { lk: 'terra',  rm: oneRMs.terra  }].forEach(function(item) {
    if (!item.rm || !trainedLifts.has(item.lk)) return;
    ss += item.rm * K * (_ECCENTRIC[item.lk] || 1.0) * _tauDay(item.lk);
  });

  customLifts.forEach(function(cl) {
    if (!cl.rm || !trainedLifts.has(cl.id)) return;
    ss += cl.rm * K * _eccentricOf(cl.id) * _tauDay(cl.id);
  });

  // Exercícios _other frequentes (ex: Hip Thrust, Leg Press) contribuem para o
  // denominador conforme histórico acumula — evita ATL% cronicamente alto
  // só por falta de representação no baseline.
  const otherTL = {}, otherCount = {};
  workoutLog.forEach(function(s) {
    if (!s.startedAt || s.startedAt < now - SS_WIN_MS) return;
    (s.exercises || []).forEach(function(ex) {
      if (_lkOf(ex.name) !== '_other') return;
      const lkf = '_other:' + _patternKeyOf(ex.name, ex.group);
      (ex.sets || []).forEach(function(set) {
        const kg = +(set.kg) || 0, reps = +(set.reps) || 0;
        if (!kg || !reps) return;
        otherTL[lkf]    = (otherTL[lkf]    || 0) + kg * reps;
        otherCount[lkf] = (otherCount[lkf] || 0) + 1;
      });
    });
  });
  rpeBlocks.forEach(function(blk) {
    if (!blk.execHistory) return;
    blk.execHistory.forEach(function(exec) {
      if (!exec.date || exec.date < now - SS_WIN_MS || exec.date > now) return;
      (exec.exercises || []).forEach(function(ex) {
        if (_lkOf(ex.name) !== '_other') return;
        const lkf = '_other:' + _patternKeyOf(ex.name, ex.group);
        (ex.sets || []).forEach(function(set) {
          const kg = +(set.kg) || 0, reps = +(set.reps) || 0;
          if (!kg || !reps) return;
          otherTL[lkf]    = (otherTL[lkf]    || 0) + kg * reps;
          otherCount[lkf] = (otherCount[lkf] || 0) + 1;
        });
      });
    });
  });

  Object.keys(otherTL).forEach(function(lkf) {
    if (otherCount[lkf] < 3) return;
    const avgTL = (otherTL[lkf] / 42) * 0.75 * effortFactor(0.75);
    ss += avgTL * _eccentricOf(lkf) * _tauDay(lkf);
  });

  periodLog.forEach(function(e) {
    if (!e.ts || e.ts < now - SS_WIN_MS || e.ts > now || !e.vol || !e.liftKey) return;
    const lk        = e.liftKey;
    const intensity = +e.pct || 0.75;
    ss += (+e.vol / 42) * intensity * effortFactor(intensity) * _eccentricOf(lk) * _tauDay(lk);
  });

  return Math.max(ss, SS_FLOOR_MIN);
}

// ── Núcleo: calcula ATL/CTL/TSB para um dado refTime ──
// Memoizado por dia para queries históricas/projeções (checkDeload, calcRestDays).
// Chamadas sem refTime (tempo real) sempre recomputam.
const _fatigaCache = new Map();

// Zera todos os memos derivados de dados ou do DOM. Os caches vivem no escopo
// do módulo, então cenários independentes precisam disso para não contaminar
// uns aos outros.
export function resetFadigaCaches() {
  _pseudoRM        = {};
  _pseudoRMKey     = '';
  _pseudoDataHash  = NaN;
  _fatigaCache.clear();
  _fatigaCacheVer++;
  _recovMultVal    = null;
  _recovMultStamp  = 0;
  _patternCache    = {};
  _sharedMuscleCache = {};
  _customOverlapLen  = -1;
}

export function getFatigaRaw(refTime) {
  const t = refTime !== undefined ? refTime : Date.now();
  _ensurePseudoRM(t);

  if (refTime !== undefined) {
    // Dia local, coerente com _localDayStart usado na densidade intra-dia
    const cacheKey = _localDayStart(t) + ':' + _fatigaCacheVer;
    if (_fatigaCache.has(cacheKey)) return _fatigaCache.get(cacheKey);
    const result = _computeFatiga(t);
    _fatigaCache.set(cacheKey, result);
    if (_fatigaCache.size > 30) _fatigaCache.delete(_fatigaCache.keys().next().value);
    return result;
  }
  return _computeFatiga(t);
}

function _computeFatiga(t) {
  _ensureCustomOverlap();

  const oneRMs = {
    supino: parseFloat((g('rm-supino') || {}).value) || BASE_SUP,
    agacha: parseFloat((g('rm-agacha') || {}).value) || BASE_AGA,
    terra:  parseFloat((g('rm-terra')  || {}).value) || BASE_TER,
  };
  customLifts.forEach(function(cl) { oneRMs[cl.id] = cl.rm || 1; });
  function rmFor(lk) { return oneRMs[lk] || 100; }

  const allSessionTs = [];
  workoutLog.forEach(function(s) { if (s.startedAt) allSessionTs.push(s.startedAt); });
  rpeBlocks.forEach(function(blk) {
    if (blk.execHistory) blk.execHistory.forEach(function(exec) { if (exec.date) allSessionTs.push(exec.date); });
  });
  // SS_FLOOR usa apenas sessões reais para estimar frequência; periodLog inflaria freqPerDay.
  // Usa t (não Date.now()) para que projeções futuras reflitam a frequência decrescente.
  const SS_FLOOR = _computeSsFloor(oneRMs, allSessionTs, t);
  periodLog.forEach(function(e) { if (e.ts) allSessionTs.push(e.ts); });
  allSessionTs.sort(function(a, b) { return a - b; });

  // Pré-computa lookup O(1) por dia local — evita O(sessions × sets) no hot path
  const _dayMap = {};
  allSessionTs.forEach(function(ts) {
    const ds = _localDayStart(ts);
    (_dayMap[ds] = _dayMap[ds] || []).push(ts);
  });
  function _sdMult(ts) {
    const ds  = _localDayStart(ts);
    const arr = _dayMap[ds] || [];
    return arr.some(function(x) { return x < ts; }) ? 1.25 : 1.0;
  }

  // ── Pré-passo: intensidade média por lift nos últimos 42d (base do adaptScale) ──
  const cutoff = t - SS_WIN_MS;
  const avgIntByLift = {}, countByLift = {};
  workoutLog.forEach(function(s) {
    if (!s.startedAt || s.startedAt < cutoff || !s.exercises) return;
    s.exercises.forEach(function(ex) {
      if (!ex || !ex.sets) return;
      const lk  = _lkOf(ex.name), rm = rmFor(lk);
      const lkf = _lkFull(lk, ex.name, ex.group);
      ex.sets.forEach(function(set) {
        const kg = +(set.kg) || 0, reps = +(set.reps) || 0;
        if (!kg || !reps) return;
        const i = _intensityFor(lk, kg, reps, rm, ex.name);
        avgIntByLift[lkf] = (avgIntByLift[lkf] || 0) + i;
        countByLift[lkf]  = (countByLift[lkf]  || 0) + 1;
      });
    });
  });
  periodLog.forEach(function(e) {
    if (!e.ts || e.ts < cutoff || !e.vol || !e.liftKey) return;
    const i = +e.pct || 0.75;
    avgIntByLift[e.liftKey] = (avgIntByLift[e.liftKey] || 0) + i;
    countByLift[e.liftKey]  = (countByLift[e.liftKey]  || 0) + 1;
  });
  rpeBlocks.forEach(function(blk) {
    if (!blk.execHistory) return;
    blk.execHistory.forEach(function(exec) {
      if (!exec.date || exec.date < cutoff || !exec.exercises) return;
      exec.exercises.forEach(function(ex) {
        if (!ex || !ex.sets) return;
        const lk  = _lkOf(ex.name), rm = +ex.rmAfter || +ex.rmBefore || rmFor(lk);
        const lkf = _lkFull(lk, ex.name, ex.group);
        ex.sets.forEach(function(set) {
          const kg = +(set.kg) || 0, reps = +(set.reps) || 0;
          if (!kg || !reps) return;
          const i = _intensityFor(lk, kg, reps, rm, ex.name);
          avgIntByLift[lkf] = (avgIntByLift[lkf] || 0) + i;
          countByLift[lkf]  = (countByLift[lkf]  || 0) + 1;
        });
      });
    });
  });
  Object.keys(avgIntByLift).forEach(function(lkf) { avgIntByLift[lkf] /= countByLift[lkf]; });

  // ── Loop principal: ATL/CTL e tlByLift em passada única ──
  // tlByLift (janela 42d, sem decay) e ATL/CTL (toda a história, decaído) computados juntos.
  const perLiftATL = {};
  let ctl = 0;
  const tlByLift = {};

  // Acumula um set no ATL/CTL e, se estiver na janela de 42d, no tlByLift.
  function _accSet(lkf, kg, reps, intensity, elapsed, sdMult, bilateral) {
    const tlBase = reps * kg * intensity * effortFactor(intensity) * (bilateral ? 2 : 1);
    if (!isFinite(tlBase) || tlBase <= 0) return;
    const tl = tlBase * _eccentricOf(lkf) * sdMult
              * _adaptScale(intensity, lkf, avgIntByLift) * _tlScaleOf(lkf);

    if (elapsed >= 0) {
      const decayATL = Math.exp(-elapsed / _tauMs(lkf, intensity));
      const decayCTL = Math.exp(-elapsed / _TAU_CTL_MS);
      if (decayATL >= 0.001) perLiftATL[lkf] = (perLiftATL[lkf] || 0) + tl * decayATL;
      if (decayCTL >= 0.001) ctl += tl * decayCTL;
      if (intensity > NEURAL_KNEE) {
        const tlN    = tl * 0.3 * Math.pow((intensity - NEURAL_KNEE) / NEURAL_SPAN, 2);
        const decayN = Math.exp(-elapsed / _tauNeuralMs(lkf));
        if (decayN   >= 0.001) perLiftATL[lkf] = (perLiftATL[lkf] || 0) + tlN * decayN;
        if (decayCTL >= 0.001) ctl += tlN * decayCTL;
      }
    }
    if (t - elapsed >= cutoff) {
      tlByLift[lkf] = (tlByLift[lkf] || 0) + tl;
    }
  }

  workoutLog.forEach(function(s) {
    if (!s.startedAt || s.startedAt > t || !s.exercises) return;
    const elapsed = t - s.startedAt;
    const sdMult  = _sdMult(s.startedAt);
    s.exercises.forEach(function(ex) {
      if (!ex || !ex.sets) return;
      const lk  = _lkOf(ex.name);
      const lkf = _lkFull(lk, ex.name, ex.group);
      const rm  = rmFor(lk);
      ex.sets.forEach(function(set) {
        const kg = +(set.kg) || 0, reps = +(set.reps) || 0;
        if (!kg || !reps) return;
        _accSet(lkf, kg, reps, _intensityFor(lk, kg, reps, rm, ex.name), elapsed, sdMult, ex.bilateral);
      });
    });
  });

  periodLog.forEach(function(e) {
    if (!e.ts || e.ts > t || !e.vol || !e.liftKey) return;
    const lk        = e.liftKey;
    const intensity = +e.pct || 0.75;
    const tlBase    = (+e.vol) * intensity * effortFactor(intensity);
    if (!isFinite(tlBase) || tlBase <= 0) return;
    const eccentric = _eccentricOf(lk);
    const sdMult    = _sdMult(e.ts);
    const tl        = tlBase * eccentric * sdMult * _adaptScale(intensity, lk, avgIntByLift);
    const elapsed   = t - e.ts;

    if (elapsed >= 0) {
      const decayATL = Math.exp(-elapsed / _tauMs(lk, intensity));
      const decayCTL = Math.exp(-elapsed / _TAU_CTL_MS);
      if (decayATL >= 0.001) perLiftATL[lk] = (perLiftATL[lk] || 0) + tl * decayATL;
      if (decayCTL >= 0.001) ctl += tl * decayCTL;
      if (intensity > NEURAL_KNEE) {
        const tlN    = tl * 0.3 * Math.pow((intensity - NEURAL_KNEE) / NEURAL_SPAN, 2);
        const decayN = Math.exp(-elapsed / _tauNeuralMs(lk));
        if (decayN   >= 0.001) perLiftATL[lk] = (perLiftATL[lk] || 0) + tlN * decayN;
        if (decayCTL >= 0.001) ctl += tlN * decayCTL;
      }
    }
    if (e.ts >= cutoff) {
      tlByLift[lk] = (tlByLift[lk] || 0) + tl;
    }
  });

  rpeBlocks.forEach(function(blk) {
    if (!blk.execHistory) return;
    blk.execHistory.forEach(function(exec) {
      if (!exec.date || exec.date > t || !exec.exercises) return;
      const elapsed = t - exec.date;
      const sdMult  = _sdMult(exec.date);
      exec.exercises.forEach(function(ex) {
        if (!ex || !ex.sets) return;
        const lk  = _lkOf(ex.name);
        const lkf = _lkFull(lk, ex.name, ex.group);
        const rm  = +ex.rmAfter || +ex.rmBefore || rmFor(lk);
        ex.sets.forEach(function(set) {
          const kg = +(set.kg) || 0, reps = +(set.reps) || 0;
          if (!kg || !reps) return;
          _accSet(lkf, kg, reps, _intensityFor(lk, kg, reps, rm, ex.name), elapsed, sdMult, ex.bilateral);
        });
      });
    });
  });

  // ── Cross-fatigue: leak muscular quadrático (score²) ──
  // _MUSCLE_OVERLAP já inclui '_other:*' e customLifts (via _ensureCustomOverlap).
  const crossATL = {};
  const allLks = Object.keys(perLiftATL);
  allLks.forEach(function(lkA) {
    allLks.forEach(function(lkB) {
      if (lkA === lkB) return;
      const score = _sharedMuscleScore(lkA, lkB);
      if (score > 0) crossATL[lkB] = (crossATL[lkB] || 0) + perLiftATL[lkA] * score * score;
    });
  });

  let fatigue = 0;
  allLks.forEach(function(lk) { fatigue += (perLiftATL[lk] || 0) + (crossATL[lk] || 0); });

  // ── Steady-state: TL/dia médio dos últimos 42d × τ por lift ──
  let ss_raw = 0, ss_ctl_raw = 0;
  Object.keys(tlByLift).forEach(function(lkf) {
    ss_raw     += (tlByLift[lkf] / 42) * _tauDay(lkf);
    ss_ctl_raw += tlByLift[lkf];
  });

  const directTotal = allLks.reduce(function(s, lk) { return s + (perLiftATL[lk] || 0); }, 0);
  const crossFactor = directTotal > 0 ? fatigue / directTotal : 1;

  // ATL recebe cross-fatigue → denominador escala junto.
  // CTL não tem cross-fatigue no numerador → denominador também não.
  const ss            = ss_raw * crossFactor;
  const ssFloorScaled = SS_FLOOR * crossFactor;
  const ssCtlFloor    = ss_raw > 0 ? SS_FLOOR * (ss_ctl_raw / ss_raw) : SS_FLOOR * 4;

  // τ efetivo do ATL: média dos τ por lift ponderada pela fadiga de cada um.
  // A projeção usava 10d fixo, o que diverge do modelo quando o treino pende
  // para um padrão só (isolados ~3d vs. agacha/terra 14d).
  let tauNum = 0, tauDen = 0;
  allLks.forEach(function(lk) {
    const a = perLiftATL[lk] || 0;
    if (a <= 0) return;
    tauNum += _tauDay(lk) * a;
    tauDen += a;
  });

  const _ss    = Math.max(ss, ssFloorScaled);
  const _ssCtl = Math.max(ss_ctl_raw, ssCtlFloor);
  return { fatigue: fatigue, ctl: ctl,
           tsbPct: (_ss > 0 && _ssCtl > 0) ? (ctl / _ssCtl - fatigue / _ss) * 100 : 0,
           steadyState:    _ss,
           steadyStateCTL: _ssCtl,
           tauAtlDays: tauDen > 0 ? tauNum / tauDen : TAU_ATL_FALLBACK_DAYS };
}

export function calcFadiga() {
  const r = getFatigaRaw();
  return Math.round(r.fatigue / r.steadyState * 100);
}

// Verifica se ATL esteve acima de 110% do steady-state por >= 3 dias consecutivos.
export function checkDeload() {
  const DAY = 86400000, now = Date.now();
  const THRESHOLD = DELOAD_THRESHOLD, MIN_DAYS = DELOAD_MIN_DAYS;
  let days = 0;
  for (let d = 0; d < 7; d++) {
    const r = getFatigaRaw(now - d * DAY);
    if (r.fatigue >= THRESHOLD * r.steadyState) days++;
    else break;
  }
  const cur = getFatigaRaw();
  return {
    needed:       days >= MIN_DAYS,
    days:         days,
    atlPct:       Math.round(cur.fatigue / cur.steadyState * 100),
    suggestedPct: DELOAD_SUGGESTED_PCT,
  };
}

// Verifica se TSB esteve abaixo de −30% do steady-state por >= 3 dias consecutivos.
export function checkOverreaching() {
  const DAY = 86400000, now = Date.now();
  const THRESHOLD = OVERREACH_THRESHOLD, MIN_DAYS = DELOAD_MIN_DAYS;
  let days = 0;
  for (let d = 0; d < 14; d++) {
    const r = getFatigaRaw(now - d * DAY);
    if (r.tsbPct / 100 < THRESHOLD) days++;
    else break;
  }
  const cur = getFatigaRaw();
  return { needed: days >= MIN_DAYS, days: days, tsbPct: Math.round(cur.tsbPct) };
}

export function calcRestDays() {
  const base   = getFatigaRaw();
  const target = REST_TARGET_PCT * base.steadyState;
  if (base.fatigue <= target) return 0;
  const DAY = 86400000, now = Date.now();
  let lo = 1, hi = 60, best = 60;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (getFatigaRaw(now + mid * DAY).fatigue <= target) { best = mid; hi = mid - 1; }
    else lo = mid + 1;
  }
  return best;
}
// globalThis: necessário para acesso legado fora do módulo (ex: workoutlog.js pré-imports)
globalThis.calcRestDays = calcRestDays;

export function updateFadigaBar() {
  let r;
  try {
    r = getFatigaRaw();
  } catch (e) {
    console.error('[Fadiga] getFatigaRaw():', e);
    const ev = document.getElementById('ftgAtlVal');
    if (ev) { ev.textContent = 'ERR'; ev.style.color = '#ff5555'; }
    return;
  }

  const ss_atl = r.steadyState;
  const ss_ctl = r.steadyStateCTL || r.steadyState;
  const atl = isFinite(r.fatigue / ss_atl) ? Math.round(r.fatigue / ss_atl * 100) : 0;
  const ctl = isFinite(r.ctl     / ss_ctl) ? Math.round(r.ctl     / ss_ctl * 100) : 0;
  const tsb = Math.round(r.tsbPct);

  const atlBar = document.getElementById('ftgAtlBar');
  const atlVal = document.getElementById('ftgAtlVal');
  const ctlBar = document.getElementById('ftgCtlBar');
  const ctlVal = document.getElementById('ftgCtlVal');
  const tsbBar = document.getElementById('ftgTsbBar');
  const tsbVal = document.getElementById('ftgTsbVal');

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
// globalThis: necessário para acesso legado fora do módulo
globalThis.updateFadigaBar = updateFadigaBar;

// ── Projeção de forma: TSB futuro ─────────────────────────────────────────────
// curState: resultado de getFatigaRaw() passado pelo chamador
export function calcTSBProjection(curState, weeklyFreq, loadPct, horizonDays) {
  horizonDays = horizonDays || 60;
  weeklyFreq  = Math.max(0, Math.min(7, weeklyFreq != null ? +weeklyFreq : 4));
  loadPct     = Math.max(0, loadPct != null ? +loadPct : 1.0);

  const DAY   = 86400000;
  const cur   = curState;
  const ss    = cur.steadyState    || 1;
  const ssCtl = cur.steadyStateCTL || 1;
  // τ do ATL vem do próprio estado (ponderado pelos lifts realmente treinados)
  const tauA  = Math.max(1, +cur.tauAtlDays || TAU_ATL_FALLBACK_DAYS);
  const dA    = Math.exp(-1 / tauA);
  const dC    = Math.exp(-1 / (_TAU_CTL_MS / DAY));
  // Carga por sessão normalizada: a 100% de load, 1 sessão/dia → ATL converge a SS
  const lAtl  = ss    * (1 - dA) * loadPct;
  const lCtl  = ssCtl * (1 - dC) * loadPct;

  let atlRaw = cur.fatigue;
  let ctlRaw = cur.ctl;
  const out  = [];
  for (let d = 1; d <= horizonDays; d++) {
    atlRaw *= dA;
    ctlRaw *= dC;
    // Distribui dias de treino uniformemente dentro da semana
    if (Math.floor(d * weeklyFreq / 7) > Math.floor((d - 1) * weeklyFreq / 7)) {
      atlRaw += lAtl;
      ctlRaw += lCtl;
    }
    out.push({
      day:  d,
      date: new Date(Date.now() + d * DAY),
      tsb:  (ctlRaw / ssCtl - atlRaw / ss) * 100,
      atl:  atlRaw / ss    * 100,
      ctl:  ctlRaw / ssCtl * 100,
    });
  }
  return out;
}

// Desenha o gráfico de projeção TSB num <canvas>. curState = getFatigaRaw(). Retorna primeiro ponto na zona ótima.
export function renderTSBChart(canvas, curState, weeklyFreq, loadPct, compDate) {
  if (!canvas || !curState) return null;
  const rect = canvas.getBoundingClientRect();
  const W  = Math.max(rect.width || (canvas.offsetWidth || 280), 200);
  const H  = 130;
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) { console.error('[TSBChart] getContext retornou null'); return null; }

  const data    = calcTSBProjection(curState, weeklyFreq, loadPct, 60);
  const TSB_LO  = 5, TSB_HI = 25;
  const PL = 28, PR = 6, PT = 10, PB = 18;
  const cW = W - PL - PR, cH = H - PT - PB;

  const curTsb = (curState.steadyState > 0 && curState.steadyStateCTL > 0)
    ? (curState.ctl / curState.steadyStateCTL - curState.fatigue / curState.steadyState) * 100 : 0;

  const vals = data.map(function(p) { return p.tsb; });
  const minV = Math.min(curTsb - 3, -5, Math.min.apply(null, vals));
  const maxV = Math.max(curTsb + 3, 30, Math.max.apply(null, vals));
  const rng  = maxV - minV || 1;

  function xOf(day) { return PL + (day / 60) * cW; }
  function yOf(v)   { return PT + (1 - (v - minV) / rng) * cH; }

  ctx.clearRect(0, 0, W, H);

  // Zona ótima (fundo verde suave)
  const yHi = yOf(TSB_HI), yLo = yOf(TSB_LO);
  ctx.fillStyle = 'rgba(201,255,58,0.09)';
  ctx.fillRect(PL, yHi, cW, yLo - yHi);
  ctx.strokeStyle = 'rgba(201,255,58,0.20)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  ctx.beginPath(); ctx.moveTo(PL, yHi); ctx.lineTo(PL + cW, yHi); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(PL, yLo); ctx.lineTo(PL + cW, yLo); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(201,255,58,0.35)';
  ctx.font = '8px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('forma', PL + 3, yHi + 9);

  // Linha zero
  if (0 >= minV && 0 <= maxV) {
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(PL, yOf(0)); ctx.lineTo(PL + cW, yOf(0)); ctx.stroke();
    ctx.setLineDash([]);
  }

  // Marcador da data de competição
  if (compDate) {
    var dComp = Math.round((new Date(compDate) - Date.now()) / 86400000);
    if (dComp >= 1 && dComp <= 60) {
      var xC = xOf(dComp);
      ctx.strokeStyle = 'rgba(108,99,255,0.65)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(xC, PT); ctx.lineTo(xC, PT + cH); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(108,99,255,0.85)';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('prova', xC, PT + 8);
    }
  }

  // Curva TSB (segmentos coloridos por zona)
  ctx.lineWidth = 2;
  var prevPt = { day: 0, tsb: curTsb };
  data.forEach(function(pt) {
    ctx.strokeStyle = (pt.tsb >= TSB_LO && pt.tsb <= TSB_HI) ? '#c9ff3a'
      : pt.tsb > TSB_HI ? '#ffb534' : '#ff5555';
    ctx.beginPath();
    ctx.moveTo(xOf(prevPt.day), yOf(prevPt.tsb));
    ctx.lineTo(xOf(pt.day), yOf(pt.tsb));
    ctx.stroke();
    prevPt = pt;
  });

  // Ponto do TSB atual (dia 0)
  ctx.fillStyle = (curTsb >= TSB_LO && curTsb <= TSB_HI) ? '#c9ff3a'
    : curTsb > TSB_HI ? '#ffb534' : '#ff5555';
  ctx.beginPath();
  ctx.arc(xOf(0), yOf(curTsb), 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Labels eixo Y
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.font = '8px monospace';
  ctx.textAlign = 'right';
  [-10, 0, 10, 20, 30].forEach(function(v) {
    if (v >= minV && v <= maxV) ctx.fillText((v > 0 ? '+' : '') + v, PL - 3, yOf(v) + 3);
  });

  // Labels eixo X (dias)
  ctx.textAlign = 'center';
  [7, 14, 21, 30, 45, 60].forEach(function(d) {
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillText(d + 'd', xOf(d), H - 4);
  });

  // Retorna primeiro dia na zona ótima
  for (var i = 0; i < data.length; i++) {
    if (data[i].tsb >= TSB_LO && data[i].tsb <= TSB_HI) return data[i];
  }
  return null;
}

// Popover ATL/CTL/TSB
(function () {
  const btn = document.getElementById('fadigaHelpBtn');
  const pop = document.getElementById('fadigaHelpPop');
  if (!btn || !pop) return;
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (pop.classList.contains('on')) { pop.classList.remove('on'); return; }
    const rc   = btn.getBoundingClientRect();
    const left = Math.min(rc.right - 280, window.innerWidth - 292);
    pop.style.top  = (rc.bottom + 8) + 'px';
    pop.style.left = Math.max(8, left) + 'px';
    pop.classList.add('on');
  });
  document.addEventListener('click', function () { pop.classList.remove('on'); });
  pop.addEventListener('click', function (e) { e.stopPropagation(); });
}());

// Popover MEV/MAV/MRV — fecha ao clicar fora
(function () {
  const pop = document.getElementById('vmrvHelpPop');
  if (!pop) return;
  document.addEventListener('click', function () { pop.classList.remove('on'); });
  pop.addEventListener('click', function (e) { e.stopPropagation(); });
}());

// Popover projeção TSB — abre ao clicar na linha TSB da navbar
(function () {
  const row = document.getElementById('ftgTsbRow');
  const pop = document.getElementById('tsbProjPop');
  if (!row || !pop) return;

  function _updateTsbProj() {
    const freqEl = document.getElementById('tsbProjFreqSlider');
    const loadEl = document.getElementById('tsbProjLoadSlider');
    const freqV  = document.getElementById('tsbProjFreqVal');
    const loadV  = document.getElementById('tsbProjLoadVal');
    const label  = document.getElementById('tsbProjLabel');
    const canvas = document.getElementById('tsbProjCanvas');
    if (!freqEl || !canvas) return;

    const freq = parseInt(freqEl.value) || 4;
    const load = parseFloat(loadEl.value) / 100 || 1.0;
    if (freqV) freqV.textContent = freq;
    if (loadV) loadV.textContent = Math.round(load * 100);

    let cur;
    try { cur = getFatigaRaw(); } catch (e) { console.error('[TSBProj] getFatigaRaw:', e); return; }

    let first;
    try {
      first = renderTSBChart(canvas, cur, freq, load, null);
    } catch (e) {
      console.error('[TSBProj] renderTSBChart:', e);
      if (label) { label.textContent = 'Erro: ' + e.message; label.style.color = 'var(--red)'; }
      return;
    }

    if (!label) return;
    if (first) {
      const d = first.date;
      label.textContent = 'Forma ótima em ~' + first.day + 'd (' + d.getDate() + '/' + (d.getMonth() + 1) + ')';
      label.style.color = 'var(--lime)';
    } else {
      label.textContent = 'Reduza a carga ou descanse para atingir a zona ótima';
      label.style.color = 'var(--amber)';
    }
  }

  row.addEventListener('click', function (e) {
    e.stopPropagation();
    if (pop.classList.contains('on')) { pop.classList.remove('on'); return; }
    const rc   = row.getBoundingClientRect();
    const left = Math.min(rc.left, window.innerWidth - 340);
    pop.style.top  = (rc.bottom + 8) + 'px';
    pop.style.left = Math.max(8, left) + 'px';
    pop.classList.add('on');
    // duplo rAF garante que o layout do popover está completo antes de medir o canvas
    requestAnimationFrame(function() { requestAnimationFrame(_updateTsbProj); });
  });

  pop.addEventListener('click', function (e) { e.stopPropagation(); });
  document.addEventListener('click', function () { pop.classList.remove('on'); });

  pop.addEventListener('input', _updateTsbProj);
}());
