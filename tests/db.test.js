import 'fake-indexeddb/auto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadDB() {
  const code = fs.readFileSync(path.resolve(__dirname, '../js/db.js'), 'utf8');
  (0, eval)(code);
}

beforeEach(() => {
  global._db = null;
  loadDB();
});

describe('constantes', () => {
  test('DB_NAME é gorila-gym', () => {
    expect(global.DB_NAME).toBe('gorila-gym');
  });

  test('RECORD_KEY é main', () => {
    expect(global.RECORD_KEY).toBe('main');
  });

  test('STORE_NAME é state', () => {
    expect(global.STORE_NAME).toBe('state');
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
    global.fbSave = vi.fn();
  });

  afterEach(() => {
    delete global.fbSave;
  });

  test('chama fbSave com o valor gravado quando fbSave é função', async () => {
    const value = { foo: 'bar' };
    await idbSet('main', value);
    expect(global.fbSave).toHaveBeenCalledOnce();
    expect(global.fbSave).toHaveBeenCalledWith(value);
  });

  test('não lança erro quando fbSave não está definido', async () => {
    delete global.fbSave;
    await expect(idbSet('main', { x: 1 })).resolves.toBeUndefined();
  });
});
