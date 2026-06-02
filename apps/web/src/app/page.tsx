'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, ROLE_HOME } from '@/contexts/auth-context';

/**
 * Racine `/` — résolveur de destination selon le rôle.
 *
 * Le `middleware.ts` garantit qu'on n'atteint `/` qu'avec un cookie d'auth
 * présent ; mais le rôle (donc la home cible) n'est connu que côté client via
 * `/auth/me`. On lit donc `useAuth()` et on redirige vers la home du rôle dès
 * que l'identité est résolue. Le cas `unauthenticated` est un simple filet
 * (le middleware a normalement déjà redirigé vers /login).
 */
// Next.js App Router requires default export for page
// eslint-disable-next-line no-restricted-syntax
export default function RootPage() {
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (state.status === 'authenticated') {
      router.replace(ROLE_HOME[state.user.role] ?? '/login');
    } else if (state.status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [state, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
    </div>
  );
}
