import request from 'supertest';
import type { INestApplication } from '@nestjs/common';

/**
 * Mapping rôle métier → email du seed user correspondant.
 *
 * `RESPONSABLE_PROGRAMME` = Aminata Diallo (RP1), manager de l'AC seedé et
 * responsable des salles Amphi/201/202. `ASSISTANT_PROGRAMME` = Awa Touré (AC),
 * rattachée à RP1 et assignée à la classe GL3-A (cf. seed v3 / V3-D9).
 */
const SEED_EMAIL: Record<SupportedRole, string> = {
  RESPONSABLE_PROGRAMME: 'aminata.diallo@planit.test',
  ASSISTANT_PROGRAMME: 'awa.toure@planit.test',
  ENSEIGNANT: 'oumar.ndiaye@planit.test',
  ETUDIANT: 'ibrahima.sow@planit.test',
};

export type SupportedRole =
  | 'RESPONSABLE_PROGRAMME'
  | 'ASSISTANT_PROGRAMME'
  | 'ENSEIGNANT'
  | 'ETUDIANT';

/** Email du 2ᵉ RP (Cheikh Diop) — responsable du Labo, hors périmètre AC. */
export const RP2_EMAIL = 'cheikh.diop@planit.test';

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
  return loginByEmail(app, SEED_EMAIL[role]);
}

/**
 * Login par email arbitraire d'un seed user (ex. le 2ᵉ RP `RP2_EMAIL`, qui
 * partage le rôle `RESPONSABLE_PROGRAMME` mais un autre périmètre de salles).
 * Tous les seeds partagent le password `Test1234!`.
 */
export async function loginByEmail(app: INestApplication, email: string): Promise<LoggedInSession> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password: 'Test1234!' });

  if (res.status !== 200) {
    throw new Error(`[loginByEmail] login failed for ${email} — status ${res.status}`);
  }

  const cookies = extractCookies(res.headers['set-cookie']);
  const accessCookie = cookies['access'];
  const refreshCookie = cookies['refresh'];
  if (!accessCookie || !refreshCookie) {
    throw new Error(`[loginByEmail] login response missing access/refresh cookies`);
  }

  const body = res.body as { id: string; email: string; role: SupportedRole };

  return {
    accessCookie,
    refreshCookie,
    cookieHeader: `access=${accessCookie}; refresh=${refreshCookie}`,
    email,
    userId: body.id,
    role: body.role,
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
