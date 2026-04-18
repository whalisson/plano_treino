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

// ── Novos blocos de regressão ──────────────────────────────────────────────

describe('checksState — mutações', () => {
  beforeEach(() => {
    checksState.supino = {};
    checksState.agacha = {};
    checksState.terra  = {};
  });

  test('checksState tem os 3 lifts principais como chaves', () => {
    expect(checksState).toHaveProperty('supino');
    expect(checksState).toHaveProperty('agacha');
    expect(checksState).toHaveProperty('terra');
  });

  test('pode marcar checksState[lift][weekIdx][cbKey] = true', () => {
    checksState.supino[0] = {};
    checksState.supino[0]['cb-0'] = true;
    expect(checksState.supino[0]['cb-0']).toBe(true);
  });

  test('pode limpar checksState[lift] = {} para resetar ciclo', () => {
    checksState.agacha[2] = { 'cb-0': true, 'cb-1': true };
    checksState.agacha = {};
    expect(Object.keys(checksState.agacha)).toHaveLength(0);
  });

  test('checksState independente entre lifts (modificar supino não afeta agacha)', () => {
    checksState.supino[0] = { 'cb-0': true };
    expect(checksState.agacha[0]).toBeUndefined();
  });
});

describe('cycleHistory — schema', () => {
  beforeEach(() => {
    cycleHistory.length = 0;
  });

  test('cycleHistory começa como array vazio após reset', () => {
    expect(Array.isArray(cycleHistory)).toBe(true);
    expect(cycleHistory).toHaveLength(0);
  });

  test('entrada cycleHistory tem campos esperados: lift, rmStart, rmEnd, dateEnd, gain, id', () => {
    const entry = {
      id:        uid(),
      lift:      'supino',
      rmStart:   74,
      rmEnd:     80,
      dateEnd:   '17/04/2026',
      gain:      6,
    };
    cycleHistory.push(entry);
    const e = cycleHistory[0];
    expect(e).toHaveProperty('lift');
    expect(e).toHaveProperty('rmStart');
    expect(e).toHaveProperty('rmEnd');
    expect(e).toHaveProperty('dateEnd');
    expect(e).toHaveProperty('gain');
    expect(e).toHaveProperty('id');
  });

  test('gain é calculável como rmEnd - rmStart', () => {
    const rmStart = 74;
    const rmEnd   = 80;
    const entry = {
      id:      uid(),
      lift:    'supino',
      rmStart,
      rmEnd,
      dateEnd: '17/04/2026',
      gain:    Math.round((rmEnd - rmStart) * 10) / 10,
    };
    cycleHistory.push(entry);
    expect(cycleHistory[0].gain).toBe(rmEnd - rmStart);
  });

  test('dateEnd está em formato dd/mm/aaaa', () => {
    const entry = {
      id:      uid(),
      lift:    'terra',
      rmStart: 100,
      rmEnd:   110,
      dateEnd: '17/04/2026',
      gain:    10,
    };
    cycleHistory.push(entry);
    expect(cycleHistory[0].dateEnd).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
});

describe('parseCycleDate() — casos adicionais', () => {
  test('data inválida não lança exceção (retorna Date inválido ou null)', () => {
    expect(() => parseCycleDate('não-é-data')).not.toThrow();
  });

  test('datas de anos diferentes são ordenáveis corretamente', () => {
    const d2020 = parseCycleDate('15/06/2020');
    const d2023 = parseCycleDate('15/06/2023');
    const d2025 = parseCycleDate('15/06/2025');
    expect(d2023 - d2020).toBeGreaterThan(0);
    expect(d2025 - d2023).toBeGreaterThan(0);
    expect(d2025 - d2020).toBeGreaterThan(d2025 - d2023);
  });
});

describe('customLifts e LIFT_LABELS', () => {
  beforeEach(() => {
    customLifts.length = 0;
  });

  test('LIFT_LABELS.supino, .agacha, .terra existem e são strings', () => {
    expect(typeof LIFT_LABELS.supino).toBe('string');
    expect(typeof LIFT_LABELS.agacha).toBe('string');
    expect(typeof LIFT_LABELS.terra).toBe('string');
  });

  test('customLifts começa vazio após reset', () => {
    expect(Array.isArray(customLifts)).toBe(true);
    expect(customLifts).toHaveLength(0);
  });

  test('adicionar entrada a customLifts aumenta length em 1', () => {
    customLifts.push({ id: uid(), name: 'Paralelas', rm: 60 });
    expect(customLifts).toHaveLength(1);
  });

  test('custom lift tem campos: id, name, rm', () => {
    const lift = { id: uid(), name: 'Paralelas', rm: 60 };
    customLifts.push(lift);
    const l = customLifts[0];
    expect(l).toHaveProperty('id');
    expect(l).toHaveProperty('name');
    expect(l).toHaveProperty('rm');
    expect(typeof l.name).toBe('string');
    expect(typeof l.rm).toBe('number');
  });
});
