/**
 * Testes — state.js
 * Cobre: uid(), round05(), parseSetCount(), getWeekRange()
 */

describe('uid()', () => {
  test('retorna uma string não vazia', () => {
    expect(typeof uid()).toBe('string');
    expect(uid().length).toBeGreaterThan(0);
  });

  test('gera valores únicos a cada chamada', () => {
    const ids = new Set(Array.from({ length: 200 }, () => uid()));
    expect(ids.size).toBe(200);
  });
});

describe('round05()', () => {
  test('arredonda para o 0,5 mais próximo — para baixo', () => {
    expect(round05(0.2)).toBe(0);
    expect(round05(1.1)).toBe(1);
    expect(round05(4.2)).toBe(4);
  });

  test('arredonda para o 0,5 mais próximo — para cima', () => {
    expect(round05(0.3)).toBe(0.5);
    expect(round05(1.4)).toBe(1.5);
    expect(round05(99.8)).toBe(100);  // 99.8 × 2 = 199.6 → arredonda 200 → 100
  });

  test('não altera valores já múltiplos de 0,5', () => {
    expect(round05(0)).toBe(0);
    expect(round05(0.5)).toBe(0.5);
    expect(round05(10)).toBe(10);
    expect(round05(10.5)).toBe(10.5);
  });

  test('calcula corretamente valores comuns de treino', () => {
    expect(round05(82.3)).toBe(82.5);   // 82.3 × 2 = 164.6 → 165 → 82.5
    expect(round05(107.8)).toBe(108);   // 107.8 × 2 = 215.6 → 216 → 108
    expect(round05(74.25)).toBe(74.5);  // 74.25 × 2 = 148.5 → 149 → 74.5
  });
});

describe('parseSetCount()', () => {
  test('extrai o número de séries do formato "NxM"', () => {
    expect(parseSetCount('3x10')).toBe(3);
    expect(parseSetCount('5x5')).toBe(5);
    expect(parseSetCount('6x4')).toBe(6);
    expect(parseSetCount('1x1')).toBe(1);
  });

  test('retorna 1 para formatos que não são "NxM"', () => {
    expect(parseSetCount('8 reps')).toBe(1);
    expect(parseSetCount('1 rep')).toBe(1);
    expect(parseSetCount('')).toBe(1);
    expect(parseSetCount('abc')).toBe(1);
  });

  test('retorna 1 para string numérica sem "x"', () => {
    // A função espera strings como "3x10". Para outros inputs a função retorna 1.
    expect(parseSetCount('10')).toBe(1);
    expect(parseSetCount('3 séries')).toBe(1);
  });
});

describe('getWeekRange()', () => {
  test('retorna um objeto com start (segunda) e end (domingo)', () => {
    const { start, end } = getWeekRange();
    expect(start).toBeInstanceOf(Date);
    expect(end).toBeInstanceOf(Date);
  });

  test('start é sempre segunda-feira (getDay() === 1)', () => {
    const { start } = getWeekRange();
    expect(start.getDay()).toBe(1);
  });

  test('end é sempre domingo (getDay() === 0)', () => {
    const { end } = getWeekRange();
    expect(end.getDay()).toBe(0);
  });

  test('a semana tem exatamente 7 dias', () => {
    const { start, end } = getWeekRange();
    const diffMs   = end.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(6);
  });

  test('start é meia-noite (horário zerrado)', () => {
    const { start } = getWeekRange();
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(start.getMilliseconds()).toBe(0);
  });
});
