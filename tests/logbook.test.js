/**
 * Testes — logbook.js
 * Cobre: detectExerciseGroup(), parseVolume()
 */

describe('detectExerciseGroup() — Push', () => {
  const pushExercises = [
    'Supino Reto',
    'Supino Inclinado Halteres',
    'Desenvolvimento Arnold',
    'Dip Paralelas',
    'Push Press',
    'Flexão Solo',
    'Overhead Press',
    'Close Grip Bench',
  ];

  pushExercises.forEach(name => {
    test(`"${name}" → push`, () => {
      expect(detectExerciseGroup(name)).toBe('push');
    });
  });
});

describe('detectExerciseGroup() — Pull', () => {
  const pullExercises = [
    'Remada Baixa',
    'Puxada Frente',
    'Barra Fixa',
    'Pulldown Polia',
    'Deadlift',
  ];

  pullExercises.forEach(name => {
    test(`"${name}" → pull`, () => {
      expect(detectExerciseGroup(name)).toBe('pull');
    });
  });
});

describe('detectExerciseGroup() — Legs', () => {
  const legExercises = [
    'Agachamento',
    'Leg Press 45',
    'Afundo',
    'Hip Thrust',
    'Stiff',
    'Bulgaro Unilateral',
    'RDL',
  ];

  legExercises.forEach(name => {
    test(`"${name}" → legs`, () => {
      expect(detectExerciseGroup(name)).toBe('legs');
    });
  });
});

describe('detectExerciseGroup() — Isolados (sem grupo MRV)', () => {
  const isolatedExercises = [
    // ombro isolado
    'Elevação Lateral',
    'Elevação Frontal',
    'Face Pull',
    // peito isolado
    'Crucifixo Máquina',
    'Voador Peito Máquina',
    'Fly Cable',
    // bíceps
    'Rosca Direta',
    'Rosca Martelo',
    // tríceps
    'Tríceps Testa',
    'Pushdown Corda',
    // trapézio isolado
    'Encolhimento Trapézio',
    // perna isolado
    'Flexora',
    'Extensora',
    'Cadeira Flexora',
    'Panturrilha em Pé',
  ];

  isolatedExercises.forEach(name => {
    test(`"${name}" → '' (isolado)`, () => {
      expect(detectExerciseGroup(name)).toBe('');
    });
  });
});

describe('detectExerciseGroup() — Core', () => {
  const coreExercises = [
    'Prancha',
    'Crunch',
    'Abdominal',
    'Russian Twist',
    'Plank Lateral',
    'Dead Bug',
    'Pallof Press',
    'Ab Wheel',
    'Hollow Body',
  ];

  coreExercises.forEach(name => {
    test(`"${name}" → core`, () => {
      expect(detectExerciseGroup(name)).toBe('core');
    });
  });
});

describe('detectExerciseGroup() — Casos limite', () => {
  test('string vazia retorna string vazia', () => {
    expect(detectExerciseGroup('')).toBe('');
  });

  test('null/undefined retorna string vazia', () => {
    expect(detectExerciseGroup(null)).toBe('');
    expect(detectExerciseGroup(undefined)).toBe('');
  });

  test('apenas espaços retorna string vazia', () => {
    expect(detectExerciseGroup('   ')).toBe('');
  });

  test('detecção é case-insensitive', () => {
    expect(detectExerciseGroup('SUPINO RETO')).toBe('push');
    expect(detectExerciseGroup('agachamento')).toBe('legs');
    expect(detectExerciseGroup('REMADA BAIXA')).toBe('pull');
  });

  test('detecção ignora acentos', () => {
    expect(detectExerciseGroup('Elevação Lateral')).toBe('');
    expect(detectExerciseGroup('Puxada à Frente')).toBe('pull');
  });
});

describe('parseVolume()', () => {
  test('calcula volume total de uma série (reps × kg)', () => {
    // 3×10 × 50kg = 1500
    const items = [{ kg: 50, reps: '3x10' }];
    expect(parseVolume(items)).toBe(1500);
  });

  test('soma volume de múltiplos exercícios', () => {
    const items = [
      { kg: 50, reps: '3x10' },  // 1500
      { kg: 80, reps: '4x5'  },  // 1600
    ];
    expect(parseVolume(items)).toBe(3100);
  });

  test('ignora exercícios sem kg (kg = 0)', () => {
    const items = [
      { kg: 0,  reps: '3x10' },
      { kg: 50, reps: '3x10' },
    ];
    expect(parseVolume(items)).toBe(1500);
  });

  test('lista vazia retorna 0', () => {
    expect(parseVolume([])).toBe(0);
  });

  test('formato de reps sem "x" é tratado como número simples', () => {
    // "10" → 10 reps × 100 kg = 1000
    const items = [{ kg: 100, reps: '10' }];
    expect(parseVolume(items)).toBe(1000);
  });

  test('kg negativo é ignorado', () => {
    const items = [{ kg: -10, reps: '3x10' }];
    expect(parseVolume(items)).toBe(0);
  });
});

// ── Unit 4: board/bank mutations, kgHistory schema, parseVolume integration ──

describe('board — estrutura e mutações', () => {
  beforeEach(() => {
    for (let i = 0; i < 7; i++) board[i] = [];
  });

  test('board tem exatamente 7 arrays (um por dia da semana)', () => {
    expect(board).toHaveLength(7);
    board.forEach(day => expect(Array.isArray(day)).toBe(true));
  });

  test('board[0] começa vazio', () => {
    expect(board[0]).toHaveLength(0);
  });

  test('adicionar exercício ao board[0] aumenta length para 1', () => {
    const ex = { id: uid(), srcId: 'src1', name: 'Supino Reto', kg: 80, reps: '3x10' };
    board[0].push(ex);
    expect(board[0]).toHaveLength(1);
  });

  test('exercício no board tem propriedades: id, srcId, name, kg, reps', () => {
    const ex = { id: uid(), srcId: 'src1', name: 'Supino Reto', kg: 80, reps: '3x10' };
    board[0].push(ex);
    const placed = board[0][0];
    expect(placed).toHaveProperty('id');
    expect(placed).toHaveProperty('srcId');
    expect(placed).toHaveProperty('name');
    expect(placed).toHaveProperty('kg');
    expect(placed).toHaveProperty('reps');
  });

  test('remover exercício via splice mantém os outros exercícios', () => {
    const ex1 = { id: uid(), srcId: 's1', name: 'Supino Reto', kg: 80, reps: '3x10' };
    const ex2 = { id: uid(), srcId: 's2', name: 'Rosca Direta', kg: 30, reps: '3x12' };
    const ex3 = { id: uid(), srcId: 's3', name: 'Agachamento', kg: 100, reps: '4x8' };
    board[0].push(ex1, ex2, ex3);
    board[0].splice(1, 1); // remove ex2
    expect(board[0]).toHaveLength(2);
    expect(board[0][0].name).toBe('Supino Reto');
    expect(board[0][1].name).toBe('Agachamento');
  });

  test('mover exercício entre dias: splice de board[0] e push em board[1] preserva dados', () => {
    const ex = { id: uid(), srcId: 's1', name: 'Supino Reto', kg: 80, reps: '3x10' };
    board[0].push(ex);
    const [moved] = board[0].splice(0, 1);
    board[1].push(moved);
    expect(board[0]).toHaveLength(0);
    expect(board[1]).toHaveLength(1);
    expect(board[1][0].name).toBe('Supino Reto');
    expect(board[1][0].kg).toBe(80);
  });
});

describe('bank — operações CRUD', () => {
  beforeEach(() => {
    bank.length = 0;
  });

  test('banco começa vazio após reset', () => {
    expect(bank).toHaveLength(0);
  });

  test('exercício no bank tem: id, name, kg, reps, group', () => {
    const ex = { id: uid(), name: 'Supino Reto', kg: 80, reps: '3x10', group: 'push' };
    bank.push(ex);
    const stored = bank[0];
    expect(stored).toHaveProperty('id');
    expect(stored).toHaveProperty('name');
    expect(stored).toHaveProperty('kg');
    expect(stored).toHaveProperty('reps');
    expect(stored).toHaveProperty('group');
  });

  test('detectExerciseGroup("Supino Reto") retorna "push"', () => {
    expect(detectExerciseGroup('Supino Reto')).toBe('push');
  });

  test('banco pode ter múltiplos exercícios de grupos diferentes', () => {
    bank.push({ id: uid(), name: 'Supino Reto', kg: 80,  reps: '3x10', group: detectExerciseGroup('Supino Reto') });
    bank.push({ id: uid(), name: 'Remada Baixa', kg: 60, reps: '3x10', group: detectExerciseGroup('Remada Baixa') });
    bank.push({ id: uid(), name: 'Agachamento', kg: 100, reps: '4x8',  group: detectExerciseGroup('Agachamento') });
    expect(bank).toHaveLength(3);
    expect(bank[0].group).toBe('push');
    expect(bank[1].group).toBe('pull');
    expect(bank[2].group).toBe('legs');
  });
});

describe('kgHistory — schema e mutações', () => {
  test('kgHistory é um objeto (não array)', () => {
    expect(typeof kgHistory).toBe('object');
    expect(Array.isArray(kgHistory)).toBe(false);
  });

  test('kgHistory[exId] pode ser inicializado como array com entrada inicial', () => {
    const exId = uid();
    kgHistory[exId] = [{ date: '17/04/2026', kg: 80, name: 'Supino Reto', note: 'inicial' }];
    expect(Array.isArray(kgHistory[exId])).toBe(true);
    expect(kgHistory[exId]).toHaveLength(1);
    // cleanup
    delete kgHistory[exId];
  });

  test('entrada kgHistory tem campos: date, kg, name', () => {
    const exId = uid();
    kgHistory[exId] = [{ date: '17/04/2026', kg: 80, name: 'Supino Reto', note: '' }];
    const entry = kgHistory[exId][0];
    expect(entry).toHaveProperty('date');
    expect(entry).toHaveProperty('kg');
    expect(entry).toHaveProperty('name');
    // cleanup
    delete kgHistory[exId];
  });

  test('múltiplas entradas para o mesmo id são acumuladas no array', () => {
    const exId = uid();
    kgHistory[exId] = [];
    kgHistory[exId].push({ date: '10/04/2026', kg: 75, name: 'Supino Reto', note: '' });
    kgHistory[exId].push({ date: '17/04/2026', kg: 80, name: 'Supino Reto', note: 'PR' });
    expect(kgHistory[exId]).toHaveLength(2);
    expect(kgHistory[exId][1].kg).toBe(80);
    // cleanup
    delete kgHistory[exId];
  });
});

describe('parseVolume() — integração com board real', () => {
  beforeEach(() => {
    for (let i = 0; i < 7; i++) board[i] = [];
  });

  test('parseVolume(board[0]) com exercícios retorna número positivo', () => {
    board[0].push({ id: uid(), srcId: 's1', name: 'Supino Reto', kg: 80, reps: '3x10' });
    board[0].push({ id: uid(), srcId: 's2', name: 'Agachamento',  kg: 100, reps: '4x8' });
    const vol = parseVolume(board[0]);
    expect(vol).toBeGreaterThan(0);
    // 80*30 + 100*32 = 2400 + 3200 = 5600
    expect(vol).toBe(5600);
  });

  test('parseVolume de board vazio retorna 0', () => {
    expect(parseVolume(board[3])).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Propagação de carga — o mesmo exercício vive no banco, no board e nos
// treinos alternativos; mudar a carga em um lugar vale para todos.
// ─────────────────────────────────────────────────────────────────────────────

describe('applyKgEverywhere() — propagação entre banco, board e alternativos', () => {
  beforeEach(() => {
    setBank([{ id: 'src1', name: 'Supino Reto', kg: 80, reps: '3x10', group: 'push' }]);
    setBoard(Array.from({ length: 7 }, () => []));
    board[0].push({ id: 'b1', srcId: 'src1', name: 'Supino Reto', kg: 80, reps: '3x10' });
    setAltBoards([{ id: 'ab1', name: 'Push B', exercises: [
      { id: 'a1', srcId: 'src1', name: 'Supino Reto', kg: 80, reps: '3x10' },
    ] }]);
  });

  test('mudar pelo treino alternativo atualiza o board e o banco', () => {
    expect(applyKgEverywhere('src1', 'Supino Reto', 85)).toBe(true);
    expect(altBoards[0].exercises[0].kg).toBe(85);
    expect(board[0][0].kg).toBe(85);
    expect(bank[0].kg).toBe(85);
  });

  test('mudar pelo board atualiza o treino alternativo', () => {
    applyKgEverywhere('src1', 'Supino Reto', 90);
    expect(altBoards[0].exercises[0].kg).toBe(90);
  });

  test('não toca exercícios diferentes', () => {
    board[0].push({ id: 'b2', srcId: 'src2', name: 'Terra', kg: 110, reps: '3x5' });
    applyKgEverywhere('src1', 'Supino Reto', 85);
    expect(board[0][1].kg).toBe(110);
  });

  test('casa por nome quando a instância antiga não tem srcId', () => {
    board[1].push({ id: 'legado', name: 'Supino Reto', kg: 80, reps: '3x10' });
    applyKgEverywhere('src1', 'Supino Reto', 85);
    expect(board[1][0].kg).toBe(85);
    expect(board[1][0].srcId).toBe('src1'); // reatado ao banco
  });

  test('retorna false quando a carga já é a mesma', () => {
    expect(applyKgEverywhere('src1', 'Supino Reto', 80)).toBe(false);
  });

  test('ignora valores inválidos', () => {
    expect(applyKgEverywhere('src1', 'Supino Reto', NaN)).toBe(false);
    expect(applyKgEverywhere('src1', 'Supino Reto', -5)).toBe(false);
    expect(bank[0].kg).toBe(80);
  });

  test('findExerciseKg() usa o banco como fonte de verdade', () => {
    expect(findExerciseKg('src1', 'Supino Reto')).toBe(80);
  });
});

describe('setExerciseKg() — histórico de carga', () => {
  beforeEach(() => {
    setBank([{ id: 'src9', name: 'Remada Curvada', kg: 60, reps: '3x10', group: 'pull' }]);
    setBoard(Array.from({ length: 7 }, () => []));
    board[2].push({ id: 'b9', srcId: 'src9', name: 'Remada Curvada', kg: 60, reps: '3x10' });
    setAltBoards([]);
    delete kgHistory['src9'];
  });

  test('registra a carga anterior como "inicial" e a nova com a nota informada', () => {
    setExerciseKg('src9', 'Remada Curvada', 65, 'execução');
    expect(kgHistory['src9']).toHaveLength(2);
    expect(kgHistory['src9'][0]).toMatchObject({ kg: 60, note: 'inicial' });
    expect(kgHistory['src9'][1]).toMatchObject({ kg: 65, note: 'execução' });
  });

  test('propaga a nova carga para board e banco', () => {
    setExerciseKg('src9', 'Remada Curvada', 65);
    expect(bank[0].kg).toBe(65);
    expect(board[2][0].kg).toBe(65);
  });

  test('sem mudança não grava histórico', () => {
    expect(setExerciseKg('src9', 'Remada Curvada', 60)).toBe(false);
    expect(kgHistory['src9']).toBeUndefined();
  });
});
