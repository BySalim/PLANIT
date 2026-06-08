import { NextResponse, type NextRequest } from 'next/server';
import { safeReturnUrl } from '@/lib/return-url';

/**
 * Middleware d'authentification — gating *optimiste* (pattern Next.js 15).
 *
 * Rôle : éviter le flash de contenu et le spinner « chargement infini » en
 * décidant la redirection AVANT le rendu, côté serveur/edge.
 *
 * Frontière de sécurité réelle = guards RBAC du backend NestJS (LOT 1). Ce
 * middleware ne fait que de l'UX : il vérifie la *présence* du cookie d'accès
 * (`access`, posé first-party via le proxy `/api`, cf. next.config.ts), pas sa
 * validité cryptographique (le JWT est HttpOnly, non décodable ici sans le
 * secret — et ce n'est pas son job).
 *
 * Le rôle de l'utilisateur n'est pas connu ici (JWT opaque) : l'enforcement
 * *par rôle* reste assuré par <RequireAuth> dans chaque layout d'acteur.
 *
 * Limitation assumée (V02) : le cookie `access` a un TTL de 15 min. Au-delà
 * d'une inactivité > 15 min, le cookie expire → retour /login. L'utilisateur
 * actif est transparent (l'intercepteur 401→refresh d'api.ts renouvelle le
 * cookie sur les appels data).
 */

const ACCESS_COOKIE = 'access';
const LOGIN_PATH = '/login';

export function middleware(request: NextRequest): NextResponse {
  const { nextUrl, cookies } = request;
  const { pathname, search } = nextUrl;
  const hasAccess = cookies.get(ACCESS_COOKIE) !== undefined;
  const isLoginRoute = pathname === LOGIN_PATH;

  // Déjà authentifié sur /login → on renvoie vers la destination voulue
  // (returnUrl) ou la racine, qui résout le role-home côté client.
  if (isLoginRoute && hasAccess) {
    const target = safeReturnUrl(nextUrl.searchParams.get('returnUrl')) ?? '/';
    return NextResponse.redirect(new URL(target, nextUrl));
  }

  // Route protégée sans cookie → /login en mémorisant la cible.
  if (!isLoginRoute && !hasAccess) {
    const loginUrl = new URL(LOGIN_PATH, nextUrl);
    loginUrl.searchParams.set('returnUrl', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/**
 * Le matcher exclut `/api` (proxifié vers le backend — ne JAMAIS gater, sinon
 * le proxy casse), les internes Next, le favicon, les assets `/brand`, et tout
 * fichier à extension (statics). Le middleware ne tourne donc que sur les
 * routes de pages.
 */
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon|brand|.*\\..*).*)'],
};
