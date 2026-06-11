import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      // Barrel `src/index.ts` is pure re-exports; specs live in __tests__.
      exclude: ['src/index.ts', 'src/**/__tests__/**', 'src/**/*.spec.ts'],
      thresholds: { lines: 80, branches: 70, functions: 80, statements: 80 },
    },
  },
});
