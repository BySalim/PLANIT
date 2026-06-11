import * as Sentry from '@sentry/nextjs';

/**
 * Init Sentry côté navigateur (App Router, Next 15.3 `instrumentation-client`).
 * **Dormant** : n'initialise rien sans `NEXT_PUBLIC_SENTRY_DSN`. ADR-0009 Phase 1.
 *
 * ⚠️ Quand le DSN sera posé en prod : ajouter l'hôte d'ingestion Sentry au
 * `connect-src` de la CSP (next.config.ts) — sinon le navigateur bloque l'envoi.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn !== undefined && dsn !== '') {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    // Error tracking seul pour l'instant (pas d'APM/tracing → Phase 3).
    tracesSampleRate: 0,
  });
}
