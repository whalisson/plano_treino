import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.js'],
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      include: [
        'js/state.js', 'js/rm.js', 'js/rpe.js',
        'js/logbook.js', 'js/cardio.js', 'js/periodizacao.js',
      ],
      reporter: ['text', 'lcov', 'html'],
    },
  },
});
