import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { validateEnv } from '../../src/common/env.validation';

// Fail-fast env validation (V04 LOT 1.5). The boot path never runs under the
// integration suite (createTestApp wires the app directly), so this unit test
// is the proof that a misconfigured backend refuses to start (deferred from
// LOT 1 to the LOT 2 coverage gate).

const REQUIRED = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
};

let snapshot: NodeJS.ProcessEnv;

beforeEach(() => {
  snapshot = { ...process.env };
  // Start from a clean slate for the keys under test.
  for (const key of [
    'DATABASE_URL',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'PORT',
    'FRONTEND_URL',
    'NODE_ENV',
  ]) {
    delete process.env[key];
  }
});

afterEach(() => {
  process.env = snapshot;
});

describe('validateEnv', () => {
  it('returns the parsed env with defaults when required vars are present', () => {
    Object.assign(process.env, REQUIRED);
    const env = validateEnv();
    expect(env.DATABASE_URL).toBe(REQUIRED.DATABASE_URL);
    expect(env.NODE_ENV).toBe('development'); // default
    expect(env.PORT).toBe(3001); // default
  });

  it('coerces PORT and validates NODE_ENV enum', () => {
    Object.assign(process.env, REQUIRED, { PORT: '4000', NODE_ENV: 'production' });
    const env = validateEnv();
    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe('production');
  });

  it('throws listing the missing required var', () => {
    Object.assign(process.env, { ...REQUIRED });
    delete process.env['JWT_ACCESS_SECRET'];
    expect(() => validateEnv()).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('throws when a JWT secret is too short', () => {
    Object.assign(process.env, REQUIRED, { JWT_REFRESH_SECRET: 'tooshort' });
    expect(() => validateEnv()).toThrow(/JWT_REFRESH_SECRET/);
  });

  it('throws when DATABASE_URL is not a URL', () => {
    Object.assign(process.env, REQUIRED, { DATABASE_URL: 'not-a-url' });
    expect(() => validateEnv()).toThrow(/DATABASE_URL/);
  });
});
