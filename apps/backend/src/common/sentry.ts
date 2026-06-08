import * as Sentry from '@sentry/node';
import type { NodeOptions } from '@sentry/node';

/**
 * Error tracking Sentry — **dormant par défaut** (ADR-0009 Phase 1).
 * Init UNIQUEMENT si `SENTRY_DSN` est présent : en dev / CI / local sans DSN,
 * tout est no-op. « Set up once » : le jour où Salim crée le projet Sentry,
 * il suffit de poser `SENTRY_DSN` dans `.env.prod` — aucun code à changer.
 * GlitchTip self-host = swap (même SDK, autre DSN).
 */
let enabled = false;

export function initSentry(): boolean {
  const dsn = process.env['SENTRY_DSN'];
  if (dsn === undefined || dsn === '') {
    return false;
  }
  const options: NodeOptions = {
    dsn,
    environment: process.env['NODE_ENV'] ?? 'production',
    // Pas d'APM/tracing pour l'instant (Phase 3) — error tracking seul.
    tracesSampleRate: 0,
  };
  const release = process.env['SENTRY_RELEASE'];
  if (release !== undefined && release !== '') {
    options.release = release;
  }
  Sentry.init(options);
  enabled = true;
  return true;
}

export function isSentryEnabled(): boolean {
  return enabled;
}

/**
 * Reporte une exception à Sentry avec le contexte de la requête (corrélation via
 * `requestId`). No-op si Sentry n'est pas initialisé.
 */
export function captureBackendException(
  exception: unknown,
  context: {
    requestId?: string | undefined;
    path?: string | undefined;
    method?: string | undefined;
    statusCode?: number | undefined;
  },
): void {
  if (!enabled) {
    return;
  }
  Sentry.withScope((scope) => {
    if (context.requestId !== undefined) {
      scope.setTag('requestId', context.requestId);
    }
    scope.setContext('request', { ...context });
    Sentry.captureException(exception);
  });
}
