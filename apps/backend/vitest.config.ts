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
    env: { DATABASE_URL: TEST_DATABASE_URL },
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
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
