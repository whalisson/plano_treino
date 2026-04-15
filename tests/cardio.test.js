/**
 * Testes — cardio.js
 * Cobre: parseCardioDate(), allCardioSessions(), lógica de streak
 */

describe('parseCardioDate()', () => {
  test('converte "dd/mm/aaaa" em Date correta', () => {
    const d = parseCardioDate('15/04/2025');
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(3);   // 0-based
    expect(d.getDate()).toBe(15);
  });

  test('converte "01/01/2024"', () => {
    const d = parseCardioDate('01/01/2024');
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(1);
  });

  test('converte "dd/mm" sem ano usando o ano atual', () => {
    const d = parseCardioDate('10/06');
    expect(d.getFullYear()).toBe(new Date().getFullYear());
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(10);
  });

  test('ano de 2 dígitos é convertido para 2000+', () => {
    const d = parseCardioDate('01/03/25');
    expect(d.getFullYear()).toBe(2025);
  });

  test('datas são comparáveis com operadores < >', () => {
    const antes  = parseCardioDate('01/01/2023');
    const depois = parseCardioDate('31/12/2023');
    expect(antes < depois).toBe(true);
  });
});

describe('allCardioSessions()', () => {
  beforeEach(() => {
    // Limpa estado entre testes
    cardioBase.length  = 0;
    cardioExtra.length = 0;
  });

  test('retorna array vazio quando não há sessões', () => {
    expect(allCardioSessions()).toEqual([]);
  });

  test('combina sessões de cardioBase e cardioExtra', () => {
    cardioBase.push({ d: '01/04/2025', t: 30, type: 'corrida' });
    cardioExtra.push({ d: '02/04/2025', t: 45, type: 'bike' });
    const all = allCardioSessions();
    expect(all).toHaveLength(2);
  });

  test('cardioBase vem antes de cardioExtra no array', () => {
    cardioBase.push({ d: '01/04', t: 30, type: 'corrida' });
    cardioExtra.push({ d: '02/04', t: 45, type: 'bike' });
    const all = allCardioSessions();
    expect(all[0].type).toBe('corrida');
    expect(all[1].type).toBe('bike');
  });
});

describe('Lógica de meta semanal (calcCardioStreak)', () => {
  beforeEach(() => {
    cardioBase.length  = 0;
    cardioExtra.length = 0;
    // Garante que o input de meta esteja com valor padrão
    document.getElementById('cardioGoal').value = '300';
  });

  test('streak é 0 quando não há sessões', () => {
    expect(calcCardioStreak()).toBe(0);
  });

  test('streak é 0 quando a semana atual não atingiu a meta', () => {
    // Adiciona apenas 100 min na semana atual (meta = 300)
    const { start } = getWeekRange();
    const dd = String(start.getDate()).padStart(2, '0');
    const mm = String(start.getMonth() + 1).padStart(2, '0');
    const aa = start.getFullYear();
    cardioExtra.push({ d: `${dd}/${mm}/${aa}`, t: 100, type: 'corrida' });
    expect(calcCardioStreak()).toBe(0);
  });

  test('streak é 1 quando a semana atual atingiu exatamente a meta', () => {
    const { start } = getWeekRange();
    const dd = String(start.getDate()).padStart(2, '0');
    const mm = String(start.getMonth() + 1).padStart(2, '0');
    const aa = start.getFullYear();
    // 3 sessões de 100 min = 300 min (meta exata)
    for (let i = 0; i < 3; i++) {
      cardioExtra.push({ d: `${dd}/${mm}/${aa}`, t: 100, type: 'corrida' });
    }
    expect(calcCardioStreak()).toBeGreaterThanOrEqual(1);
  });
});

describe('Constantes de tipo de cardio', () => {
  test('CARDIO_TYPE_LABELS contém todos os tipos esperados', () => {
    const tipos = ['corrida', 'bike', 'natacao', 'eliptico', 'outro'];
    tipos.forEach(tipo => {
      expect(CARDIO_TYPE_LABELS[tipo]).toBeDefined();
      expect(typeof CARDIO_TYPE_LABELS[tipo]).toBe('string');
    });
  });

  test('CARDIO_TYPE_COLORS contém cores para todos os tipos', () => {
    const tipos = ['corrida', 'bike', 'natacao', 'eliptico', 'outro'];
    tipos.forEach(tipo => {
      expect(CARDIO_TYPE_COLORS[tipo]).toBeDefined();
      expect(CARDIO_TYPE_COLORS[tipo]).toMatch(/^rgba/);
    });
  });
});
