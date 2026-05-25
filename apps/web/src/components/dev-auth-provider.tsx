'use client';

/**
 * STUB V02 — DevAuthProvider
 *
 * Bloque le rendu de l'app tant que l'auto-login dev (cf. `lib/dev-auth.ts`)
 * n'a pas posé un cookie d'auth valide. Affiche un état de chargement minimal
 * pendant la requête, ou un état d'erreur si le backend est indisponible.
 *
 * À SUPPRIMER au merge du LOT 6 (Oumy remplace par store auth + page /login
 * + composant <RequireAuth>).
 */

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ensureDevAuth } from '@/lib/dev-auth';

type AuthState = 'pending' | 'ready' | 'error';

export function DevAuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<AuthState>('pending');

  useEffect(() => {
    let cancelled = false;
    setState('pending');

    void ensureDevAuth(pathname).then((ok) => {
      if (cancelled) return;
      setState(ok ? 'ready' : 'error');
    });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (state === 'pending') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-app text-sm text-text-muted">
        Connexion en cours…
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-bg-app px-6 text-center">
        <p className="text-base font-semibold text-err">Backend indisponible.</p>
        <p className="text-sm text-text-muted">
          Démarre le backend (<code>pnpm dev</code>) puis recharge la page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
