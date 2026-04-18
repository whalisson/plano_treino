/**
 * TDD — workoutlog.js
 * Ordem: RED (testes falham) → GREEN (implementar) → REFACTOR
 *
 * Cobre funções puras: createWorkoutSession, addSet, removeSet, finishSession,
 * getExerciseHistory, getLastSessionForDay, calcSessionVolume, getPersonalRecord
 * e estado: workoutLog / setWorkoutLog
 */

import {
  workoutLog,
  setWorkoutLog,
  createWorkoutSession,
  addSet,
  removeSet,
  finishSession,
  getExerciseHistory,
  getLastSessionForDay,
  calcSessionVolume,
  getPersonalRecord,
} from '../js/workoutlog.js';

// ── fixtures ─────────────────────────────────────────────────────────────────

const BOARD_STUB = [
  // Segunda (dayIdx 0)
  [
    { id: 'bi-1', srcId: 'ex-1', name: 'Supino Reto',   group: 'push', kg: 80,  reps: '3x8' },
    { id: 'bi-2', srcId: 'ex-2', name: 'Voador Peitoral', group: 'push', kg: 60,  reps: '3x12' },
  ],
  // Terça (dayIdx 1)
  [
    { id: 'bi-3', srcId: 'ex-3', name: 'Agachamento Livre', group: 'legs', kg: 100, reps: '4x5' },
  ],
  [], [], [], [], [], // Quarta-Domingo (vazios)
];

const DATE_STR = '18/04/2026';

// ─────────────────────────────────────────────────────────────────────────────
// workoutLog — estado
// ─────────────────────────────────────────────────────────────────────────────

describe('workoutLog — estado', () => {
  beforeEach(() => { setWorkoutLog([]); });

  test('workoutLog começa como array vazio', () => {
    expect(Array.isArray(workoutLog)).toBe(true);
  });

  test('setWorkoutLog substitui o array', () => {
    const novo = [{ id: 'abc' }];
    setWorkoutLog(novo);
    expect(workoutLog).toBe(novo);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// createWorkoutSession(board, dayIdx, dateStr)
// ─────────────────────────────────────────────────────────────────────────────

describe('createWorkoutSession()', () => {
  test('retorna objeto com id, date, dayIdx, dayLabel, startedAt, finishedAt', () => {
    const s = createWorkoutSession(BOARD_STUB, 0, DATE_STR);
    expect(s.id).toBeDefined();
    expect(s.date).toBe(DATE_STR);
    expect(s.dayIdx).toBe(0);
    expect(s.dayLabel).toBe('Segunda');
    expect(typeof s.startedAt).toBe('number');
    expect(s.finishedAt).toBeNull();
  });

  test('exercises copiados do board[dayIdx]', () => {
    const s = createWorkoutSession(BOARD_STUB, 0, DATE_STR);
    expect(s.exercises).toHaveLength(2);
    expect(s.exercises[0].name).toBe('Supino Reto');
    expect(s.exercises[1].name).toBe('Voador Peitoral');
  });

  test('cada exercise tem srcId, group, plannedKg, plannedReps e sets vazio', () => {
    const s = createWorkoutSession(BOARD_STUB, 0, DATE_STR);
    const ex = s.exercises[0];
    expect(ex.srcId).toBe('ex-1');
    expect(ex.group).toBe('push');
    expect(ex.plannedKg).toBe(80);
    expect(ex.plannedReps).toBe('3x8');
    expect(ex.sets).toEqual([]);
  });

  test('nao muta o board original', () => {
    const boardCopy = JSON.parse(JSON.stringify(BOARD_STUB));
    createWorkoutSession(BOARD_STUB, 0, DATE_STR);
    expect(BOARD_STUB[0]).toEqual(boardCopy[0]);
  });

  test('dia vazio gera sessao com exercises vazio', () => {
    const s = createWorkoutSession(BOARD_STUB, 2, DATE_STR);
    expect(s.exercises).toHaveLength(0);
    expect(s.dayLabel).toBe('Quarta');
  });

  test('cada chamada gera um id diferente', () => {
    const s1 = createWorkoutSession(BOARD_STUB, 0, DATE_STR);
    const s2 = createWorkoutSession(BOARD_STUB, 0, DATE_STR);
    expect(s1.id).not.toBe(s2.id);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// addSet(session, exerciseName, { reps, kg })
// ─────────────────────────────────────────────────────────────────────────────

describe('addSet()', () => {
  let session;
  beforeEach(() => {
    session = createWorkoutSession(BOARD_STUB, 0, DATE_STR);
  });

  test('retorna nova sessao com set adicionado ao exercicio correto', () => {
    const updated = addSet(session, 'Supino Reto', { reps: 8, kg: 80 });
    expect(updated.exercises[0].sets).toHaveLength(1);
    expect(updated.exercises[0].sets[0].reps).toBe(8);
    expect(updated.exercises[0].sets[0].kg).toBe(80);
  });

  test('set tem campo completedAt (timestamp number)', () => {
    const updated = addSet(session, 'Supino Reto', { reps: 8, kg: 80 });
    expect(typeof updated.exercises[0].sets[0].completedAt).toBe('number');
  });

  test('multiplos sets se acumulam', () => {
    let s = addSet(session, 'Supino Reto', { reps: 8, kg: 80 });
    s = addSet(s, 'Supino Reto', { reps: 8, kg: 82.5 });
    s = addSet(s, 'Supino Reto', { reps: 6, kg: 85 });
    expect(s.exercises[0].sets).toHaveLength(3);
  });

  test('adicionar em exercicio diferente nao afeta o primeiro', () => {
    let s = addSet(session, 'Supino Reto',     { reps: 8, kg: 80 });
    s     = addSet(s,       'Voador Peitoral', { reps: 12, kg: 60 });
    expect(s.exercises[0].sets).toHaveLength(1);
    expect(s.exercises[1].sets).toHaveLength(1);
  });

  test('nao muta a sessao original', () => {
    const orig = JSON.parse(JSON.stringify(session));
    addSet(session, 'Supino Reto', { reps: 8, kg: 80 });
    expect(session.exercises[0].sets).toHaveLength(0);
    expect(session).toEqual(orig);
  });

  test('lanca erro se exercicio nao existe na sessao', () => {
    expect(() => addSet(session, 'Leg Press', { reps: 10, kg: 100 })).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// removeSet(session, exerciseName, setIdx)
// ─────────────────────────────────────────────────────────────────────────────

describe('removeSet()', () => {
  let session;
  beforeEach(() => {
    session = createWorkoutSession(BOARD_STUB, 0, DATE_STR);
    session = addSet(session, 'Supino Reto', { reps: 8, kg: 80 });
    session = addSet(session, 'Supino Reto', { reps: 8, kg: 82.5 });
    session = addSet(session, 'Supino Reto', { reps: 6, kg: 85 });
  });

  test('remove o set pelo indice', () => {
    const updated = removeSet(session, 'Supino Reto', 1);
    expect(updated.exercises[0].sets).toHaveLength(2);
    expect(updated.exercises[0].sets[0].kg).toBe(80);
    expect(updated.exercises[0].sets[1].kg).toBe(85);
  });

  test('nao muta a sessao original', () => {
    removeSet(session, 'Supino Reto', 0);
    expect(session.exercises[0].sets).toHaveLength(3);
  });

  test('lanca erro se setIdx fora do intervalo', () => {
    expect(() => removeSet(session, 'Supino Reto', 99)).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// finishSession(session)
// ─────────────────────────────────────────────────────────────────────────────

describe('finishSession()', () => {
  test('retorna sessao com finishedAt preenchido', () => {
    const s = createWorkoutSession(BOARD_STUB, 0, DATE_STR);
    const finished = finishSession(s);
    expect(typeof finished.finishedAt).toBe('number');
    expect(finished.finishedAt).toBeGreaterThan(0);
  });

  test('finishedAt >= startedAt', () => {
    const s = createWorkoutSession(BOARD_STUB, 0, DATE_STR);
    const finished = finishSession(s);
    expect(finished.finishedAt).toBeGreaterThanOrEqual(s.startedAt);
  });

  test('nao muta a sessao original', () => {
    const s = createWorkoutSession(BOARD_STUB, 0, DATE_STR);
    finishSession(s);
    expect(s.finishedAt).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcSessionVolume(session)
// ─────────────────────────────────────────────────────────────────────────────

describe('calcSessionVolume()', () => {
  test('volume zerado para sessao sem sets', () => {
    const s = createWorkoutSession(BOARD_STUB, 0, DATE_STR);
    expect(calcSessionVolume(s)).toBe(0);
  });

  test('volume = soma de (kg * reps) em todos os sets de todos os exercicios', () => {
    let s = createWorkoutSession(BOARD_STUB, 0, DATE_STR);
    s = addSet(s, 'Supino Reto',     { reps: 8, kg: 80  }); // 640
    s = addSet(s, 'Supino Reto',     { reps: 8, kg: 80  }); // 640
    s = addSet(s, 'Voador Peitoral', { reps: 12, kg: 60 }); // 720
    expect(calcSessionVolume(s)).toBe(2000);
  });

  test('volume arredondado para 2 casas decimais', () => {
    let s = createWorkoutSession(BOARD_STUB, 0, DATE_STR);
    s = addSet(s, 'Supino Reto', { reps: 8, kg: 82.5 }); // 660
    expect(calcSessionVolume(s)).toBe(660);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getExerciseHistory(workoutLog, exerciseName)
// ─────────────────────────────────────────────────────────────────────────────

describe('getExerciseHistory()', () => {
  let log;
  beforeEach(() => {
    let s1 = createWorkoutSession(BOARD_STUB, 0, '11/04/2026');
    s1 = addSet(s1, 'Supino Reto', { reps: 8, kg: 75 });
    s1 = addSet(s1, 'Supino Reto', { reps: 8, kg: 77.5 });
    s1 = finishSession(s1);

    let s2 = createWorkoutSession(BOARD_STUB, 0, '18/04/2026');
    s2 = addSet(s2, 'Supino Reto', { reps: 8, kg: 80 });
    s2 = addSet(s2, 'Supino Reto', { reps: 6, kg: 82.5 });
    s2 = finishSession(s2);

    log = [s1, s2];
  });

  test('retorna array com uma entrada por sessao que tem o exercicio', () => {
    const hist = getExerciseHistory(log, 'Supino Reto');
    expect(hist).toHaveLength(2);
  });

  test('cada entrada tem: date, dayLabel, sets', () => {
    const hist = getExerciseHistory(log, 'Supino Reto');
    expect(hist[0].date).toBe('11/04/2026');
    expect(hist[0].dayLabel).toBe('Segunda');
    expect(hist[0].sets).toHaveLength(2);
  });

  test('retorna vazio para exercicio inexistente no log', () => {
    const hist = getExerciseHistory(log, 'Leg Press');
    expect(hist).toHaveLength(0);
  });

  test('ignora sessoes nao finalizadas (finishedAt null)', () => {
    let sInProgress = createWorkoutSession(BOARD_STUB, 0, '25/04/2026');
    sInProgress = addSet(sInProgress, 'Supino Reto', { reps: 8, kg: 85 });
    const logWithActive = [...log, sInProgress];
    const hist = getExerciseHistory(logWithActive, 'Supino Reto');
    expect(hist).toHaveLength(2); // nao inclui a sessao em andamento
  });

  test('entradas ordenadas da mais antiga para a mais recente (por startedAt)', () => {
    const hist = getExerciseHistory(log, 'Supino Reto');
    expect(hist[0].date).toBe('11/04/2026');
    expect(hist[1].date).toBe('18/04/2026');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getLastSessionForDay(workoutLog, dayIdx)
// ─────────────────────────────────────────────────────────────────────────────

describe('getLastSessionForDay()', () => {
  test('retorna null se nao ha sessoes para o dia', () => {
    const result = getLastSessionForDay([], 0);
    expect(result).toBeNull();
  });

  test('retorna a sessao mais recente para o dayIdx', () => {
    let s1 = finishSession(createWorkoutSession(BOARD_STUB, 0, '11/04/2026'));
    let s2 = finishSession(createWorkoutSession(BOARD_STUB, 0, '18/04/2026'));
    const result = getLastSessionForDay([s1, s2], 0);
    expect(result.date).toBe('18/04/2026');
  });

  test('ignora dias diferentes', () => {
    let s0 = finishSession(createWorkoutSession(BOARD_STUB, 0, '18/04/2026'));
    let s1 = finishSession(createWorkoutSession(BOARD_STUB, 1, '19/04/2026'));
    expect(getLastSessionForDay([s0, s1], 0).date).toBe('18/04/2026');
    expect(getLastSessionForDay([s0, s1], 1).date).toBe('19/04/2026');
  });

  test('inclui sessoes em andamento (finishedAt null)', () => {
    const sActive = createWorkoutSession(BOARD_STUB, 0, '18/04/2026');
    expect(getLastSessionForDay([sActive], 0)).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getPersonalRecord(workoutLog, exerciseName)
// ─────────────────────────────────────────────────────────────────────────────

describe('getPersonalRecord()', () => {
  test('retorna null se nao ha historico', () => {
    expect(getPersonalRecord([], 'Supino Reto')).toBeNull();
  });

  test('retorna o set com maior kg', () => {
    let s = createWorkoutSession(BOARD_STUB, 0, DATE_STR);
    s = addSet(s, 'Supino Reto', { reps: 8, kg: 80 });
    s = addSet(s, 'Supino Reto', { reps: 5, kg: 90 });
    s = addSet(s, 'Supino Reto', { reps: 3, kg: 95 });
    s = finishSession(s);

    const pr = getPersonalRecord([s], 'Supino Reto');
    expect(pr.kg).toBe(95);
    expect(pr.reps).toBe(3);
    expect(pr.date).toBe(DATE_STR);
  });

  test('compara atraves de multiplas sessoes', () => {
    let s1 = addSet(createWorkoutSession(BOARD_STUB, 0, '11/04/2026'), 'Supino Reto', { reps: 8, kg: 80 });
    s1 = finishSession(s1);
    let s2 = addSet(createWorkoutSession(BOARD_STUB, 0, '18/04/2026'), 'Supino Reto', { reps: 5, kg: 100 });
    s2 = finishSession(s2);

    const pr = getPersonalRecord([s1, s2], 'Supino Reto');
    expect(pr.kg).toBe(100);
    expect(pr.date).toBe('18/04/2026');
  });

  test('ignora sessoes nao finalizadas', () => {
    let s1 = addSet(createWorkoutSession(BOARD_STUB, 0, '11/04/2026'), 'Supino Reto', { reps: 8, kg: 80 });
    s1 = finishSession(s1);
    let sActive = addSet(createWorkoutSession(BOARD_STUB, 0, DATE_STR), 'Supino Reto', { reps: 1, kg: 200 });
    // sActive nao finalizado

    const pr = getPersonalRecord([s1, sActive], 'Supino Reto');
    expect(pr.kg).toBe(80);
  });

  test('retorna null se exercicio nao existe no log', () => {
    let s = finishSession(createWorkoutSession(BOARD_STUB, 0, DATE_STR));
    expect(getPersonalRecord([s], 'Exercicio Inexistente')).toBeNull();
  });
});
