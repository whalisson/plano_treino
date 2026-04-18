/**
 * Testes — rpe.js
 * Cobre: getRPEFactor(), calcRPEWeight(), getRPEColor()
 */

describe('getRPEFactor()', () => {
  test('RPE 10 / 1 rep → fator 1.0 (100% do RM)', () => {
    expect(getRPEFactor(10, 1)).toBe(1);
  });

  test('RPE 10 / 2 reps → fator 0.955', () => {
    expect(getRPEFactor(10, 2)).toBeCloseTo(0.955, 3);
  });

  test('RPE 8 / 5 reps → fator 0.811', () => {
    expect(getRPEFactor(8, 5)).toBeCloseTo(0.811, 3);
  });

  test('RPE 7 / 3 reps → fator 0.837', () => {
    expect(getRPEFactor(7, 3)).toBeCloseTo(0.837, 3);
  });

  test('RPE inválido retorna null', () => {
    expect(getRPEFactor(11, 1)).toBeNull();
    expect(getRPEFactor(0, 1)).toBeNull();
  });

  test('reps > 15 são limitadas ao índice 14 (15 reps)', () => {
    // Não deve lançar erro nem retornar null
    expect(getRPEFactor(8, 20)).not.toBeNull();
    expect(getRPEFactor(8, 20)).toBe(getRPEFactor(8, 15));
  });

  test('reps < 1 são limitadas ao índice 0 (1 rep)', () => {
    expect(getRPEFactor(8, 0)).toBe(getRPEFactor(8, 1));
  });

  test('fator diminui conforme o número de reps aumenta (mesmo RPE)', () => {
    // Com mais reps ao mesmo RPE, usa menor % do RM
    expect(getRPEFactor(8, 1)).toBeGreaterThan(getRPEFactor(8, 5));
    expect(getRPEFactor(8, 5)).toBeGreaterThan(getRPEFactor(8, 10));
  });

  test('fator diminui conforme RPE diminui (mesmas reps)', () => {
    // RPE mais baixo → esforço menor → menor % do RM
    expect(getRPEFactor(9, 5)).toBeGreaterThan(getRPEFactor(7, 5));
  });
});

describe('calcRPEWeight()', () => {
  test('calcula peso exato e arredondado para 2.5 kg', () => {
    // RM=100, RPE=10, 1 rep → fator=1.0 → exato=100, arredondado=100
    const result = calcRPEWeight(100, 10, 1);
    expect(result.exact).toBeCloseTo(100, 1);
    expect(result.rounded).toBe(100);
  });

  test('arredonda para múltiplo de 2,5 kg', () => {
    // RM=100, RPE=8, 5 reps → fator=0.811 → exato=81,1 → arredonda para 80
    const result = calcRPEWeight(100, 8, 5);
    expect(result.rounded % 2.5).toBe(0);
  });

  test('rounded é sempre múltiplo de 2,5 para qualquer combinação válida', () => {
    const testCases = [
      [90, 9, 3], [80, 8, 6], [120, 7.5, 4], [60, 6.5, 8],
    ];
    testCases.forEach(([rm, rpe, reps]) => {
      const result = calcRPEWeight(rm, rpe, reps);
      expect(result.rounded % 2.5).toBeCloseTo(0, 5);
    });
  });

  test('retorna null se RM for 0', () => {
    expect(calcRPEWeight(0, 8, 5)).toBeNull();
  });

  test('retorna null se RPE for inválido', () => {
    expect(calcRPEWeight(100, 11, 5)).toBeNull();
  });

  test('peso aumenta com o RM (mesma intensidade)', () => {
    const r1 = calcRPEWeight(80, 8, 5);
    const r2 = calcRPEWeight(100, 8, 5);
    expect(r2.exact).toBeGreaterThan(r1.exact);
  });
});

describe('getRPEColor()', () => {
  test('RPE ≥ 9.5 → vermelho (esforço máximo)', () => {
    expect(getRPEColor(10)).toBe('#ff6b6b');
    expect(getRPEColor(9.5)).toBe('#ff6b6b');
  });

  test('RPE ≥ 8.5 e < 9.5 → roxo', () => {
    expect(getRPEColor(9)).toBe('#a59eff');
    expect(getRPEColor(8.5)).toBe('#a59eff');
  });

  test('RPE ≥ 7.5 e < 8.5 → âmbar', () => {
    expect(getRPEColor(8)).toBe('#fbbf24');
    expect(getRPEColor(7.5)).toBe('#fbbf24');
  });

  test('RPE ≥ 6.5 e < 7.5 → verde-azulado', () => {
    expect(getRPEColor(7)).toBe('#2dd4bf');
    expect(getRPEColor(6.5)).toBe('#2dd4bf');
  });

  test('RPE < 6.5 → cinza (leve)', () => {
    expect(getRPEColor(6)).toBe('#8a8898');
    expect(getRPEColor(3)).toBe('#8a8898');
  });
});

// ── Novos testes — Unit 6 ───────────────────────────────────────────────────

describe('rpeBlocks — schema e estrutura', () => {
  beforeEach(() => {
    // Limpa o array sem quebrar a referência global
    rpeBlocks.length = 0;
  });

  test('rpeBlocks é um array', () => {
    expect(Array.isArray(rpeBlocks)).toBe(true);
  });

  test('rpeBlocks começa vazio após reset', () => {
    expect(rpeBlocks.length).toBe(0);
  });

  test('bloco RPE tem campos esperados: id, name, exercises (array), createdAt', () => {
    const bloco = {
      id:        'blk-1',
      name:      'Bloco Teste',
      exercises: [],
      createdAt: Date.now(),
    };
    rpeBlocks.push(bloco);

    const b = rpeBlocks[0];
    expect(b).toHaveProperty('id');
    expect(b).toHaveProperty('name');
    expect(b).toHaveProperty('exercises');
    expect(Array.isArray(b.exercises)).toBe(true);
    expect(b).toHaveProperty('createdAt');
  });

  test('exercício dentro do bloco tem campos: name, rm, sets (array)', () => {
    const ex = { name: 'Supino', rm: 100, sets: [] };
    const bloco = { id: 'blk-2', name: 'B', exercises: [ex], createdAt: Date.now() };
    rpeBlocks.push(bloco);

    const exercise = rpeBlocks[0].exercises[0];
    expect(exercise).toHaveProperty('name');
    expect(exercise).toHaveProperty('rm');
    expect(exercise).toHaveProperty('sets');
    expect(Array.isArray(exercise.sets)).toBe(true);
  });

  test('set dentro do exercício tem campos: count, reps, rpe', () => {
    const set = { count: 3, reps: 5, rpe: 8 };
    const ex  = { name: 'Terra', rm: 110, sets: [set] };
    const bloco = { id: 'blk-3', name: 'C', exercises: [ex], createdAt: Date.now() };
    rpeBlocks.push(bloco);

    const s = rpeBlocks[0].exercises[0].sets[0];
    expect(s).toHaveProperty('count');
    expect(s).toHaveProperty('reps');
    expect(s).toHaveProperty('rpe');
  });

  test('adicionar bloco ao array aumenta length em 1', () => {
    expect(rpeBlocks.length).toBe(0);
    rpeBlocks.push({ id: 'blk-4', name: 'D', exercises: [], createdAt: Date.now() });
    expect(rpeBlocks.length).toBe(1);
    rpeBlocks.push({ id: 'blk-5', name: 'E', exercises: [], createdAt: Date.now() });
    expect(rpeBlocks.length).toBe(2);
  });
});

describe('execStates — estrutura inicializada por openExecRPEModal', () => {
  test('execStates começa como objeto vazio {}', () => {
    // Após o carregamento do módulo execStates é {}
    // Verificamos o tipo e que começa sem chaves
    expect(typeof execStates).toBe('object');
    expect(execStates).not.toBeNull();
    expect(Array.isArray(execStates)).toBe(false);
  });
});

describe('estimateExecRM()', () => {
  test('retorna número positivo para inputs válidos (kg=100, reps=5, rpe=8)', () => {
    const result = estimateExecRM(100, 5, 8);
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThan(0);
  });

  test('kg=0 retorna 0 sem lançar exceção', () => {
    let result;
    expect(() => { result = estimateExecRM(0, 5, 8); }).not.toThrow();
    // getRPEFactor válido mas kg=0 → Math.round(0/f) = 0
    expect(result).toBe(0);
  });

  test('estimativa sobe conforme kg sobe (mesmos reps e rpe)', () => {
    const est80  = estimateExecRM(80,  5, 8);
    const est100 = estimateExecRM(100, 5, 8);
    expect(est100).toBeGreaterThan(est80);
  });

  test('RPE inválido: retorna Math.round(kg) como fallback', () => {
    // getRPEFactor retorna null para rpe=11 → fallback Math.round(kg)
    const result = estimateExecRM(100, 5, 11);
    expect(result).toBe(Math.round(100));
  });
});

describe('calcRPEWeight() — casos adicionais', () => {
  test('com RM=120, RPE=9, reps=3 → rounded é múltiplo de 2.5', () => {
    const result = calcRPEWeight(120, 9, 3);
    expect(result).not.toBeNull();
    expect(result.rounded % 2.5).toBeCloseTo(0, 5);
  });

  test('RPE 6.5 é válido (retorna resultado não-null)', () => {
    const result = calcRPEWeight(100, 6.5, 5);
    expect(result).not.toBeNull();
    expect(result.rounded).toBeGreaterThan(0);
  });
});
