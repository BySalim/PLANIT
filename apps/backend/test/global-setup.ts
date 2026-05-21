import { execSync } from 'node:child_process';

// Runs once before the whole test suite: applies the Prisma schema to the
// dedicated test database (`planit_test`). The database itself must already
// exist — see apps/backend/.env.example.

export function setup(): void {
  const databaseUrl =
    process.env['DATABASE_URL'] ??
    'postgresql://planit:planit_dev_password@localhost:5432/planit_test';

  console.log('[test] applying migrations to the test database…');
  execSync('pnpm exec prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}
