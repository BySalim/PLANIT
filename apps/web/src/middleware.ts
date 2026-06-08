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

/**
 * Rideau **basic-auth beta** (V4-D16, 5.3) — actif **uniquement** si
 * `BETA_BASIC_AUTH` (`user:pass`) est défini dans l'environnement. Inerte en
 * dev et sur la VM self-host (variable absente). Couvre **toutes** les routes
 * matchées, `/api` compris, pour que l'instance beta publique (Vercel) ne soit
 * pas ouverte aux visiteurs anonymes.
 *
 * ⚠️ Ce n'est **pas** la frontière de sécurité : le backend Koyeb garde ses
 * guards JWT (fail-closed), et son URL directe ne transite pas par ce rideau.
 * C'est un simple verrou « pas d'accès public » sur le front beta. Hand-rolled
 * (0 dépendance ; `atob` est fourni par le runtime edge).
 */
function betaBasicAuthChallenge(request: NextRequest): NextResponse | null {
  const expected = process.env.BETA_BASIC_AUTH;
  if (!expected) return null; // gate désactivé (dev / VM)

  const header = request.headers.get('authorization');
  if (header?.startsWith('Basic ')) {
    let decoded = '';
    try {
      decoded = atob(header.slice('Basic '.length));
    } catch {
      decoded = '';
    }
    if (decoded === expected) return null; // autorisé
  }

  return new NextResponse('Accès beta protégé.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="PLANIT beta", charset="UTF-8"',
      'Cache-Control': 'no-store',
    },
  });
}

export function middleware(request: NextRequest): NextResponse {
  // 0. Rideau beta — avant tout le reste, sur toutes les routes matchées
  //    (/api inclus). Inerte si BETA_BASIC_AUTH n'est pas défini.
  const challenge = betaBasicAuthChallenge(request);
  if (challenge) return challenge;

  const { nextUrl, cookies } = request;
  const { pathname, search } = nextUrl;

  // 1. `/api` est proxifié vers le backend (rewrite next.config) : une fois le
  //    rideau beta passé, on laisse filer. SURTOUT pas de redirection /login ici
  //    (un appel XHR `/api/...` redirigé en HTML casserait le client).
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const hasAccess = cookies.get(ACCESS_COOKIE) !== undefined;
  const isLoginRoute = pathname === LOGIN_PATH;

  // 2. Déjà authentifié sur /login → on renvoie vers la destination voulue
  //    (returnUrl) ou la racine, qui résout le role-home côté client.
  if (isLoginRoute && hasAccess) {
    const target = safeReturnUrl(nextUrl.searchParams.get('returnUrl')) ?? '/';
    return NextResponse.redirect(new URL(target, nextUrl));
  }

  // 3. Route protégée sans cookie → /login en mémorisant la cible.
  if (!isLoginRoute && !hasAccess) {
    const loginUrl = new URL(LOGIN_PATH, nextUrl);
    loginUrl.searchParams.set('returnUrl', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/**
 * Le matcher **inclut désormais `/api`** (pour que le rideau beta le couvre) ;
 * le gating optimiste, lui, l'ignore via l'early-return ci-dessus. On exclut les
 * internes Next, le favicon, les assets `/brand`, et tout fichier à extension
 * (statics). Le middleware ne tourne donc que sur les routes de pages + `/api`.
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon|brand|.*\\..*).*)'],
};
