// db.test.js needs the REAL db.js implementation, not the mock from setup.js
vi.unmock('../js/db.js');

import 'fake-indexeddb/auto';
import { idbSet, idbGet, DB_NAME, RECORD_KEY, STORE_NAME } from '../js/db.js';

describe('constantes', () => {
  test('DB_NAME é gorila-gym', () => {
    expect(DB_NAME).toBe('gorila-gym');
  });

  test('RECORD_KEY é main', () => {
    expect(RECORD_KEY).toBe('main');
  });

  test('STORE_NAME é state', () => {
    expect(STORE_NAME).toBe('state');
  });
});

describe('idbSet + idbGet (round-trip)', () => {
  test('idbSet resolve sem erros', async () => {
    await expect(idbSet('main', { foo: 'bar' })).resolves.toBeUndefined();
  });

  test('idbGet retorna o valor gravado por idbSet', async () => {
    const value = { treino: 'A', series: 3 };
    await idbSet('main', value);
    await expect(idbGet('main')).resolves.toEqual(value);
  });

  test('idbGet resolve com undefined para chave inexistente', async () => {
    await expect(idbGet('chave-inexistente')).resolves.toBeUndefined();
  });
});

describe('trigger de fbSave', () => {
  beforeEach(() => {
    globalThis.fbSave = vi.fn();
  });

  afterEach(() => {
    delete globalThis.fbSave;
  });

  test('chama fbSave com o valor gravado quando fbSave é função', async () => {
    const value = { foo: 'bar' };
    await idbSet('main', value);
    expect(globalThis.fbSave).toHaveBeenCalledOnce();
    expect(globalThis.fbSave).toHaveBeenCalledWith(value);
  });

  test('não lança erro quando fbSave não está definido', async () => {
    delete globalThis.fbSave;
    await expect(idbSet('main', { x: 1 })).resolves.toBeUndefined();
  });
});
