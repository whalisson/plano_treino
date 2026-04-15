/**
 * Testes — logbook.js
 * Cobre: detectExerciseGroup(), parseVolume()
 */

describe('detectExerciseGroup() — Push', () => {
  const pushExercises = [
    'Supino Reto',
    'Supino Inclinado Halteres',
    'Crucifixo Máquina',
    'Desenvolvimento Arnold',
    'Elevação Lateral',
    'Tríceps Testa',
    'Pushdown Corda',
    'Dip Paralelas',
    'Push Press',
    'Flexão Solo',
    'Overhead Press',
    'Close Grip Bench',
    'Voador Peito Máquina',
    'Fly Cable',
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
    'Rosca Direta',
    'Rosca Martelo',
    'Barra Fixa',
    'Pulldown Polia',
    'Encolhimento Trapézio',
    'Face Pull',
    'Deadlift',
    'Pulldown Polia',
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
    'Flexora',
    'Extensora',
    'Panturrilha em Pé',
    'Bulgaro Unilateral',
    'Cadeira Flexora',
    'RDL',
  ];

  legExercises.forEach(name => {
    test(`"${name}" → legs`, () => {
      expect(detectExerciseGroup(name)).toBe('legs');
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
    expect(detectExerciseGroup('ROSCA DIRETA')).toBe('pull');
  });

  test('detecção ignora acentos', () => {
    expect(detectExerciseGroup('Elevação Lateral')).toBe('push');
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
