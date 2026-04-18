/**
 * Testes - app.js
 * Cobre: applyState(), liftKeyForExerciseName(), exportData()
 */

import { applyState, liftKeyForExerciseName, exportData } from '../js/app.js';

function mockAllRenders() {
  global.buildAllPeriod      = vi.fn();
  global.calcRM              = vi.fn();
  global.renderCustomLifts   = vi.fn();
  global.populateRMLiftSelect = vi.fn();
  global.renderRMHistory     = vi.fn();
  global.renderKanban        = vi.fn();
  global.renderBank          = vi.fn();
  global.setupBankDropzone   = vi.fn();
  global.renderPeriodGrid    = vi.fn();
  global.renderProgressCharts = vi.fn();
  global.renderBuilderSegs   = vi.fn();
  global.renderSavedWorkouts = vi.fn();
  global.renderCycleHistory  = vi.fn();
  global.renderRPEBlocks     = vi.fn();
  global.buildCardioChart    = vi.fn();
}

mockAllRenders();

beforeEach(() => {
  document.getElementById('rm-supino').value = '74';
  document.getElementById('rm-agacha').value = '93';
  document.getElementById('rm-terra').value  = '110';
  document.getElementById('cardioGoal').value      = '300';
  document.getElementById('cardioDailyGoal').value = '43';

  global.board          = [[], [], [], [], [], [], []];
  global.bank           = [];
  global.kgHistory      = {};
  global.cycleHistory   = [];
  global.rmHistory      = [];
  global.cardioExtra    = {};
  global.checksState    = {};
  global.rmTestValues   = {};
  global.savedWorkouts  = [];
  global.rpeBlocks      = [];
  global.customLifts    = [];
  global.cycleStartDates = {};

  mockAllRenders();
});

describe('applyState()', () => {
  test('com null - executa sem lancar excecao e chama todas as funcoes de render', () => {
    const origRenderKanban = global.renderKanban;
    expect(() => applyState(null)).not.toThrow();
    expect(buildAllPeriod).toHaveBeenCalled();
    expect(calcRM).toHaveBeenCalled();
    expect(renderCustomLifts).toHaveBeenCalled();
    expect(populateRMLiftSelect).toHaveBeenCalled();
    expect(renderRMHistory).toHaveBeenCalled();
    expect(origRenderKanban).toHaveBeenCalled();
    expect(renderBank).toHaveBeenCalled();
    expect(setupBankDropzone).toHaveBeenCalled();
    expect(renderPeriodGrid).toHaveBeenCalled();
    expect(renderProgressCharts).toHaveBeenCalled();
    expect(renderBuilderSegs).toHaveBeenCalled();
    expect(renderSavedWorkouts).toHaveBeenCalled();
    expect(renderCycleHistory).toHaveBeenCalled();
    expect(renderRPEBlocks).toHaveBeenCalled();
  });

  test('com estado completo - atualiza os inputs de RM para os valores salvos', () => {
    const saved = { rmSupino: 100, rmAgacha: 120, rmTerra: 140, cardioGoal: 400, cardioDailyGoal: 57 };
    applyState(saved);
    expect(document.getElementById('rm-supino').value).toBe('100');
    expect(document.getElementById('rm-agacha').value).toBe('120');
    expect(document.getElementById('rm-terra').value).toBe('140');
    expect(document.getElementById('cardioGoal').value).toBe('400');
    expect(document.getElementById('cardioDailyGoal').value).toBe('57');
  });

  test('com board de comprimento 7 - substitui o board global', () => {
    const newBoard = [[{ name: 'Supino' }], [], [{ name: 'Agachamento' }], [], [{ name: 'Terra' }], [], []];
    applyState({ board: newBoard });
    expect(board).toBe(newBoard);
    expect(board[0][0].name).toBe('Supino');
  });

  test('com board de comprimento errado (3 elementos) - NAO atualiza o board', () => {
    const originalBoard = global.board;
    applyState({ board: [[], [], []] });
    expect(board).toBe(originalBoard);
  });

  test('com estado parcial - atualiza apenas as chaves presentes', () => {
    const myBank = [{ id: 'x1', name: 'Leg Press' }];
    applyState({ bank: myBank });
    expect(bank).toBe(myBank);
    expect(document.getElementById('rm-supino').value).toBe('74');
    expect(document.getElementById('rm-agacha').value).toBe('93');
  });

  test('com customLifts - atualiza o array global customLifts', () => {
    const lifts = [{ id: 'c1', name: 'Paralelas', rm: 50 }];
    applyState({ customLifts: lifts });
    expect(customLifts).toBe(lifts);
    expect(customLifts[0].name).toBe('Paralelas');
  });

  test('com kgHistory - atualiza o objeto global kgHistory', () => {
    const hist = { supino: [80, 85, 90], agacha: [100] };
    applyState({ kgHistory: hist });
    expect(kgHistory).toBe(hist);
    expect(kgHistory.supino).toEqual([80, 85, 90]);
  });

  test('com checks - atualiza checksState', () => {
    const checks = { 'ex-abc': true, 'ex-def': false };
    applyState({ checks });
    expect(checksState).toBe(checks);
  });

  test('com rmTests - atualiza rmTestValues', () => {
    const tests = { supino: 95 };
    applyState({ rmTests: tests });
    expect(rmTestValues).toBe(tests);
  });

  test('com savedWorkouts - atualiza savedWorkouts', () => {
    const workouts = [{ id: 'w1', name: 'Treino A', segs: [] }];
    applyState({ savedWorkouts: workouts });
    expect(savedWorkouts).toBe(workouts);
  });

  test('com rpeBlocks - atualiza rpeBlocks', () => {
    const blocks = [{ id: 'b1', name: 'Bloco 1', exercises: [] }];
    applyState({ rpeBlocks: blocks });
    expect(rpeBlocks).toBe(blocks);
  });

  test('com cycleStartDates - atualiza cycleStartDates', () => {
    const dates = { supino: '2025-01-01', agacha: '2025-02-01' };
    applyState({ cycleStartDates: dates });
    expect(cycleStartDates).toBe(dates);
  });
});

describe('liftKeyForExerciseName()', () => {
  beforeEach(() => { global.customLifts = []; });

  test('"Supino Reto" -> "supino"', () => {
    expect(liftKeyForExerciseName('Supino Reto')).toBe('supino');
  });
  test('"Supino Inclinado" -> "supino"', () => {
    expect(liftKeyForExerciseName('Supino Inclinado')).toBe('supino');
  });
  test('"Agachamento Livre" -> "agacha"', () => {
    expect(liftKeyForExerciseName('Agachamento Livre')).toBe('agacha');
  });
  test('"squat" -> "agacha"', () => {
    expect(liftKeyForExerciseName('squat')).toBe('agacha');
  });
  test('"agacha" -> "agacha"', () => {
    expect(liftKeyForExerciseName('agacha')).toBe('agacha');
  });
  test('"Terra Convencional" -> "terra"', () => {
    expect(liftKeyForExerciseName('Terra Convencional')).toBe('terra');
  });
  test('"deadlift" -> "terra"', () => {
    expect(liftKeyForExerciseName('deadlift')).toBe('terra');
  });
  test('"Leg Press" -> null (exercicio nao mapeado)', () => {
    expect(liftKeyForExerciseName('Leg Press')).toBeNull();
  });
  test('custom lift "Paralelas" -> "c1"', () => {
    global.customLifts = [{ id: 'c1', name: 'Paralelas', rm: 50 }];
    expect(liftKeyForExerciseName('Paralelas')).toBe('c1');
  });
  test('custom lift: busca case-insensitive', () => {
    global.customLifts = [{ id: 'c2', name: 'Rosca Direta', rm: 40 }];
    expect(liftKeyForExerciseName('rosca direta')).toBe('c2');
  });
  test('string vazia -> null', () => {
    expect(liftKeyForExerciseName('')).toBeNull();
  });
});

describe('exportData()', () => {
  test('nao lanca excecao em ambiente jsdom', () => {
    expect(() => exportData()).not.toThrow();
  });
  test('aciona URL.createObjectURL com um Blob', () => {
    const spy = vi.spyOn(URL, 'createObjectURL');
    exportData();
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toBeInstanceOf(Blob);
    spy.mockRestore();
  });
});
