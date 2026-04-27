/**
 * Testes Preventivos de Arquitetura — Gorila Gym
 *
 * Documentam e protegem os contratos arquiteturais do projeto.
 * Falham quando uma refatoração quebra uma interface existente,
 * servindo de rede de segurança para as melhorias planejadas:
 *
 *  1. Constantes   — valores estáveis (extração para constants.js)
 *  2. applyState   — completude dos renders ao quebrar app.js
 *  3. Setters      — board/bank via setter, não export mutável
 *  4. Schema       — campos obrigatórios no estado persistido
 *  5. Simetria     — gorila-save ↔ applyState restauram as mesmas chaves
 */

import { applyState, exportData } from '../js/app.js';
import { createWorkoutSession, addSet } from '../js/workoutlog.js';

// ── Lista canônica de render functions chamadas por applyState ────────────────
// Se uma função for removida ou adicionada a applyState, atualize aqui também.
const RENDER_FNS = [
  'buildAllPeriod',
  'calcRM',
  'renderCustomLifts',
  'populateRMLiftSelect',
  'renderRMHistory',
  'renderKanban',
  'renderBank',
  'setupBankDropzone',
  'renderPeriodGrid',
  'renderProgressCharts',
  'renderBuilderSegs',
  'renderSavedWorkouts',
  'renderCycleHistory',
  'renderRPEBlocks',
  'renderWorkoutHistory',
  'updateFadigaBar',
  'updateDeloadBanner',
];

// ── Chaves canônicas do payload de gorila-save ────────────────────────────────
// Qualquer chave nova salva precisa ser adicionada aqui E tratada em applyState.
const SAVE_KEYS = [
  'bank', 'board',
  'cardioDailyGoal', 'cardioExtra', 'cardioGoal',
  'checks', 'customLifts', 'cycleHistory', 'cycleStartDates',
  'deloadMode',
  'kgHistory',
  'periodLog',
  'rmAgacha', 'rmHistory', 'rmSupino', 'rmTerra', 'rmTests',
  'rpeBlocks',
  'savedWorkouts',
  'workoutLog',
];

function mockAllRenders() {
  RENDER_FNS.forEach(fn => { globalThis[fn] = vi.fn(); });
}

beforeEach(() => {
  document.getElementById('rm-supino').value       = '74';
  document.getElementById('rm-agacha').value       = '93';
  document.getElementById('rm-terra').value        = '110';
  document.getElementById('cardioGoal').value      = '300';
  document.getElementById('cardioDailyGoal').value = '43';

  global.board           = [[], [], [], [], [], [], []];
  global.bank            = [];
  global.kgHistory       = {};
  global.cycleHistory    = [];
  global.rmHistory       = [];
  global.cardioExtra     = {};
  global.checksState     = {};
  global.rmTestValues    = {};
  global.savedWorkouts   = [];
  global.rpeBlocks       = [];
  global.customLifts     = [];
  global.cycleStartDates = {};
  global.workoutLog      = [];

  mockAllRenders();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. CONSTANTES
// Garante que valores não derivem quando forem extraídos para constants.js
// ─────────────────────────────────────────────────────────────────────────────

describe('Constantes — LIFT_LABELS', () => {
  test('tem exatamente as chaves: supino, agacha, terra', () => {
    expect(Object.keys(LIFT_LABELS).sort()).toEqual(['agacha', 'supino', 'terra']);
  });

  test('LIFT_LABELS.supino === "Supino"', () => {
    expect(LIFT_LABELS.supino).toBe('Supino');
  });

  test('LIFT_LABELS.agacha === "Agachamento"', () => {
    expect(LIFT_LABELS.agacha).toBe('Agachamento');
  });

  test('LIFT_LABELS.terra === "Terra"', () => {
    expect(LIFT_LABELS.terra).toBe('Terra');
  });

  test('LIFT_COLORS, LIFT_FILL e LIFT_SOLID têm as mesmas chaves que LIFT_LABELS', () => {
    const keys = Object.keys(LIFT_LABELS).sort();
    expect(Object.keys(LIFT_COLORS).sort()).toEqual(keys);
    expect(Object.keys(LIFT_FILL).sort()).toEqual(keys);
    expect(Object.keys(LIFT_SOLID).sort()).toEqual(keys);
  });

  test('LIFT_SOLID contém cores hex válidas (#rrggbb)', () => {
    const hexRE = /^#[0-9a-f]{6}$/i;
    Object.values(LIFT_SOLID).forEach(v => expect(v).toMatch(hexRE));
  });

  test('CUSTOM_LIFT_PALETTE é array não-vazio de hex (#rrggbb)', () => {
    const hexRE = /^#[0-9a-f]{6}$/i;
    expect(Array.isArray(CUSTOM_LIFT_PALETTE)).toBe(true);
    expect(CUSTOM_LIFT_PALETTE.length).toBeGreaterThan(0);
    CUSTOM_LIFT_PALETTE.forEach(c => expect(c).toMatch(hexRE));
  });

  test('DAYS tem 7 entradas (uma por dia da semana)', () => {
    expect(DAYS).toHaveLength(7);
  });

  test('DAYS[0] é "Segunda" e DAYS[6] é "Domingo"', () => {
    expect(DAYS[0]).toBe('Segunda');
    expect(DAYS[6]).toBe('Domingo');
  });
});

describe('Constantes — periodBase', () => {
  test('tem exatamente 12 semanas', () => {
    expect(periodBase).toHaveLength(12);
  });

  test('cada semana tem label "Semana N" (1-12)', () => {
    periodBase.forEach((w, i) => {
      expect(w.label).toBe(`Semana ${i + 1}`);
    });
  });

  test('percentuais de trabalho estão entre 0.3 e 1.1 (30%–110%)', () => {
    periodBase.forEach(w => {
      (w.series || []).forEach(s => {
        expect(s.p).toBeGreaterThanOrEqual(0.3);
        expect(s.p).toBeLessThanOrEqual(1.1);
      });
    });
  });

  test('Semana 5 (índice 4) é a semana de deload', () => {
    expect(periodBase[4].deload).toBe(true);
  });

  test('Semana 10 (índice 9) é semana de descanso total', () => {
    expect(periodBase[9].rest).toBe(true);
  });

  test('Semana 11 (índice 10) tem série com p=1.05 (teste de RM)', () => {
    const s11 = periodBase[10].series;
    expect(Array.isArray(s11)).toBe(true);
    expect(s11.some(s => s.p === 1.05)).toBe(true);
  });

  test('semanas com series têm pelo menos uma entrada', () => {
    periodBase
      .filter(w => !w.rest && w.series)
      .forEach(w => expect(w.series.length).toBeGreaterThan(0));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. applyState — completude dos renders
// Garante que ao refatorar app.js nenhum render seja perdido
// ─────────────────────────────────────────────────────────────────────────────

describe('applyState — completude dos renders', () => {
  test('chama todas as render functions da lista canônica', () => {
    // Captura referências ANTES de applyState — ela sobrescreve renderKanban
    // com um wrapper real após o RENDER_QUEUE, invalidando o vi.fn().
    const mocks = Object.fromEntries(RENDER_FNS.map(fn => [fn, globalThis[fn]]));
    applyState(null);
    RENDER_FNS.forEach(fn => {
      expect(
        mocks[fn].mock.calls.length,
        `"${fn}" deveria ter sido chamada mas não foi`
      ).toBeGreaterThanOrEqual(1);
    });
  });

  test('render functions ausentes do globalThis não lançam exceção', () => {
    RENDER_FNS.forEach(fn => { delete globalThis[fn]; });
    expect(() => applyState(null)).not.toThrow();
  });

  test('applyState(null) não lança exceção', () => {
    expect(() => applyState(null)).not.toThrow();
  });

  test('duas chamadas consecutivas não acumulam side-effects fatais', () => {
    expect(() => { applyState(null); applyState(null); }).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Setters de estado — board / bank
// Garante que setBoard/setBank substituem a referência do módulo,
// protegendo a conversão de exports mutáveis para setters
// ─────────────────────────────────────────────────────────────────────────────

describe('setBoard — contrato do setter', () => {
  test('setBoard(newBoard) atualiza a referência global de board', () => {
    const newBoard = Array.from({ length: 7 }, () => []);
    newBoard[0].push({ id: 'x1', name: 'Supino', kg: 80, reps: '3x5' });
    setBoard(newBoard);
    expect(board).toBe(newBoard);
    expect(board[0][0].name).toBe('Supino');
  });

  test('board sempre tem length 7 após setBoard com array de 7 elementos', () => {
    const b = Array.from({ length: 7 }, () => []);
    setBoard(b);
    expect(board).toHaveLength(7);
  });

  test('applyState com board de 7 elementos usa setBoard', () => {
    const newBoard = Array.from({ length: 7 }, () => []);
    newBoard[3].push({ id: 'e1', name: 'Terra', kg: 110, reps: '5x3' });
    applyState({ board: newBoard });
    expect(board[3][0].name).toBe('Terra');
  });

  test('applyState com board de tamanho diferente de 7 não substitui o board', () => {
    const original = board;
    applyState({ board: [[], [], []] });
    expect(board).toBe(original);
  });

  test('cada elemento de board é um array após setBoard', () => {
    const newBoard = Array.from({ length: 7 }, () => []);
    setBoard(newBoard);
    board.forEach(day => expect(Array.isArray(day)).toBe(true));
  });
});

describe('setBank — contrato do setter', () => {
  test('setBank(newBank) atualiza a referência global de bank', () => {
    const newBank = [{ id: 'b1', name: 'Rosca Direta', kg: 30, reps: '3x12', group: 'pull' }];
    setBank(newBank);
    expect(bank).toBe(newBank);
    expect(bank[0].name).toBe('Rosca Direta');
  });

  test('setBank([]) esvazia o bank sem erros', () => {
    setBank([{ id: 'old', name: 'Old', kg: 10, reps: '3x10', group: 'push' }]);
    setBank([]);
    expect(bank).toHaveLength(0);
  });

  test('applyState com bank atualiza a referência global', () => {
    const newBank = [{ id: 'b2', name: 'Supino Inclinado', kg: 70, reps: '3x10', group: 'push' }];
    applyState({ bank: newBank });
    expect(bank).toBe(newBank);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Schema do estado — campos obrigatórios
// Garante integridade das estruturas de dados ao adicionar validação
// ─────────────────────────────────────────────────────────────────────────────

describe('Schema — checksState', () => {
  test('aceita objeto com chaves supino, agacha, terra', () => {
    const cs = { supino: {}, agacha: {}, terra: {} };
    setChecksState(cs);
    expect(Object.keys(checksState).sort()).toEqual(['agacha', 'supino', 'terra']);
  });

  test('checksState[lift][weekIdx][cbKey] armazena boolean', () => {
    setChecksState({ supino: { 0: { 'cb-0': true, 'cb-1': false } }, agacha: {}, terra: {} });
    expect(checksState.supino[0]['cb-0']).toBe(true);
    expect(checksState.supino[0]['cb-1']).toBe(false);
  });
});

describe('Schema — rmTestValues', () => {
  test('rmTestValues[lift][weekIdx] armazena número', () => {
    setRmTestValues({ supino: { 3: 95 }, agacha: { 5: 110 }, terra: {} });
    expect(rmTestValues.supino[3]).toBe(95);
    expect(rmTestValues.agacha[5]).toBe(110);
  });
});

describe('Schema — sessão workoutLog', () => {
  const makeBoard = () => [[
    { id: 'ex1', srcId: 'src1', name: 'Supino Reto', kg: 80, reps: '3x10', group: 'push' },
    { id: 'ex2', srcId: 'src2', name: 'Terra',       kg: 110, reps: '3x5',  group: 'pull' },
  ], [], [], [], [], [], []];

  test('createWorkoutSession retorna sessão com campos obrigatórios', () => {
    const session = createWorkoutSession(makeBoard(), 0, '25/04/2026');
    expect(session).toHaveProperty('id');
    expect(session).toHaveProperty('date', '25/04/2026');
    expect(session).toHaveProperty('dayIdx', 0);
    expect(session).toHaveProperty('exercises');
    expect(session).toHaveProperty('startedAt');
    expect(session).toHaveProperty('finishedAt');
  });

  test('cada exercício na sessão tem os campos obrigatórios', () => {
    const session = createWorkoutSession(makeBoard(), 0, '25/04/2026');
    session.exercises.forEach(ex => {
      expect(ex).toHaveProperty('name');
      expect(ex).toHaveProperty('plannedKg');
      expect(ex).toHaveProperty('plannedReps');
      expect(ex).toHaveProperty('sets');
      expect(Array.isArray(ex.sets)).toBe(true);
    });
  });

  test('sets começa vazio para todos os exercícios', () => {
    const session = createWorkoutSession(makeBoard(), 0, '25/04/2026');
    session.exercises.forEach(ex => expect(ex.sets).toHaveLength(0));
  });

  test('addSet é imutável — não muta a sessão original', () => {
    const session = createWorkoutSession(makeBoard(), 0, '25/04/2026');
    const updated = addSet(session, 'Supino Reto', { kg: 80, reps: 10 });
    expect(session.exercises[0].sets).toHaveLength(0);
    expect(updated.exercises[0].sets).toHaveLength(1);
  });

  test('addSet preserva os campos do set: reps, kg, completedAt', () => {
    const session = createWorkoutSession(makeBoard(), 0, '25/04/2026');
    const updated = addSet(session, 'Supino Reto', { kg: 80, reps: 10 });
    const s = updated.exercises[0].sets[0];
    expect(s).toHaveProperty('reps', 10);
    expect(s).toHaveProperty('kg', 80);
    expect(s).toHaveProperty('completedAt');
    expect(typeof s.completedAt).toBe('number');
  });
});

describe('Schema — kgHistory', () => {
  test('entradas têm date, kg e name', () => {
    const id = uid();
    kgHistory[id] = [{ date: '25/04/2026', kg: 80, name: 'Supino Reto', note: '' }];
    const e = kgHistory[id][0];
    expect(e).toHaveProperty('date');
    expect(e).toHaveProperty('kg');
    expect(e).toHaveProperty('name');
    delete kgHistory[id];
  });

  test('date segue formato dd/mm/yyyy', () => {
    const id = uid();
    kgHistory[id] = [{ date: '25/04/2026', kg: 80, name: 'Supino', note: '' }];
    expect(kgHistory[id][0].date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    delete kgHistory[id];
  });

  test('múltiplas entradas para o mesmo id são acumuladas no array', () => {
    const id = uid();
    kgHistory[id] = [];
    kgHistory[id].push({ date: '18/04/2026', kg: 75, name: 'Supino', note: '' });
    kgHistory[id].push({ date: '25/04/2026', kg: 80, name: 'Supino', note: 'PR' });
    expect(kgHistory[id]).toHaveLength(2);
    expect(kgHistory[id][1].kg).toBe(80);
    delete kgHistory[id];
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. gorila-save ↔ applyState — simetria do payload
// Garante que o que é salvo pode ser restaurado e que nada é esquecido
// ─────────────────────────────────────────────────────────────────────────────

describe('gorila-save — payload', () => {
  let savedPayload;

  beforeEach(() => {
    savedPayload = null;
    global.idbSet = vi.fn().mockImplementation((_key, data) => {
      savedPayload = data;
      return Promise.resolve();
    });
  });

  async function fireSaveAndFlush() {
    document.dispatchEvent(new CustomEvent('gorila-save'));
    await Promise.resolve();
    await Promise.resolve();
  }

  test('gorila-save chama idbSet com objeto não-nulo', async () => {
    await fireSaveAndFlush();
    expect(global.idbSet).toHaveBeenCalled();
    expect(savedPayload).not.toBeNull();
    expect(typeof savedPayload).toBe('object');
  });

  test('payload contém todas as chaves canônicas de SAVE_KEYS', async () => {
    await fireSaveAndFlush();
    SAVE_KEYS.forEach(key => {
      expect(
        Object.prototype.hasOwnProperty.call(savedPayload, key),
        `chave "${key}" ausente do payload de gorila-save`
      ).toBe(true);
    });
  });

  test('payload não tem chaves extras além das documentadas em SAVE_KEYS', async () => {
    await fireSaveAndFlush();
    const actual = Object.keys(savedPayload).sort();
    expect(actual).toEqual(SAVE_KEYS);
  });

  test('payload restaurável: applyState(payload) não lança exceção', async () => {
    await fireSaveAndFlush();
    expect(() => applyState(savedPayload)).not.toThrow();
  });

  test('rmSupino no payload reflete o valor do input', async () => {
    document.getElementById('rm-supino').value = '95';
    await fireSaveAndFlush();
    expect(savedPayload.rmSupino).toBe(95);
  });

  test('board no payload tem length 7', async () => {
    await fireSaveAndFlush();
    expect(savedPayload.board).toHaveLength(7);
  });
});

describe('exportData — contrato de exportação', () => {
  test('não lança exceção', () => {
    expect(() => exportData()).not.toThrow();
  });

  test('aciona URL.createObjectURL com um Blob do tipo application/json', () => {
    let capturedBlob;
    const spy = vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => {
      capturedBlob = blob;
      return 'blob:mock';
    });
    exportData();
    expect(capturedBlob).toBeInstanceOf(Blob);
    expect(capturedBlob.type).toBe('application/json');
    spy.mockRestore();
  });

  test('JSON exportado contém as chaves essenciais de estado', () => {
    const EXPORT_REQUIRED = [
      'rmSupino', 'rmAgacha', 'rmTerra',
      'board', 'bank', 'kgHistory',
      'checks', 'rmTests',
      'cycleHistory', 'rmHistory',
      'cardioExtra', 'savedWorkouts',
      'rpeBlocks', 'customLifts',
      'workoutLog', '_version', '_exportedAt',
    ];

    let jsonStr = '';
    const origBlob = globalThis.Blob;

    globalThis.Blob = class MockBlob {
      constructor(parts, opts) {
        jsonStr = parts[0];
        this.type = (opts && opts.type) || '';
        this.size = jsonStr.length;
      }
    };

    const spy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    exportData();
    globalThis.Blob = origBlob;
    spy.mockRestore();

    const parsed = JSON.parse(jsonStr);
    EXPORT_REQUIRED.forEach(key => {
      expect(
        Object.prototype.hasOwnProperty.call(parsed, key),
        `exportData() não incluiu a chave "${key}"`
      ).toBe(true);
    });
  });
});
