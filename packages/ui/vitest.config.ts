import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      // Barrels (index.*) are re-exports; icons are presentational SVG with no
      // logic; specs live in __tests__.
      exclude: [
        'src/index.ts',
        'src/components/index.tsx',
        'src/hooks/index.ts',
        'src/icons/**',
        'src/**/__tests__/**',
        'src/**/*.{test,spec}.{ts,tsx}',
      ],
      thresholds: { lines: 55, branches: 45, functions: 55, statements: 55 },
    },
  },
});
