'use client';

import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react';
import { z } from '@planit/contracts';
import { API_BASE } from '@/lib/api';

const authMeSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.enum([
    'RESPONSABLE_PROGRAMME',
    'ENSEIGNANT',
    'ETUDIANT',
    'ASSISTANT_PROGRAMME',
    'RESPONSABLE_CLASSE',
  ]),
  fullName: z.string(),
});

// Schéma local en attente de @planit/contracts v2 (Salim, 0.4)
export type AuthMe = z.infer<typeof authMeSchema>;
export type UserRole = AuthMe['role'];

type AuthState =
  | { readonly status: 'loading' }
  | { readonly status: 'authenticated'; readonly user: AuthMe }
  | { readonly status: 'unauthenticated' };

type AuthAction = { type: 'SET_USER'; user: AuthMe } | { type: 'CLEAR_USER' };

function authReducer(_state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_USER':
      return { status: 'authenticated', user: action.user };
    case 'CLEAR_USER':
      return { status: 'unauthenticated' };
  }
}

interface AuthContextValue {
  readonly state: AuthState;
  login: (email: string, password: string) => Promise<AuthMe>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, { status: 'loading' } as AuthState);

  useEffect(() => {
    // AbortController : annule le fetch en vol au démontage du Provider.
    // Sans ça, en environnement de test (jsdom) où le composant est démonté
    // avant la résolution, `dispatch` est appelé après tear-down → React 19
    // lève `ReferenceError: window is not defined` (cf. CI logs PR #35).
    //
    // IMPORTANT (StrictMode dev) : on **ne** conditionne **pas** le chemin de
    // succès à un flag `cancelled` que le cleanup mettrait à `true`. Sous le
    // double-invoke StrictMode (setup → cleanup → setup), le 1er fetch peut
    // résoudre juste après que le cleanup ait posé `cancelled=true`, et son
    // handler serait alors skippé → l'app reste bloquée en `loading`. À la
    // place : tout fetch qui résout dispatche ; on n'ignore QUE les rejets
    // dus à l'abort (via `signal.aborted`). Le proxy same-origin (rapide) a
    // révélé cette race ; le fetch survivant (2e mount) dispatche toujours.
    const controller = new AbortController();

    fetch(`${API_BASE}/auth/me`, { credentials: 'include', signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) {
          dispatch({ type: 'CLEAR_USER' });
          return;
        }
        const raw: unknown = await r.json();
        const parsed = authMeSchema.safeParse(raw);
        dispatch(parsed.success ? { type: 'SET_USER', user: parsed.data } : { type: 'CLEAR_USER' });
      })
      .catch(() => {
        // Abort (cleanup/unmount) → on ne touche pas au state. Toute autre
        // erreur (réseau, backend down) → non authentifié.
        if (controller.signal.aborted) return;
        dispatch({ type: 'CLEAR_USER' });
      });

    return () => {
      controller.abort();
    };
  }, []);

  const login = async (email: string, password: string): Promise<AuthMe> => {
    const r = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (!r.ok) {
      const detail: unknown = await r.json().catch(() => ({}));
      const message =
        typeof detail === 'object' &&
        detail !== null &&
        'message' in detail &&
        typeof (detail as { message: unknown }).message === 'string'
          ? (detail as { message: string }).message
          : 'Identifiants incorrects';
      throw new Error(message);
    }

    const raw: unknown = await r.json();
    // Le backend `POST /auth/login` retourne directement l'`AuthMeDto`
    // (cf. apps/backend/src/auth/auth.controller.ts → `return user`), pas un
    // wrapper `{ user }`. Les cookies access+refresh sont posés en HttpOnly.
    const parsed = authMeSchema.safeParse(raw);
    if (!parsed.success) throw new Error('Réponse inattendue du serveur');

    dispatch({ type: 'SET_USER', user: parsed.data });
    return parsed.data;
  };

  const logout = async (): Promise<void> => {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(
      () => {},
    );
    dispatch({ type: 'CLEAR_USER' });
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  return <AuthContext.Provider value={{ state, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}

export const ROLE_HOME: Record<UserRole, string> = {
  RESPONSABLE_PROGRAMME: '/rp',
  ASSISTANT_PROGRAMME: '/rp',
  ENSEIGNANT: '/enseignant',
  ETUDIANT: '/etudiant',
  RESPONSABLE_CLASSE: '/etudiant',
};
