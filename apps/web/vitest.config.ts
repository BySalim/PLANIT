import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Vitest runs from the package directory (apps/web) under pnpm/turbo.
const srcDir = resolve(process.cwd(), 'src');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': srcDir,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // Next.js routes/layouts/pages are exercised by the Playwright e2e
        // suite (LOT 2.4), not unit tests — keep them out of the unit gate.
        'src/app/**',
        'src/middleware.ts',
        // Dev-only tooling, tree-shaken out of prod builds.
        'src/components/dev/**',
        // Heavy presentational view trees gated by the Playwright e2e suite
        // (role pages render them — ADR-0014 §4), not by unit tests. The unit
        // gate covers the logic layer (lib/hooks/contexts) + reusable
        // primitives (ui/layout/planning). Growing component unit coverage is
        // tracked as TD-V04-WEB-COMPONENT-COV.
        'src/components/rp/**',
        'src/components/enseignant/**',
        'src/components/consult/**',
        // Barrels, type-only modules, specs.
        'src/**/index.{ts,tsx}',
        'src/**/*.d.ts',
        'src/**/__tests__/**',
        'src/**/*.{test,spec}.{ts,tsx}',
      ],
      thresholds: { lines: 45, branches: 35, functions: 40, statements: 45 },
    },
  },
});
