import type { NextConfig } from 'next';

// CSP pragmatique pour PLANIT.
// - Next.js + React 19 hydratent via des <script> inline → `'unsafe-inline'`
//   reste requis sur `script-src` tant qu'on n'a pas migré vers nonce-based
//   (chantier séparé, trace : TD-LH-CSP-NONCE à créer si besoin).
// - Le `connect-src` autorise localhost:3001 pour le dev/local (backend HTTP
//   et WebSocket). En prod l'origine viendra de NEXT_PUBLIC_API_BASE — la
//   politique reste compatible (le scheme/host correspondant doit être
//   ajouté lors du déploiement, cf. TD futur sur la CSP prod).
// - `object-src 'none'` + `base-uri 'self'` + `frame-ancestors 'none'` :
//   blocage anti-XSS / clickjacking exigé par Lighthouse `csp-xss`.
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob:",
  "connect-src 'self' http://localhost:3001 ws://localhost:3001 wss://localhost:3001",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Workspace packages shipped as TypeScript source must be transpiled by Next.
  transpilePackages: ['@planit/ui', '@planit/design-tokens', '@planit/contracts', '@planit/utils'],
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
