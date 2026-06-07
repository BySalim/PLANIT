// Endpoint chaud — entrée du flow inscription (LOT 3).
// Login puis GET /api/etudiants/lookup?email=<seed> (lecture idempotente ;
// l'écriture POST /classes/:id/inscriptions est hors portée smoke, cf. spec).
import { sleep } from 'k6';
import { scenarioOptions, USERS } from '../lib/config.js';
import { login } from '../lib/auth.js';
import { inscriptionLookupFlow } from '../lib/flows.js';

export const options = scenarioOptions(['login', 'inscription']);

export default function () {
  login(USERS.rp);
  inscriptionLookupFlow();
  sleep(1);
}
