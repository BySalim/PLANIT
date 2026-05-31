/**
 * STUB V02 — auto-login dev tant que le LOT 6 (auth frontend) n'est pas livré.
 *
 * Le LOT 1 a protégé tous les endpoints backend (JwtAuthGuard global, fail-closed).
 * Le LOT 6 livrera côté front la page /login + le store auth + les guards de route.
 * En attendant, ce stub permet à `develop` de rester démontrable :
 *  - au boot, on lit la route active pour deviner le rôle attendu (RP/Enseignant/Étudiant)
 *  - on tente `GET /api/auth/me` ; si 401, on POST `/api/auth/login` avec les
 *    credentials du compte seed correspondant
 *  - les cookies access + refresh se posent, le reste de l'app fonctionne
 *
 * À SUPPRIMER au merge du LOT 6 (Oumy remplace par store Zustand + page /login).
 * Cf. tâche `USE-AUTH-HOOK` dans `docs/tech-debt.md`.
 */

import { API_BASE } from './api';

type ActorRoute = 'rp' | 'enseignant' | 'etudiant';

interface DevAccount {
  readonly email: string;
  readonly password: string;
}

/**
 * Comptes seed (cf. `apps/backend/prisma/seed-data.ts`).
 * Tous partagent le mot de passe `Test1234!` haché en argon2id.
 */
const DEV_ACCOUNTS: Record<ActorRoute, DevAccount> = {
  rp: { email: 'aminata.diallo@planit.test', password: 'Test1234!' },
  enseignant: { email: 'oumar.ndiaye@planit.test', password: 'Test1234!' },
  etudiant: { email: 'ibrahima.sow@planit.test', password: 'Test1234!' },
};

export function actorFromPathname(pathname: string): ActorRoute | null {
  if (pathname.startsWith('/rp')) return 'rp';
  if (pathname.startsWith('/enseignant')) return 'enseignant';
  if (pathname.startsWith('/etudiant')) return 'etudiant';
  return null;
}

async function checkAuth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function devLogin(account: DevAccount): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(account),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Garantit qu'un cookie d'auth valide est posé avant le rendu de l'app.
 * Retourne `true` si l'auth est en place, `false` en cas d'échec (backend KO,
 * seed manquant, etc.) — le composant appelant affichera l'erreur réseau.
 */
export async function ensureDevAuth(pathname: string): Promise<boolean> {
  const actor = actorFromPathname(pathname);
  if (actor === null) {
    // Route hors planit (404, racine, etc.) — pas d'auto-login nécessaire.
    return true;
  }

  if (await checkAuth()) return true;

  const account = DEV_ACCOUNTS[actor];
  return devLogin(account);
}
