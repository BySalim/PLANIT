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
  nomComplet: z.string(),
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
    fetch(`${API_BASE}/auth/me`, { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) {
          dispatch({ type: 'CLEAR_USER' });
          return;
        }
        const raw: unknown = await r.json();
        const parsed = authMeSchema.safeParse(raw);
        dispatch(parsed.success ? { type: 'SET_USER', user: parsed.data } : { type: 'CLEAR_USER' });
      })
      .catch(() => dispatch({ type: 'CLEAR_USER' }));
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
    // Le backend retourne { user: AuthMeDto } (cf. A.1)
    const parsed = z.object({ user: authMeSchema }).safeParse(raw);
    if (!parsed.success) throw new Error('Réponse inattendue du serveur');

    dispatch({ type: 'SET_USER', user: parsed.data.user });
    return parsed.data.user;
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
