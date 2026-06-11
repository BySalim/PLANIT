import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Backend integration tests bootstrap the real Nest app, so SWC must emit
// decorator metadata (esbuild — Vitest's default — cannot).
const TEST_DATABASE_URL =
  process.env['DATABASE_URL'] ??
  'postgresql://planit:planit_dev_password@localhost:5432/planit_test';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['test/**/*.spec.ts'],
    setupFiles: ['./test/setup.ts'],
    globalSetup: ['./test/global-setup.ts'],
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      // Secrets JWT factices pour les tests d'intégration (cf. ADR-0007).
      // Hex 64 chars — équivalent 256 bits, suffisant pour HS256.
      JWT_ACCESS_SECRET: 'test_access_secret_0000000000000000000000000000000000000000000000aa',
      JWT_REFRESH_SECRET: 'test_refresh_secret_000000000000000000000000000000000000000000000bb',
      JWT_ACCESS_TTL: '900',
      JWT_REFRESH_TTL: '604800',
    },
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        // Bootstrap entrypoint — not booted by createTestApp (tests wire the
        // app directly), so it never executes under the suite.
        'src/main.ts',
        // Type-only / DI-wiring barrels with no runtime branches to gate.
        'src/**/*.module.ts',
        'src/**/*.d.ts',
      ],
      thresholds: { lines: 60, branches: 45, functions: 55, statements: 60 },
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        target: 'es2022',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
});
