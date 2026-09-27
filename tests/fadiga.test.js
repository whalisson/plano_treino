/**
 * Testes — fadiga.js (modelo Banister: ATL / CTL / TSB)
 *
 * O módulo lê estado vivo de workoutlog/rpe/state e o DOM dos RMs. Cada cenário
 * monta esse estado do zero e zera os memos com resetFadigaCaches().
 */

import {
  getFatigaRaw, calcFadiga, checkDeload, checkOverreaching, calcRestDays,
  calcTSBProjection, effortFactor, intensityFromSet,
  _patternKeyOf, resetFadigaCaches, NEURAL_KNEE, OTHER_INT_CAP,
} from '../js/fadiga.js';
import { setWorkoutLog } from '../js/workoutlog.js';
import { setRpeBlocks } from '../js/rpe.js';
import { setPeriodLog, customLifts } from '../js/state.js';

const DAY = 86400000;

// Mapeamento de lift nomeado — normalmente registrado por app.js
function installLiftKeys() {
  globalThis.liftKeyForExerciseName = function(name) {
    const n = String(name || '').toLowerCase();
    if (n.includes('supino')) return 'supino';
    if (n.includes('agacha')) return 'agacha';
    if (n.includes('terra'))  return 'terra';
    return null;
  };
}

function session(startedAt, exercises) {
  return { id: 's' + startedAt, date: '01/01/2026', dayIdx: 0, dayLabel: 'Segunda',
    startedAt, finishedAt: startedAt + 3600000, exercises };
}
function ex(name, sets, extra) {
  return Object.assign({ name, group: '', sets }, extra || {});
}
function sets(n, kg, reps) {
  return Array.from({ length: n }, () => ({ kg, reps, completedAt: 0 }));
}

function reset() {
  setWorkoutLog([]);
  setRpeBlocks([]);
  setPeriodLog([]);
  customLifts.length = 0;
  document.getElementById('user-age').value = '28';
  document.getElementById('user-exp').value = '3';
  document.getElementById('rm-supino').value = '100';
  document.getElementById('rm-agacha').value = '140';
  document.getElementById('rm-terra').value  = '180';
  resetFadigaCaches();
}

beforeEach(() => { installLiftKeys(); reset(); });

// ─────────────────────────────────────────────────────────────────────────────
// effortFactor — custo de esforço por intensidade
// ─────────────────────────────────────────────────────────────────────────────

describe('effortFactor()', () => {
  test('vale 1.0 na intensidade de referência (65% 1RM)', () => {
    expect(effortFactor(0.65)).toBeCloseTo(1.0, 10);
  });

  test('é contínua na junção dos dois ramos (55%)', () => {
    const left  = effortFactor(0.55 - 1e-9);
    const right = effortFactor(0.55 + 1e-9);
    expect(Math.abs(left - right)).toBeLessThan(1e-6);
  });

  test('cresce monotonicamente com a intensidade', () => {
    let prev = -1;
    for (let i = 0; i <= 1.0; i += 0.05) {
      const cur = effortFactor(i);
      expect(cur).toBeGreaterThan(prev);
      prev = cur;
    }
  });

  test('intensidade zero não custa nada', () => {
    expect(effortFactor(0)).toBe(0);
  });

  test('aquecimento leve custa bem menos que carga de trabalho', () => {
    expect(effortFactor(0.3)).toBeLessThan(effortFactor(0.65) * 0.35);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// intensityFromSet — intensidade efetiva via Epley
// ─────────────────────────────────────────────────────────────────────────────

describe('intensityFromSet()', () => {
  test('single no 1RM dá intensidade 1.0', () => {
    expect(intensityFromSet(100, 1, 100)).toBeCloseTo(1.0, 6);
  });

  test('mais reps no mesmo peso = intensidade efetiva maior', () => {
    expect(intensityFromSet(80, 8, 100)).toBeGreaterThan(intensityFromSet(80, 3, 100));
  });

  test('nunca passa de 1.0 mesmo acima do RM declarado', () => {
    expect(intensityFromSet(200, 10, 100)).toBe(1.0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Invariante do componente neural
// ─────────────────────────────────────────────────────────────────────────────

describe('rampa neural — invariante de alcance', () => {
  test('o cap de _other fica ACIMA do joelho neural', () => {
    // Com cap 0.90 < joelho 0.92, nenhum exercício sem lift nomeado
    // alcançava o componente neural, por mais pesado que fosse.
    expect(OTHER_INT_CAP).toBeGreaterThan(NEURAL_KNEE);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// _patternKeyOf — grupo persistido tem precedência sobre keywords
// ─────────────────────────────────────────────────────────────────────────────

describe('_patternKeyOf() — resolução de padrão', () => {
  test('o group gravado vence as keywords do nome', () => {
    expect(_patternKeyOf('Exercício Sem Nome Conhecido', 'legs')).toBe('legs');
    expect(_patternKeyOf('Exercício Sem Nome Conhecido', 'pull')).toBe('pull');
    expect(_patternKeyOf('Exercício Sem Nome Conhecido', 'push')).toBe('push');
  });

  test('group vazio cai nas keywords do nome', () => {
    expect(_patternKeyOf('Leg Press 45', '')).toBe('legs');
    expect(_patternKeyOf('Remada Curvada', '')).toBe('pull');
  });

  test('nome desconhecido e sem group vira isolation', () => {
    expect(_patternKeyOf('Zzzz Qualquer Coisa', '')).toBe('isolation');
  });

  test('isolados reconhecidos ganham padrão específico', () => {
    expect(_patternKeyOf('Rosca Direta', '')).toBe('iso_biceps');
    expect(_patternKeyOf('Tríceps Pulley', '')).toBe('iso_triceps');
    expect(_patternKeyOf('Elevação Lateral', '')).toBe('iso_delts');
    expect(_patternKeyOf('Crucifixo Inclinado', '')).toBe('iso_chest');
  });

  test('core não é mais classificado como cardio', () => {
    expect(_patternKeyOf('Prancha Isométrica', '')).toBe('core');
    expect(_patternKeyOf('Abdominal Infra', '')).toBe('core');
  });

  test('cardio de verdade continua cardio', () => {
    expect(_patternKeyOf('Esteira 20min', '')).toBe('cardio');
    expect(_patternKeyOf('Bike Ergométrica', '')).toBe('cardio');
  });

  test('acentos não atrapalham o casamento', () => {
    expect(_patternKeyOf('Agachamento Búlgaro', '')).toBe('legs');
    expect(_patternKeyOf('Elevação Frontal', '')).toBe('iso_delts');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getFatigaRaw — contrato e monotonicidade
// ─────────────────────────────────────────────────────────────────────────────

describe('getFatigaRaw() — contrato', () => {
  test('histórico vazio não lança e devolve denominadores positivos', () => {
    const r = getFatigaRaw();
    expect(r.fatigue).toBe(0);
    expect(r.ctl).toBe(0);
    expect(r.steadyState).toBeGreaterThan(0);
    expect(r.steadyStateCTL).toBeGreaterThan(0);
  });

  test('devolve tauAtlDays utilizável', () => {
    const now = Date.now();
    setWorkoutLog([session(now - DAY, [ex('Supino Reto', sets(3, 80, 5))])]);
    resetFadigaCaches();
    const r = getFatigaRaw();
    expect(r.tauAtlDays).toBeGreaterThan(0);
    expect(Number.isFinite(r.tauAtlDays)).toBe(true);
  });

  test('mais volume gera mais fadiga', () => {
    const now = Date.now();
    setWorkoutLog([session(now - DAY, [ex('Supino Reto', sets(3, 80, 5))])]);
    resetFadigaCaches();
    const leve = getFatigaRaw().fatigue;

    setWorkoutLog([session(now - DAY, [ex('Supino Reto', sets(9, 80, 5))])]);
    resetFadigaCaches();
    expect(getFatigaRaw().fatigue).toBeGreaterThan(leve);
  });

  test('fadiga decai com o tempo decorrido', () => {
    const now = Date.now();
    setWorkoutLog([session(now - DAY, [ex('Supino Reto', sets(5, 85, 5))])]);
    resetFadigaCaches();
    const recente = getFatigaRaw().fatigue;

    setWorkoutLog([session(now - 20 * DAY, [ex('Supino Reto', sets(5, 85, 5))])]);
    resetFadigaCaches();
    expect(getFatigaRaw().fatigue).toBeLessThan(recente);
  });

  test('sessões no futuro não contam para o agora', () => {
    const now = Date.now();
    setWorkoutLog([session(now + 5 * DAY, [ex('Supino Reto', sets(5, 85, 5))])]);
    resetFadigaCaches();
    expect(getFatigaRaw(now).fatigue).toBe(0);
  });

  test('dados malformados não derrubam o cálculo', () => {
    const now = Date.now();
    setWorkoutLog([
      { id: 'a', startedAt: now - DAY, exercises: null },
      { id: 'b', startedAt: now - DAY, exercises: [{ name: 'X', sets: null }] },
      { id: 'c', startedAt: null, exercises: [ex('Y', sets(2, 10, 10))] },
      session(now - DAY, [ex('Supino Reto', [{ kg: NaN, reps: 5 }, { kg: 80, reps: 0 }])]),
    ]);
    resetFadigaCaches();
    expect(() => getFatigaRaw()).not.toThrow();
    expect(Number.isFinite(getFatigaRaw().fatigue)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ex.group alimenta o modelo — antes tudo que não casava keyword virava isolation
// ─────────────────────────────────────────────────────────────────────────────

describe('ex.group alimenta o modelo', () => {
  test('nome desconhecido com group legs pesa mais que sem group', () => {
    const now = Date.now();
    const nome = 'Maquina Importada XYZ';

    setWorkoutLog([session(now - DAY, [ex(nome, sets(4, 120, 8), { group: '' })])]);
    resetFadigaCaches();
    const semGrupo = getFatigaRaw().fatigue;

    setWorkoutLog([session(now - DAY, [ex(nome, sets(4, 120, 8), { group: 'legs' })])]);
    resetFadigaCaches();
    const comGrupo = getFatigaRaw().fatigue;

    // isolation tem tlScale 0.35; legs tem 1.0 — a diferença precisa ser grande
    expect(comGrupo).toBeGreaterThan(semGrupo * 2);
  });

  test('group core usa o padrão core sem quebrar', () => {
    const now = Date.now();
    setWorkoutLog([session(now - DAY, [ex('Coisa Estranha', sets(3, 20, 15), { group: 'core' })])]);
    resetFadigaCaches();
    expect(getFatigaRaw().fatigue).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cross-fatigue — mapas musculares vazios zeravam o vazamento
// ─────────────────────────────────────────────────────────────────────────────

describe('cross-fatigue entre músculos compartilhados', () => {
  // O vazamento é superaditivo: treinar A e B juntos custa mais que A e B
  // isolados, e a diferença é exatamente o cross-fatigue. Comparar dois pares
  // diferentes não serviria — τ e excêntrico distintos mascaram o efeito.
  const now = Date.now();
  const fatigueOf = (exercises) => {
    setWorkoutLog([session(now - DAY, exercises)]);
    resetFadigaCaches();
    return getFatigaRaw(now).fatigue;
  };
  const rosca    = () => ex('Rosca Direta',   sets(4, 30, 10));
  const remada   = () => ex('Remada Curvada', sets(4, 70, 10));
  const legPress = () => ex('Leg Press 45',   sets(4, 70, 10));

  test('isolado de bíceps vaza para puxada (músculo em comum)', () => {
    const a  = fatigueOf([rosca()]);
    const b  = fatigueOf([remada()]);
    const ab = fatigueOf([rosca(), remada()]);
    expect(ab).toBeGreaterThan(a + b);
  });

  test('bíceps e quadríceps não compartilham motor — sem vazamento', () => {
    const a  = fatigueOf([rosca()]);
    const c  = fatigueOf([legPress()]);
    const ac = fatigueOf([rosca(), legPress()]);
    expect(ac).toBeCloseTo(a + c, 6);
  });

  test('isolado não reconhecido não vaza (músculo desconhecido)', () => {
    const desconhecido = () => ex('Zzzz Qualquer Coisa', sets(4, 40, 10));
    const a  = fatigueOf([desconhecido()]);
    const b  = fatigueOf([remada()]);
    const ab = fatigueOf([desconhecido(), remada()]);
    expect(ab).toBeCloseTo(a + b, 6);
  });

  test('cardio é fadiga sistêmica — não vaza por sobreposição', () => {
    const esteira = () => ex('Esteira 20min', sets(1, 1, 20));
    const a  = fatigueOf([esteira()]);
    const b  = fatigueOf([remada()]);
    const ab = fatigueOf([esteira(), remada()]);
    expect(ab).toBeCloseTo(a + b, 6);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Caches — invalidação e isolamento temporal
// ─────────────────────────────────────────────────────────────────────────────

describe('caches', () => {
  test('consulta histórica não enxerga séries posteriores a ela', () => {
    const now  = Date.now();
    const past = now - 10 * DAY;

    setWorkoutLog([session(now - 30 * DAY, [ex('Leg Press 45', sets(4, 100, 8))])]);
    resetFadigaCaches();
    const antes = getFatigaRaw(past).fatigue;

    // Acrescenta treino DEPOIS do instante consultado
    setWorkoutLog([
      session(now - 30 * DAY, [ex('Leg Press 45', sets(4, 100, 8))]),
      session(now - 2 * DAY,  [ex('Leg Press 45', sets(10, 200, 8))]),
    ]);
    resetFadigaCaches();
    const depois = getFatigaRaw(past).fatigue;

    expect(depois).toBeCloseTo(antes, 6);
  });

  test('mudança nos dados invalida o memo por dia', () => {
    const now = Date.now();
    setWorkoutLog([session(now - DAY, [ex('Supino Reto', sets(3, 80, 5))])]);
    const a = getFatigaRaw(now).fatigue;

    setWorkoutLog([session(now - DAY, [ex('Supino Reto', sets(12, 95, 5))])]);
    const b = getFatigaRaw(now).fatigue;

    expect(b).toBeGreaterThan(a);
  });

  test('trocar kg e reps entre si muda o resultado (hash não colide)', () => {
    const now = Date.now();
    setWorkoutLog([session(now - DAY, [ex('Leg Press 45', [{ kg: 100, reps: 5 }])])]);
    const a = getFatigaRaw(now).fatigue;

    setWorkoutLog([session(now - DAY, [ex('Leg Press 45', [{ kg: 5, reps: 100 }])])]);
    const b = getFatigaRaw(now).fatigue;

    expect(a).not.toBeCloseTo(b, 6);
  });

  test('alterar o perfil de recuperação invalida o cache', () => {
    const now = Date.now();
    setWorkoutLog([session(now - 2 * DAY, [ex('Supino Reto', sets(5, 85, 5))])]);
    resetFadigaCaches();
    const jovem = getFatigaRaw(now).fatigue;

    document.getElementById('user-age').value = '50';  // τ mais longo → retém mais fadiga
    resetFadigaCaches();
    const maisVelho = getFatigaRaw(now).fatigue;

    expect(maisVelho).toBeGreaterThan(jovem);
  });

  test('mesma consulta repetida é estável', () => {
    const now = Date.now();
    setWorkoutLog([session(now - DAY, [ex('Supino Reto', sets(4, 80, 5))])]);
    resetFadigaCaches();
    expect(getFatigaRaw(now).fatigue).toBe(getFatigaRaw(now).fatigue);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcFadiga / checkDeload / checkOverreaching / calcRestDays
// ─────────────────────────────────────────────────────────────────────────────

describe('indicadores derivados', () => {
  test('calcFadiga devolve percentual inteiro e finito', () => {
    const now = Date.now();
    setWorkoutLog([session(now - DAY, [ex('Supino Reto', sets(5, 85, 5))])]);
    resetFadigaCaches();
    const v = calcFadiga();
    expect(Number.isInteger(v)).toBe(true);
    expect(v).toBeGreaterThanOrEqual(0);
  });

  test('sem histórico não pede deload nem acusa overreaching', () => {
    expect(checkDeload().needed).toBe(false);
    expect(checkOverreaching().needed).toBe(false);
  });

  test('checkDeload expõe o contrato completo', () => {
    const d = checkDeload();
    expect(d).toHaveProperty('needed');
    expect(d).toHaveProperty('days');
    expect(d).toHaveProperty('atlPct');
    expect(d).toHaveProperty('suggestedPct');
    expect(d.suggestedPct).toBeGreaterThan(0);
    expect(d.suggestedPct).toBeLessThan(100);
  });

  test('sem fadiga acumulada não há dias de descanso a cumprir', () => {
    expect(calcRestDays()).toBe(0);
  });

  test('calcRestDays devolve inteiro dentro do horizonte da busca', () => {
    const now = Date.now();
    const heavy = [];
    for (let d = 0; d < 14; d++) {
      heavy.push(session(now - d * DAY, [
        ex('Agachamento Livre', sets(8, 130, 5)),
        ex('Levantamento Terra', sets(6, 170, 3)),
      ]));
    }
    setWorkoutLog(heavy);
    resetFadigaCaches();
    const r = calcRestDays();
    expect(Number.isInteger(r)).toBe(true);
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThanOrEqual(60);
  });

  test('bloco pesado recente eleva o ATL acima do leve', () => {
    const now = Date.now();
    setWorkoutLog([session(now - DAY, [ex('Supino Reto', sets(2, 60, 5))])]);
    resetFadigaCaches();
    const leve = calcFadiga();

    const heavy = [];
    for (let d = 0; d < 10; d++) {
      heavy.push(session(now - d * DAY, [ex('Supino Reto', sets(8, 95, 3))]));
    }
    setWorkoutLog(heavy);
    resetFadigaCaches();
    expect(calcFadiga()).toBeGreaterThan(leve);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcTSBProjection
// ─────────────────────────────────────────────────────────────────────────────

describe('calcTSBProjection()', () => {
  const baseState = () => ({
    fatigue: 5000, ctl: 4000, steadyState: 5000, steadyStateCTL: 5000, tauAtlDays: 10,
  });

  test('devolve um ponto por dia do horizonte', () => {
    expect(calcTSBProjection(baseState(), 4, 1.0, 30)).toHaveLength(30);
    expect(calcTSBProjection(baseState(), 4, 1.0, 60)).toHaveLength(60);
  });

  test('cada ponto traz day, date, tsb, atl e ctl', () => {
    const p = calcTSBProjection(baseState(), 4, 1.0, 10)[0];
    expect(p.day).toBe(1);
    expect(p.date instanceof Date).toBe(true);
    expect(Number.isFinite(p.tsb)).toBe(true);
    expect(Number.isFinite(p.atl)).toBe(true);
    expect(Number.isFinite(p.ctl)).toBe(true);
  });

  test('descanso total faz o ATL cair monotonicamente', () => {
    const out = calcTSBProjection(baseState(), 0, 1.0, 20);
    for (let i = 1; i < out.length; i++) {
      expect(out[i].atl).toBeLessThan(out[i - 1].atl);
    }
  });

  test('descanso total leva o TSB para cima', () => {
    const out = calcTSBProjection(baseState(), 0, 1.0, 30);
    expect(out[29].tsb).toBeGreaterThan(out[0].tsb);
  });

  test('mais frequência retém mais ATL', () => {
    const pouco = calcTSBProjection(baseState(), 2, 1.0, 30)[29].atl;
    const muito = calcTSBProjection(baseState(), 6, 1.0, 30)[29].atl;
    expect(muito).toBeGreaterThan(pouco);
  });

  test('τ mais longo retém mais fadiga ao descansar', () => {
    const curto = Object.assign(baseState(), { tauAtlDays: 3 });
    const longo = Object.assign(baseState(), { tauAtlDays: 18 });
    const a = calcTSBProjection(curto, 0, 1.0, 14)[13].atl;
    const b = calcTSBProjection(longo, 0, 1.0, 14)[13].atl;
    expect(b).toBeGreaterThan(a);
  });

  test('tauAtlDays ausente ou inválido usa o fallback sem quebrar', () => {
    const semTau = { fatigue: 5000, ctl: 4000, steadyState: 5000, steadyStateCTL: 5000 };
    const out = calcTSBProjection(semTau, 4, 1.0, 10);
    expect(out).toHaveLength(10);
    out.forEach(p => expect(Number.isFinite(p.atl)).toBe(true));
  });

  test('frequência é limitada ao intervalo 0..7', () => {
    expect(() => calcTSBProjection(baseState(), 99, 1.0, 5)).not.toThrow();
    expect(() => calcTSBProjection(baseState(), -5, 1.0, 5)).not.toThrow();
  });

  test('carga zero equivale a descanso total', () => {
    const semCarga  = calcTSBProjection(baseState(), 5, 0, 20)[19].atl;
    const semTreino = calcTSBProjection(baseState(), 0, 1.0, 20)[19].atl;
    expect(semCarga).toBeCloseTo(semTreino, 6);
  });
});
