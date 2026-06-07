// Endpoint chaud — suivi modules (LOT 3). Login puis GET /api/suivi-modules.
import { sleep } from 'k6';
import { scenarioOptions, USERS } from '../lib/config.js';
import { login } from '../lib/auth.js';
import { suiviFlow } from '../lib/flows.js';

export const options = scenarioOptions(['login', 'suivi']);

export default function () {
  login(USERS.rp);
  suiviFlow();
  sleep(1);
}
