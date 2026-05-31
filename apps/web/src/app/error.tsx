'use client';

/**
 * Error boundary de segment (App Router) — capture toute erreur de rendu ou de
 * données non gérée dans l'arbre sous `app/`. Évite l'écran blanc : affiche un
 * repli on-brand avec une action « Réessayer » (reset) et un retour accueil.
 *
 * Observabilité V02 / Phase 0 (cf. ADR-0009) : pas encore de report distant.
 * Le branchement Sentry / endpoint backend est la Phase 1 (tech-debt TD-OBS-SINK).
 */
import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// eslint-disable-next-line no-restricted-syntax -- error.tsx exige un export par défaut (convention App Router)
export default function Error({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Phase 1 (ADR-0009) : reporter `error` (+ `error.digest`) vers Sentry ou un
    // endpoint backend. En Phase 0, on ne loggue pas en console (lint no-console) —
    // l'overlay Next.js affiche déjà la stack en développement.
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full bg-err-100 text-err"
        aria-hidden="true"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>

      <h1 className="text-xl font-semibold text-text">Une erreur est survenue</h1>
      <p className="max-w-md text-sm text-text-muted">
        Un problème inattendu s&apos;est produit. Tu peux réessayer ; si le problème persiste,
        reviens à l&apos;accueil.
      </p>
      {error.digest ? <p className="text-xs text-text-muted">Code&nbsp;: {error.digest}</p> : null}

      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          Réessayer
        </button>
        <Link
          href="/"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-bg"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
