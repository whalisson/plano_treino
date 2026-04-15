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
