'use client';

/**
 * Global error boundary (App Router) — dernier rempart : capture les erreurs qui
 * surviennent dans le root layout lui-même. Doit rendre ses propres <html>/<body>.
 *
 * Styles en inline volontairement : ce composant peut s'afficher alors que le
 * pipeline CSS (Tailwind + tokens) n'est pas garanti chargé (échec très précoce).
 * Les valeurs littérales sont justifiées par ce cas limite — exception assumée à
 * la règle « pas de hex en dur ». Repli neutre, sobre, lisible.
 *
 * Report distant Sentry (ADR-0009 Phase 1) — **dormant** sans `NEXT_PUBLIC_SENTRY_DSN`.
 */
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// eslint-disable-next-line no-restricted-syntax -- global-error.tsx exige un export par défaut (convention App Router)
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#f8fafc',
          color: '#0f172a',
        }}
      >
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            padding: '1.5rem',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Erreur critique</h1>
          <p style={{ maxWidth: '28rem', fontSize: '0.875rem', color: '#475569', margin: 0 }}>
            L&apos;application a rencontré une erreur critique. Recharge la page&nbsp;; si le
            problème persiste, réessaie plus tard.
          </p>
          {error.digest ? (
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
              Code&nbsp;: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '0.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: '#4f46e5',
              color: '#ffffff',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Recharger
          </button>
        </div>
      </body>
    </html>
  );
}
