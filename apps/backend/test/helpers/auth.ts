import request from 'supertest';
import type { INestApplication } from '@nestjs/common';

/** Mapping rôle métier → email du seed user correspondant. */
const SEED_EMAIL: Record<SupportedRole, string> = {
  RESPONSABLE_PROGRAMME: 'aminata.diallo@planit.test',
  ENSEIGNANT: 'oumar.ndiaye@planit.test',
  ETUDIANT: 'ibrahima.sow@planit.test',
};

export type SupportedRole = 'RESPONSABLE_PROGRAMME' | 'ENSEIGNANT' | 'ETUDIANT';

export interface LoggedInSession {
  /** Valeurs brutes des cookies (à passer en `Cookie:` header). */
  accessCookie: string;
  refreshCookie: string;
  /** Header `Cookie:` agrégé prêt à coller dans `.set('Cookie', …)`. */
  cookieHeader: string;
  /** Email et id du seed user, pour assertions. */
  email: string;
  userId: string;
  role: SupportedRole;
}

/**
 * Login un user de seed via `POST /api/auth/login` puis renvoie ses cookies
 * et l'identifiant. Tous les seeds partagent le password `Test1234!`
 * (cf. `prisma/seed-data.ts`).
 *
 * Usage :
 * ```ts
 * const session = await loginAs(app, 'RESPONSABLE_PROGRAMME');
 * await request(app.getHttpServer())
 *   .post('/api/sessions')
 *   .set('Cookie', session.cookieHeader)
 *   .send(body)
 *   .expect(201);
 * ```
 */
export async function loginAs(
  app: INestApplication,
  role: SupportedRole,
): Promise<LoggedInSession> {
  const email = SEED_EMAIL[role];
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password: 'Test1234!' });

  if (res.status !== 200) {
    throw new Error(`[loginAs] login failed for ${role} (${email}) — status ${res.status}`);
  }

  const cookies = extractCookies(res.headers['set-cookie']);
  const accessCookie = cookies['access'];
  const refreshCookie = cookies['refresh'];
  if (!accessCookie || !refreshCookie) {
    throw new Error(`[loginAs] login response missing access/refresh cookies`);
  }

  const body = res.body as { id: string; email: string; role: SupportedRole };

  return {
    accessCookie,
    refreshCookie,
    cookieHeader: `access=${accessCookie}; refresh=${refreshCookie}`,
    email,
    userId: body.id,
    role,
  };
}

/**
 * Extrait les couples `name=value` du header `Set-Cookie` retourné par
 * supertest (peut être string ou string[]). On ignore les attributs
 * (`HttpOnly`, `Path=…`, etc.) pour ne garder que la valeur.
 */
function extractCookies(setCookie: string | string[] | undefined): Record<string, string> {
  if (!setCookie) return {};
  const list = Array.isArray(setCookie) ? setCookie : [setCookie];
  const out: Record<string, string> = {};
  for (const entry of list) {
    const firstSemi = entry.indexOf(';');
    const head = firstSemi === -1 ? entry : entry.slice(0, firstSemi);
    const eq = head.indexOf('=');
    if (eq === -1) continue;
    const name = head.slice(0, eq).trim();
    const value = head.slice(eq + 1).trim();
    out[name] = value;
  }
  return out;
}
