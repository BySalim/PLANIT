// Endpoint chaud — liste classes (LOT 3). Login puis GET /api/classes.
import { sleep } from 'k6';
import { scenarioOptions, USERS } from '../lib/config.js';
import { login } from '../lib/auth.js';
import { classesFlow } from '../lib/flows.js';

export const options = scenarioOptions(['login', 'classes']);

export default function () {
  login(USERS.rp);
  classesFlow();
  sleep(1);
}
