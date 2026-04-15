/**
 * Testes — periodizacao.js
 * Cobre: estrutura de periodBase, LIFT_LABELS, hexToRgb(), getCustomColor(),
 *        parseCycleDate() e regras da tabela de periodização.
 */

describe('periodBase — estrutura da tabela de periodização', () => {
  test('contém exatamente 12 semanas', () => {
    expect(periodBase).toHaveLength(12);
  });

  test('cada semana tem uma propriedade "label"', () => {
    periodBase.forEach((week, i) => {
      expect(week.label).toBeDefined();
      expect(week.label).toContain(`Semana ${i + 1}`);
    });
  });

  test('semana 5 é deload', () => {
    expect(periodBase[4].deload).toBe(true);
  });

  test('semana 10 é descanso total', () => {
    expect(periodBase[9].rest).toBe(true);
  });

  test('semana 11 inclui nota de "Teste Novo RM"', () => {
    expect(periodBase[10].note).toMatch(/Teste.*RM/i);
  });

  test('semanas com séries têm pelo menos uma série', () => {
    periodBase.forEach(week => {
      if (!week.rest && !week.byLift) {
        expect(week.series).toBeDefined();
        expect(week.series.length).toBeGreaterThan(0);
      }
    });
  });

  test('cada série tem propriedades "r" (reps) e "p" (percentual)', () => {
    periodBase.forEach(week => {
      if (week.series) {
        week.series.forEach(serie => {
          expect(serie.r).toBeDefined();
          expect(typeof serie.p).toBe('number');
          expect(serie.p).toBeGreaterThan(0);
          expect(serie.p).toBeLessThanOrEqual(1.1); // máx 105% nas semanas de RM
        });
      }
    });
  });
});

describe('LIFT_LABELS', () => {
  test('contém os 3 lifts principais', () => {
    expect(LIFT_LABELS.supino).toBe('Supino');
    expect(LIFT_LABELS.agacha).toBe('Agachamento');
    expect(LIFT_LABELS.terra).toBe('Terra');
  });
});

describe('hexToRgb()', () => {
  test('converte #6c63ff corretamente', () => {
    expect(hexToRgb('#6c63ff')).toBe('108,99,255');
  });

  test('converte #ffffff → 255,255,255', () => {
    expect(hexToRgb('#ffffff')).toBe('255,255,255');
  });

  test('converte #000000 → 0,0,0', () => {
    expect(hexToRgb('#000000')).toBe('0,0,0');
  });
});

describe('getCustomColor()', () => {
  test('retorna uma cor da paleta para índice 0', () => {
    const color = getCustomColor(0);
    expect(CUSTOM_LIFT_PALETTE).toContain(color);
  });

  test('retorna cores diferentes para índices diferentes', () => {
    const c0 = getCustomColor(0);
    const c1 = getCustomColor(1);
    expect(c0).not.toBe(c1);
  });

  test('rotaciona a paleta com índices maiores que o tamanho', () => {
    const len = CUSTOM_LIFT_PALETTE.length;
    expect(getCustomColor(len)).toBe(getCustomColor(0));
    expect(getCustomColor(len + 1)).toBe(getCustomColor(1));
  });
});

describe('parseCycleDate()', () => {
  test('converte "dd/mm/aaaa" em Date correta', () => {
    const d = parseCycleDate('01/06/2024');
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(1);
  });

  test('datas são ordenáveis', () => {
    const d1 = parseCycleDate('01/01/2023');
    const d2 = parseCycleDate('01/01/2024');
    expect(d2 - d1).toBeGreaterThan(0);
  });
});
