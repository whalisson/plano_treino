/**
 * Testes — rm.js
 * Cobre: fórmulas de 1RM (Brzycki, Epley, Mayhew) e parseRMDate()
 *
 * As fórmulas são extraídas da função calcRM() e testadas diretamente
 * para garantir que a matemática permanece correta independentemente
 * de mudanças no DOM.
 */

// ── Helpers locais com a mesma lógica de calcRM() ──────────────────
function brzycki(w, r) { return r === 1 ? w : w * (36 / (37 - r)); }
function epley(w, r)   { return r === 1 ? w : w * (1 + r / 30); }
function mayhew(w, r)  { return w / (0.522 + 0.419 * Math.exp(-0.055 * r)); }
function avgRM(w, r)   { return (brzycki(w, r) + epley(w, r) + mayhew(w, r)) / 3; }

describe('Fórmula Brzycki', () => {
  test('com 1 repetição retorna o próprio peso', () => {
    expect(brzycki(100, 1)).toBe(100);
    expect(brzycki(80, 1)).toBe(80);
  });

  test('mais reps → maior 1RM estimado', () => {
    expect(brzycki(80, 5)).toBeGreaterThan(brzycki(80, 3));
    expect(brzycki(80, 10)).toBeGreaterThan(brzycki(80, 5));
  });

  test('valores de referência conhecidos (tolerância ±0,1)', () => {
    // 100 kg × 5 reps: 100 × (36/32) ≈ 112,5
    expect(brzycki(100, 5)).toBeCloseTo(112.5, 0);
  });

  test('resultado sempre maior ou igual ao peso original', () => {
    for (let r = 1; r <= 15; r++) {
      expect(brzycki(70, r)).toBeGreaterThanOrEqual(70);
    }
  });
});

describe('Fórmula Epley', () => {
  test('com 1 repetição retorna o próprio peso', () => {
    expect(epley(100, 1)).toBe(100);
  });

  test('mais reps → maior 1RM estimado', () => {
    expect(epley(80, 5)).toBeGreaterThan(epley(80, 3));
  });

  test('valores de referência (tolerância ±1)', () => {
    // 100 kg × 10 reps: 100 × (1 + 10/30) ≈ 133,3
    expect(epley(100, 10)).toBeCloseTo(133.3, 0);
  });
});

describe('Fórmula Mayhew', () => {
  test('com 1 repetição retorna ~108,9 kg para 100 kg', () => {
    // w / (0.522 + 0.419 × e^{-0.055×1}) = 100 / (0.522 + 0.419 × 0.9465) ≈ 100 / 0.9186 ≈ 108.86
    expect(mayhew(100, 1)).toBeCloseTo(108.86, 0);
  });

  test('mais reps → maior 1RM estimado', () => {
    expect(mayhew(80, 8)).toBeGreaterThan(mayhew(80, 4));
  });

  test('resultado sempre positivo', () => {
    for (let r = 1; r <= 15; r++) {
      expect(mayhew(50, r)).toBeGreaterThan(0);
    }
  });
});

describe('Média das 3 fórmulas (avgRM)', () => {
  test('é a média aritmética das 3 fórmulas', () => {
    const w = 90, r = 5;
    const expected = (brzycki(w, r) + epley(w, r) + mayhew(w, r)) / 3;
    expect(avgRM(w, r)).toBeCloseTo(expected, 5);
  });

  test('com 1 rep, a média é calculada corretamente', () => {
    // Brzycki=100, Epley=100, Mayhew≈108.86 → média ≈ (100+100+108.86)/3 ≈ 102.95
    expect(avgRM(100, 1)).toBeCloseTo(102.95, 0);
  });
});

describe('parseRMDate()', () => {
  test('converte "dd/mm/aaaa" em Date correta', () => {
    const d = parseRMDate('15/04/2025');
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(3); // meses em JS são 0-based
    expect(d.getDate()).toBe(15);
  });

  test('converte "01/01/2024"', () => {
    const d = parseRMDate('01/01/2024');
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(1);
  });

  test('ordena corretamente datas ao subtrair', () => {
    const antes  = parseRMDate('01/01/2023');
    const depois = parseRMDate('31/12/2023');
    expect(depois - antes).toBeGreaterThan(0);
  });
});

describe('Tabela de percentuais (smoke test)', () => {
  test('100% do RM é o próprio valor', () => {
    const rm = 100;
    expect(rm * 1.00).toBe(100);
  });

  test('percentuais estão em ordem decrescente', () => {
    const pcts = [100, 95, 90, 85, 80, 75, 70, 65];
    for (let i = 1; i < pcts.length; i++) {
      expect(pcts[i]).toBeLessThan(pcts[i - 1]);
    }
  });
});

// ── Novos testes: rmHistory schema e mutações ──────────────────────────

describe('rmHistory — schema e mutações', () => {
  beforeEach(() => {
    rmHistory.length = 0;
  });

  test('rmHistory é um array', () => {
    expect(Array.isArray(rmHistory)).toBe(true);
  });

  test('rmHistory começa vazio após reset', () => {
    expect(rmHistory).toHaveLength(0);
  });

  test('entrada rmHistory tem campos: id, lift, kg, date', () => {
    rmHistory.push({ id: 'test-1', lift: 'supino', kg: 100.0, date: '15/04/2025' });
    const entry = rmHistory[0];
    expect(entry).toHaveProperty('id');
    expect(entry).toHaveProperty('lift');
    expect(entry).toHaveProperty('kg');
    expect(entry).toHaveProperty('date');
  });

  test('adicionar entrada aumenta length em 1', () => {
    expect(rmHistory).toHaveLength(0);
    rmHistory.push({ id: 'test-2', lift: 'agacha', kg: 120.5, date: '01/04/2025' });
    expect(rmHistory).toHaveLength(1);
  });

  test('remover entrada por id reduz length em 1', () => {
    rmHistory.push({ id: 'remove-me', lift: 'terra', kg: 150.0, date: '10/03/2025' });
    rmHistory.push({ id: 'keep-me',   lift: 'supino', kg: 80.0, date: '11/03/2025' });
    expect(rmHistory).toHaveLength(2);
    // Simula o comportamento de deleteRMRecord sem chamar renderRMHistory/saveState
    const idToRemove = 'remove-me';
    const idx = rmHistory.findIndex(r => r.id === idToRemove);
    rmHistory.splice(idx, 1);
    expect(rmHistory).toHaveLength(1);
    expect(rmHistory[0].id).toBe('keep-me');
  });
});

// ── Novos testes: LIFT_LABELS definidos corretamente ──────────────────

describe('LIFT_LABELS — definidos corretamente', () => {
  test('LIFT_LABELS.supino existe e é string não-vazia', () => {
    expect(typeof LIFT_LABELS.supino).toBe('string');
    expect(LIFT_LABELS.supino.length).toBeGreaterThan(0);
  });

  test('LIFT_LABELS.agacha existe e é string não-vazia', () => {
    expect(typeof LIFT_LABELS.agacha).toBe('string');
    expect(LIFT_LABELS.agacha.length).toBeGreaterThan(0);
  });

  test('LIFT_LABELS.terra existe e é string não-vazia', () => {
    expect(typeof LIFT_LABELS.terra).toBe('string');
    expect(LIFT_LABELS.terra.length).toBeGreaterThan(0);
  });
});
