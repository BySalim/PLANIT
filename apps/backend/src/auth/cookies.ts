/**
 * Helpers centralisant la politique cookie d'auth PLANIT (cf. ADR-0007 §2-3).
 *
 * - `HttpOnly` toujours : JS client n'a jamais accès au token.
 * - `SameSite=Strict` sur les **deux** cookies : pas d'OAuth ni d'embed
 *   cross-site, la surface CSRF est neutralisée.
 * - `Secure=true` hors dev : en `http://localhost`, le browser refuse de
 *   stocker un cookie `Secure`, on bascule donc à false pour le dev local.
 * - Le refresh est limité à `Path=/api/auth/refresh` : le navigateur ne
 *   l'envoie pas sur les autres routes — surface CSRF nulle sur le refresh.
 */

interface CookieResponse {
  cookie(name: string, value: string, options?: CookieOptionsLike): unknown;
  clearCookie(name: string, options?: CookieOptionsLike): unknown;
}

interface CookieOptionsLike {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  path?: string;
  maxAge?: number;
}

export const ACCESS_COOKIE_NAME = 'access';
export const REFRESH_COOKIE_NAME = 'refresh';
export const REFRESH_COOKIE_PATH = '/api/auth/refresh';

/**
 * TTL en secondes lus depuis l'env. Défauts : 15 min / 7 j (ADR-0005 §4).
 * On parse à la volée et on n'exporte pas la constante pour pouvoir les
 * surcharger en test via `vi.stubEnv`.
 */
function accessTtlSeconds(): number {
  const raw = process.env['JWT_ACCESS_TTL'];
  const parsed = raw !== undefined ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 900;
}

function refreshTtlSeconds(): number {
  const raw = process.env['JWT_REFRESH_TTL'];
  const parsed = raw !== undefined ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 604_800;
}

function isSecure(): boolean {
  return process.env['NODE_ENV'] === 'production';
}

/** Pose les deux cookies post-login et post-refresh. */
export function setAuthCookies(
  res: CookieResponse,
  accessToken: string,
  refreshToken: string,
): void {
  res.cookie(ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: isSecure(),
    sameSite: 'strict',
    path: '/',
    maxAge: accessTtlSeconds() * 1000,
  });
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isSecure(),
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
    maxAge: refreshTtlSeconds() * 1000,
  });
}

/** Efface les deux cookies (logout, ou réutilisation détectée). */
export function clearAuthCookies(res: CookieResponse): void {
  res.clearCookie(ACCESS_COOKIE_NAME, {
    httpOnly: true,
    secure: isSecure(),
    sameSite: 'strict',
    path: '/',
  });
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isSecure(),
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
  });
}

export { accessTtlSeconds, refreshTtlSeconds };
