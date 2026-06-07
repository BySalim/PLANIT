// Configuration partagée des scripts k6 — LOT 3 (ADR-0014 §5).
//
// Conventions LOT 0.4 :
// - `BASE_URL` pilote l'hôte (fallback web :3000, qui proxifie /api → backend) ;
//   en CI le job vise le backend direct (:3001) pour isoler la latence API.
// - Identifiants depuis des env vars (fixtures de seed, pas des secrets).
// - Profils minimum `smoke` et `load-leger`.
import { Counter } from 'k6/metrics';

// Hôte cible. Toujours préfixer /api (global prefix Nest).
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
export const API = `${BASE_URL}/api`;

// Comptes de seed (dev/test), surchargables par env. Ce ne sont PAS des
// secrets : mêmes comptes que `prisma/seed-data.ts` et les e2e (mot de passe
// fixe `Test1234!`). Le backend perf tourne en NODE_ENV=test → throttle login
// relâché, donc se reconnecter à chaque itération ne déclenche pas de 429.
const PASSWORD = __ENV.PERF_PASSWORD || 'Test1234!';
export const USERS = {
  rp: { email: __ENV.PERF_RP_EMAIL || 'aminata.diallo@planit.test', password: PASSWORD },
  ac: { email: __ENV.PERF_AC_EMAIL || 'awa.toure@planit.test', password: PASSWORD },
};

// Email étudiant seedé pour exercer le lookup d'inscription (retourne 200).
export const STUDENT_EMAIL = __ENV.PERF_STUDENT_EMAIL || 'ibrahima.sow@planit.test';

// Lundi (UTC) de la semaine courante au format YYYY-MM-DD. Le seed date ses
// séances relativement à ce lundi → le planning renvoie des données réelles.
// Surchargable via WEEK_START.
export function currentMonday() {
  if (__ENV.WEEK_START) return __ENV.WEEK_START;
  const now = new Date();
  const dow = now.getUTCDay(); // 0 = dimanche … 6 = samedi
  const offsetToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetToMonday),
  );
  return monday.toISOString().slice(0, 10);
}

// Compteur explicite des réponses 5xx — l'ADR exige « aucune réponse 5xx »,
// distinct du taux d'erreur global (qui inclut aussi les 4xx).
export const serverErrors = new Counter('server_errors');

// Profils de charge (ADR-0014 §5). VUS/DURATION surchargables par env.
const PROFILE = __ENV.PROFILE || 'smoke';
const PROFILES = {
  smoke: { vus: Number(__ENV.VUS) || 2, duration: __ENV.DURATION || '20s' },
  'load-leger': {
    stages: [
      { duration: '30s', target: Number(__ENV.VUS) || 10 },
      { duration: '1m', target: Number(__ENV.VUS) || 10 },
      { duration: '20s', target: 0 },
    ],
  },
};

// Construit les `options` k6 : exécuteur (profil) + seuils initiaux (ADR-0014 §5).
// `endpoints` ajoute un seuil p95 par sous-métrique taguée (`endpoint:<name>`),
// de sorte que chaque endpoint chaud est borné individuellement.
export function scenarioOptions(endpoints = []) {
  const thresholds = {
    http_req_failed: ['rate<0.01'], // < 1 % d'erreurs HTTP (4xx + 5xx)
    http_req_duration: ['p95<800'], // p95 global < 800 ms
    server_errors: ['count<1'], // aucune réponse 5xx
    checks: ['rate>0.99'], // > 99 % de statuts attendus
  };
  for (const name of endpoints) {
    thresholds[`http_req_duration{endpoint:${name}}`] = ['p95<800'];
  }
  const load = PROFILES[PROFILE] || PROFILES.smoke;
  return {
    ...load,
    thresholds,
    summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'max'],
  };
}
