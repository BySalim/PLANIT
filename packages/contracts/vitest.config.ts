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
      // Only the top-level src/index.ts is a pure barrel; the per-domain
      // index.ts files (auth, academic, planning, entities…) ARE the schemas.
      exclude: ['src/index.ts', 'src/**/__tests__/**', 'src/**/*.spec.ts'],
      thresholds: { lines: 70, branches: 60, functions: 70, statements: 70 },
    },
  },
});
