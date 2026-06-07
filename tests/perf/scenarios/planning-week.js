// Endpoint chaud — planning semaine (LOT 3).
// Login puis GET /api/v2/sessions?weekStart=<lundi semaine courante>.
import { sleep } from 'k6';
import { scenarioOptions, USERS } from '../lib/config.js';
import { login } from '../lib/auth.js';
import { planningFlow } from '../lib/flows.js';

export const options = scenarioOptions(['login', 'planning']);

export default function () {
  login(USERS.rp);
  planningFlow();
  sleep(1);
}
