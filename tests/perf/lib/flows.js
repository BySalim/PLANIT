// Flows de lecture des endpoints chauds — LOT 3.
// Chaque flow fait une requête taguée `endpoint:<name>` (seuil p95 dédié),
// vérifie le statut 2xx et compte les éventuelles 5xx.
import http from 'k6/http';
import { check } from 'k6';
import { API, STUDENT_EMAIL, currentMonday, serverErrors } from './config.js';

function getTagged(path, endpoint) {
  const res = http.get(`${API}${path}`, { tags: { endpoint } });
  if (res.status >= 500) serverErrors.add(1);
  check(res, { [`${endpoint} 2xx`]: (r) => r.status >= 200 && r.status < 300 });
  return res;
}

// GET /api/classes — liste des classes (scope année courante côté serveur).
export const classesFlow = () => getTagged('/classes', 'classes');

// GET /api/v2/sessions?weekStart=<lundi> — planning semaine courante.
export const planningFlow = () =>
  getTagged(`/v2/sessions?weekStart=${currentMonday()}`, 'planning');

// GET /api/suivi-modules — suivi des modules (tous filtres optionnels).
export const suiviFlow = () => getTagged('/suivi-modules', 'suivi');

// GET /api/etudiants/lookup?email=<seed> — entrée lecture du flow d'inscription
// email-first (idempotente ; l'écriture POST est hors portée smoke, cf. spec).
export const inscriptionLookupFlow = () =>
  getTagged(`/etudiants/lookup?email=${encodeURIComponent(STUDENT_EMAIL)}`, 'inscription');
