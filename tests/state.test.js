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

// ── saveState() ──────────────────────────────────────────────────────────────

describe('saveState()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.idbSet = vi.fn().mockResolvedValue(undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test('debounce: múltiplas chamadas rápidas resultam em apenas 1 idbSet', () => {
    saveState();
    saveState();
    saveState();
    vi.runAllTimers();
    expect(global.idbSet).toHaveBeenCalledTimes(1);
  });

  test('chama idbSet com RECORD_KEY e objeto de dados', () => {
    saveState();
    vi.runAllTimers();
    expect(global.idbSet).toHaveBeenCalledWith(RECORD_KEY, expect.any(Object));
  });

  test('objeto salvo contém campo checks (checksState)', () => {
    saveState();
    vi.runAllTimers();
    const data = global.idbSet.mock.calls[0][1];
    expect(data).toHaveProperty('checks');
  });

  test('objeto salvo contém campo board', () => {
    saveState();
    vi.runAllTimers();
    const data = global.idbSet.mock.calls[0][1];
    expect(data).toHaveProperty('board');
  });

  test('não chama idbSet se o timeout for cancelado antes dos 400ms', () => {
    saveState();
    vi.advanceTimersByTime(399);
    expect(global.idbSet).not.toHaveBeenCalled();
  });
});

// ── loadState() ──────────────────────────────────────────────────────────────

describe('loadState()', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('retorna null quando idbGet retorna null (primeira execução)', async () => {
    global.idbGet = vi.fn().mockResolvedValue(null);
    const result = await loadState();
    expect(result).toBeNull();
  });

  test('retorna o objeto quando idbGet resolve com dados', async () => {
    const fakeData = { rmSupino: 80, checks: {}, board: [] };
    global.idbGet = vi.fn().mockResolvedValue(fakeData);
    const result = await loadState();
    expect(result).toEqual(fakeData);
  });

  test('retorna null quando idbGet rejeita e localStorage está vazio', async () => {
    global.idbGet = vi.fn().mockRejectedValue(new Error('IDB error'));
    const result = await loadState();
    expect(result).toBeNull();
  });

  test('migra de localStorage gorila_fallback quando IDB está vazio', async () => {
    global.idbGet = vi.fn().mockResolvedValue(null);
    global.idbSet = vi.fn().mockResolvedValue(undefined);
    const fallbackData = { rmSupino: 80, checks: {} };
    localStorage.setItem('gorila_fallback', JSON.stringify(fallbackData));
    const result = await loadState();
    expect(result).toEqual(fallbackData);
  });
});

// ── showUndo() ───────────────────────────────────────────────────────────────

describe('showUndo()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset toast state
    const toast = document.getElementById('undoToast');
    toast.classList.remove('on');
    toast.querySelector('.undo-msg').textContent = '';
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test('adiciona classe "on" ao undoToast', () => {
    showUndo('Exercício removido', () => {}, null);
    const toast = document.getElementById('undoToast');
    expect(toast.classList.contains('on')).toBe(true);
  });

  test('define texto correto na .undo-msg', () => {
    showUndo('Treino apagado', () => {}, null);
    const msg = document.querySelector('#undoToast .undo-msg');
    expect(msg.textContent).toBe('Treino apagado');
  });

  test('commitFn chamada após 4000ms', () => {
    const commitFn = vi.fn();
    showUndo('Ação feita', () => {}, commitFn);
    vi.advanceTimersByTime(4000);
    expect(commitFn).toHaveBeenCalledTimes(1);
  });

  test('undoFn chamada ao clicar .undo-btn, commitFn NÃO chamada', () => {
    const undoFn = vi.fn();
    const commitFn = vi.fn();
    showUndo('Ação feita', undoFn, commitFn);
    const btn = document.querySelector('#undoToast .undo-btn');
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(undoFn).toHaveBeenCalledTimes(1);
    vi.runAllTimers();
    expect(commitFn).not.toHaveBeenCalled();
  });

  test('segunda chamada cancela timer da primeira (debounce)', () => {
    const commitFn1 = vi.fn();
    const commitFn2 = vi.fn();
    showUndo('Primeira', () => {}, commitFn1);
    vi.advanceTimersByTime(2000);
    showUndo('Segunda', () => {}, commitFn2);
    vi.advanceTimersByTime(4000);
    expect(commitFn1).not.toHaveBeenCalled();
    expect(commitFn2).toHaveBeenCalledTimes(1);
  });
});
