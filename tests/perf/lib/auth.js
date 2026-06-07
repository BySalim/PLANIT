// Helper d'authentification k6 — LOT 3.
import http from 'k6/http';
import { check } from 'k6';
import { API, serverErrors } from './config.js';

// Login : POST /api/auth/login (@HttpCode 200). Le cookie jar par-VU de k6
// stocke le cookie `access` (HttpOnly) et le renvoie automatiquement sur les
// requêtes suivantes de la même itération — pas de header à poser à la main.
// Requête taguée `endpoint:login` pour le seuil p95 dédié.
export function login(user) {
  const res = http.post(
    `${API}/auth/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'login' },
    },
  );
  if (res.status >= 500) serverErrors.add(1);
  check(res, { 'login 200': (r) => r.status === 200 });
  return res;
}
