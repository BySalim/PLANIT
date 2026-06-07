// Parcours RP complet — point d'entrée du job CI `perf-smoke` (LOT 3).
// Une itération = login puis les 4 lectures chaudes. Chaque requête est taguée
// → seuil p95 par endpoint. Profil piloté par PROFILE (smoke | load-leger).
import { sleep } from 'k6';
import { scenarioOptions, USERS } from '../lib/config.js';
import { login } from '../lib/auth.js';
import { classesFlow, planningFlow, suiviFlow, inscriptionLookupFlow } from '../lib/flows.js';

export const options = scenarioOptions(['login', 'classes', 'planning', 'suivi', 'inscription']);

export default function () {
  login(USERS.rp);
  classesFlow();
  planningFlow();
  suiviFlow();
  inscriptionLookupFlow();
  sleep(1);
}
