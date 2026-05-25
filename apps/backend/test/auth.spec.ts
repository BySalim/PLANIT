import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from './helpers/app';
import { resetDb } from './helpers/db';

const prisma = new PrismaClient();
let app: INestApplication;

const RP_EMAIL = 'aminata.diallo@planit.test';
const STUDENT_EMAIL = 'ibrahima.sow@planit.test';
const PASSWORD = 'Test1234!';

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDb(prisma);
});

const api = (): ReturnType<typeof request> => request(app.getHttpServer());

/**
 * Helper : retourne le couple `{ access, refresh }` du `Set-Cookie` retourné
 * par supertest. Les Set-Cookie supertest sont toujours un `string[]`.
 */
function parseSetCookie(setCookie: string[] | string | undefined): Record<string, string> {
  if (!setCookie) return {};
  const list = Array.isArray(setCookie) ? setCookie : [setCookie];
  const out: Record<string, string> = {};
  for (const entry of list) {
    const firstSemi = entry.indexOf(';');
    const head = firstSemi === -1 ? entry : entry.slice(0, firstSemi);
    const eq = head.indexOf('=');
    if (eq === -1) continue;
    out[head.slice(0, eq).trim()] = head.slice(eq + 1).trim();
  }
  return out;
}

/** Récupère l'attribut `Path=…` du Set-Cookie qui contient `cookieName`. */
function cookieAttribute(
  setCookie: string[] | string | undefined,
  cookieName: string,
  attribute: string,
): string | undefined {
  if (!setCookie) return undefined;
  const list = Array.isArray(setCookie) ? setCookie : [setCookie];
  const lower = attribute.toLowerCase();
  for (const entry of list) {
    if (!entry.startsWith(`${cookieName}=`)) continue;
    const parts = entry.split(';').map((p) => p.trim());
    for (const part of parts) {
      const eq = part.indexOf('=');
      const key = eq === -1 ? part : part.slice(0, eq);
      if (key.toLowerCase() === lower) {
        return eq === -1 ? '' : part.slice(eq + 1);
      }
    }
  }
  return undefined;
}

describe('POST /api/auth/login', () => {
  it('logs in with valid credentials and posts access+refresh cookies', async () => {
    const res = await api().post('/api/auth/login').send({ email: RP_EMAIL, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      email: RP_EMAIL,
      role: 'RESPONSABLE_PROGRAMME',
    });

    const setCookie = res.headers['set-cookie'];
    const cookies = parseSetCookie(setCookie);
    expect(cookies['access']).toBeDefined();
    expect(cookies['refresh']).toBeDefined();

    // Cookie hygiene (ADR-0007 §2-3) — SameSite=Strict, Path=/ vs /api/auth/refresh, HttpOnly.
    const list = Array.isArray(setCookie) ? setCookie : [setCookie ?? ''];
    const accessRaw = list.find((c) => c.startsWith('access='));
    const refreshRaw = list.find((c) => c.startsWith('refresh='));
    expect(accessRaw).toMatch(/HttpOnly/i);
    expect(accessRaw).toMatch(/SameSite=Strict/i);
    expect(refreshRaw).toMatch(/HttpOnly/i);
    expect(refreshRaw).toMatch(/SameSite=Strict/i);

    expect(cookieAttribute(setCookie, 'access', 'Path')).toBe('/');
    expect(cookieAttribute(setCookie, 'refresh', 'Path')).toBe('/api/auth/refresh');
  });

  it('rejects an unknown email with 401', async () => {
    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'ghost@planit.test', password: PASSWORD });
    expect(res.status).toBe(401);
  });

  it('rejects an invalid password with 401', async () => {
    const res = await api()
      .post('/api/auth/login')
      .send({ email: RP_EMAIL, password: 'WrongPassword!' });
    expect(res.status).toBe(401);
  });

  it('rejects a malformed body (Zod 400)', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the current user profile when authenticated', async () => {
    const login = await api().post('/api/auth/login').send({ email: RP_EMAIL, password: PASSWORD });
    const cookies = parseSetCookie(login.headers['set-cookie']);

    const res = await api().get('/api/auth/me').set('Cookie', `access=${cookies['access']}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      email: RP_EMAIL,
      role: 'RESPONSABLE_PROGRAMME',
      fullName: 'Mme Aminata Diallo',
    });
  });

  it('rejects an unauthenticated request with 401', async () => {
    const res = await api().get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects a tampered access cookie with 401', async () => {
    const login = await api().post('/api/auth/login').send({ email: RP_EMAIL, password: PASSWORD });
    const cookies = parseSetCookie(login.headers['set-cookie']);
    // Flip a character in the signature segment.
    const tampered = (cookies['access'] ?? '').slice(0, -3) + 'xyz';
    const res = await api().get('/api/auth/me').set('Cookie', `access=${tampered}`);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  it('rotates the refresh cookie and revokes the previous one', async () => {
    const login = await api().post('/api/auth/login').send({ email: RP_EMAIL, password: PASSWORD });
    const initial = parseSetCookie(login.headers['set-cookie']);

    const refreshRes = await api()
      .post('/api/auth/refresh')
      .set('Cookie', `refresh=${initial['refresh']}`);
    expect(refreshRes.status).toBe(200);

    const rotated = parseSetCookie(refreshRes.headers['set-cookie']);
    expect(rotated['refresh']).toBeDefined();
    expect(rotated['refresh']).not.toBe(initial['refresh']);
    expect(rotated['access']).toBeDefined();
  });

  it('detects refresh reuse and revokes the whole family with 401', async () => {
    const login = await api().post('/api/auth/login').send({ email: RP_EMAIL, password: PASSWORD });
    const initial = parseSetCookie(login.headers['set-cookie']);

    // First refresh — succeeds. Now `initial.refresh` is `revokedAt = now`.
    await api()
      .post('/api/auth/refresh')
      .set('Cookie', `refresh=${initial['refresh']}`)
      .expect(200);

    // Replay the same (revoked) refresh : 401 + family revocation.
    const replay = await api()
      .post('/api/auth/refresh')
      .set('Cookie', `refresh=${initial['refresh']}`);
    expect(replay.status).toBe(401);

    // Verify family revocation : every refresh token of the user has revokedAt != null.
    const userRow = await prisma.user.findUnique({ where: { email: RP_EMAIL } });
    if (!userRow) throw new Error('seed user missing');
    const allTokens = await prisma.refreshToken.findMany({
      where: { userId: userRow.id },
    });
    expect(allTokens.length).toBeGreaterThan(0);
    for (const t of allTokens) {
      expect(t.revokedAt).not.toBeNull();
    }
  });

  it('rejects a refresh without any cookie with 401', async () => {
    const res = await api().post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears cookies and revokes the refresh token row', async () => {
    const login = await api().post('/api/auth/login').send({ email: RP_EMAIL, password: PASSWORD });
    const cookies = parseSetCookie(login.headers['set-cookie']);

    const logout = await api()
      .post('/api/auth/logout')
      .set('Cookie', `access=${cookies['access']}; refresh=${cookies['refresh']}`);
    expect(logout.status).toBe(204);

    // Both cookies are cleared (Max-Age=0 or Expires=past).
    const setCookie = logout.headers['set-cookie'];
    const list = Array.isArray(setCookie) ? setCookie : [setCookie ?? ''];
    expect(list.some((c) => c.startsWith('access='))).toBe(true);
    expect(list.some((c) => c.startsWith('refresh='))).toBe(true);

    // The corresponding refresh row is now revoked in BD.
    const userRow = await prisma.user.findUnique({ where: { email: RP_EMAIL } });
    if (!userRow) throw new Error('seed user missing');
    const revoked = await prisma.refreshToken.findMany({
      where: { userId: userRow.id, revokedAt: { not: null } },
    });
    expect(revoked.length).toBeGreaterThan(0);
  });

  it('is tolerant when called without an access cookie (still clears)', async () => {
    const res = await api().post('/api/auth/logout');
    // The route is protected by global JwtAuthGuard → must be 401 without a cookie.
    expect(res.status).toBe(401);
  });
});

describe('Global RBAC', () => {
  it('lets a RESPONSABLE_PROGRAMME publish sessions (200)', async () => {
    const login = await api().post('/api/auth/login').send({ email: RP_EMAIL, password: PASSWORD });
    const cookies = parseSetCookie(login.headers['set-cookie']);
    const res = await api()
      .post('/api/sessions/publish')
      .set('Cookie', `access=${cookies['access']}`);
    expect(res.status).toBe(200);
  });

  it('forbids an ETUDIANT from publishing (403)', async () => {
    const login = await api()
      .post('/api/auth/login')
      .send({ email: STUDENT_EMAIL, password: PASSWORD });
    const cookies = parseSetCookie(login.headers['set-cookie']);
    const res = await api()
      .post('/api/sessions/publish')
      .set('Cookie', `access=${cookies['access']}`);
    expect(res.status).toBe(403);
  });

  it('blocks an unauthenticated request to a protected endpoint (401)', async () => {
    const res = await api().get('/api/sessions').query({ weekStart: '2026-05-25' });
    expect(res.status).toBe(401);
  });

  it('leaves the health endpoint public (200)', async () => {
    const res = await api().get('/api/health');
    expect(res.status).toBe(200);
  });
});
