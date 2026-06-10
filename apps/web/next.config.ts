import path from 'node:path';
import type { NextConfig } from 'next';

// CSP pragmatique pour PLANIT.
// - Next.js + React 19 hydratent via des <script> inline → `'unsafe-inline'`
//   reste requis sur `script-src` tant qu'on n'a pas migré vers nonce-based
//   (chantier séparé, trace : TD-LH-CSP-NONCE à créer si besoin).
// - **`'unsafe-eval'` UNIQUEMENT en dev** : le bundler de Next dev (webpack,
//   `devtool: eval-source-map`) enveloppe chaque module client dans `eval()`.
//   Sans cette directive en dev, le navigateur bloque l'exécution → React
//   n'hydrate JAMAIS → app entièrement non-interactive (login, effets, etc.).
//   En prod, pas d'eval : on garde la CSP stricte validée par Lighthouse.
// - Le `connect-src` autorise localhost:3001 pour le dev/local (backend HTTP
//   et WebSocket). En prod l'origine viendra de NEXT_PUBLIC_API_BASE — la
//   politique reste compatible (le scheme/host correspondant doit être
//   ajouté lors du déploiement, cf. TD futur sur la CSP prod).
// - `object-src 'none'` + `base-uri 'self'` + `frame-ancestors 'none'` :
//   blocage anti-XSS / clickjacking exigé par Lighthouse `csp-xss`.
const isDev = process.env.NODE_ENV !== 'production';
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";
// Origine d'ingestion Sentry dérivée du DSN (lu au BUILD via NEXT_PUBLIC_SENTRY_DSN,
// build arg de l'image web). Le navigateur POST ses events sur cet hôte → il DOIT
// figurer dans `connect-src`, sinon la CSP bloque l'envoi (cf. instrumentation-client.ts).
// Vide si pas de DSN → CSP stricte inchangée (Lighthouse `csp-xss`). On dérive
// l'origine exacte (pas de wildcard `*.sentry.io`).
function sentryConnectSrc(): string {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (dsn === undefined || dsn === '') return '';
  try {
    return ` ${new URL(dsn).origin}`;
  } catch {
    return '';
  }
}

// En dev, le front parle au backend direct sur :3001 (HTTP + WS). En prod, Caddy
// sert front + API + WebSocket sur la **même origine** → `'self'` suffit. Un WS
// sur un hôte distinct devra être ajouté ici (cf. TD CSP prod, ADR-0013).
const connectSrc = isDev
  ? `connect-src 'self' http://localhost:3001 ws://localhost:3001 wss://localhost:3001${sentryConnectSrc()}`
  : `connect-src 'self'${sentryConnectSrc()}`;
const CSP_DIRECTIVES = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob:",
  connectSrc,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

// Origine du backend NestJS visée par le proxy `/api` (dev). En prod, Caddy
// joue ce rôle (cf. infra/caddy/Caddyfile.dev) — front et API sont servis sur
// la même origine. On reproduit ce modèle en dev pour que les cookies d'auth
// HttpOnly soient *first-party* sur localhost:3000 (sinon, en cross-origin
// direct vers :3001, leur persistance/lecture par le middleware est fragile).
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Build conteneurisé (V04 LOT 1.2) : `standalone` émet un serveur Node autonome
  // (`.next/standalone/.../server.js`) avec un node_modules minimal tracé — pas
  // besoin d'embarquer tout le workspace dans l'image runtime.
  output: 'standalone',
  // En monorepo, le tracing des fichiers doit partir de la **racine** du repo
  // (sinon les packages workspace `@planit/*` ne sont pas inclus dans standalone).
  outputFileTracingRoot: path.join(__dirname, '../../'),
  // Workspace packages shipped as TypeScript source must be transpiled by Next.
  transpilePackages: ['@planit/ui', '@planit/design-tokens', '@planit/contracts', '@planit/utils'],
  // Warning webpack « Critical dependency » émis par require-in-the-middle
  // (OpenTelemetry, embarqué par @sentry/nextjs côté serveur). Connu et bénin :
  // l'instrumentation patche require() dynamiquement, webpack ne peut pas le
  // tracer statiquement. On le masque pour garder un boot dev lisible.
  webpack: (config: { ignoreWarnings?: unknown[] }) => {
    config.ignoreWarnings = [...(config.ignoreWarnings ?? []), { module: /require-in-the-middle/ }];
    return config;
  },
  // Redirections des anciennes URLs à nom d'acteur (`/rp`, `/enseignant`,
  // `/etudiant`…) vers les URLs role-agnostiques (V03-01). 308 permanent : pas
  // de 404 sur les bookmarks / liens existants après le refactor. Exécutées
  // AVANT le middleware (ordre de routing Next), donc un returnUrl legacy
  // (`?returnUrl=/rp`) atterrit bien sur `/` après login.
  async redirects() {
    return [
      { source: '/rp', destination: '/', permanent: true },
      { source: '/rp/enseignants', destination: '/enseignants', permanent: true },
      { source: '/rp/filieres', destination: '/filieres', permanent: true },
      { source: '/rp/ue-modules', destination: '/ue-modules', permanent: true },
      { source: '/enseignant', destination: '/', permanent: true },
      { source: '/etudiant', destination: '/', permanent: true },
      { source: '/enseignant/planning', destination: '/planning', permanent: true },
      { source: '/etudiant/planning', destination: '/planning', permanent: true },
      { source: '/enseignant/seance/:id', destination: '/seance/:id', permanent: true },
      { source: '/etudiant/seance/:id', destination: '/seance/:id', permanent: true },
    ];
  },
  // Proxy same-origin : toute requête `/api/*` du front est relayée vers le
  // backend. Next forwarde `Set-Cookie`/`Cookie`, donc le cookie d'auth est
  // posé et lu comme first-party. `middleware.ts` peut alors le voir.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${BACKEND_ORIGIN}/api/:path*` }];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: CSP_DIRECTIVES },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};

export default nextConfig;
