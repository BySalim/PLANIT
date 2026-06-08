import * as Sentry from '@sentry/nextjs';

/**
 * Init Sentry côté serveur/edge (Next 15 instrumentation hook). **Dormant** :
 * n'initialise rien sans DSN. ADR-0009 Phase 1.
 */
export async function register(): Promise<void> {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (dsn === undefined || dsn === '') {
    return;
  }
  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0,
    });
  }
}

// Capture des erreurs de rendu serveur (App Router) — no-op si Sentry off.
export const onRequestError = Sentry.captureRequestError;
