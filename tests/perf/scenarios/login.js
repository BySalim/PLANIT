// Endpoint chaud — login isolé (LOT 3).
import { sleep } from 'k6';
import { scenarioOptions, USERS } from '../lib/config.js';
import { login } from '../lib/auth.js';

export const options = scenarioOptions(['login']);

export default function () {
  login(USERS.rp);
  sleep(1);
}
