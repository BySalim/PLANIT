import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/contexts/auth-context', () => ({
  useAuth: vi.fn(),
}));

import { useAuth, type AuthMe } from '@/contexts/auth-context';
import { useRole, useIsAc, useIsRp, useIsAuthenticated, roleLabel } from '../use-role';

const useAuthMock = vi.mocked(useAuth);

function buildUser(role: AuthMe['role']): AuthMe {
  return { id: 'u', email: 'x@y', role, fullName: 'N', ecoleId: null, matricule: null };
}

describe('useRole (et useIs*)', () => {
  it('retourne null quand non authentifié', () => {
    useAuthMock.mockReturnValue({
      state: { status: 'unauthenticated' },
      login: vi.fn(),
      logout: vi.fn(),
    });
    const { result } = renderHook(() => useRole());
    expect(result.current).toBeNull();
  });

  it('retourne le rôle quand authentifié', () => {
    useAuthMock.mockReturnValue({
      state: { status: 'authenticated', user: buildUser('ASSISTANT_PROGRAMME') },
      login: vi.fn(),
      logout: vi.fn(),
    });
    const { result } = renderHook(() => useRole());
    expect(result.current).toBe('ASSISTANT_PROGRAMME');
  });

  it('useIsAc true pour ASSISTANT_PROGRAMME, false sinon', () => {
    useAuthMock.mockReturnValue({
      state: { status: 'authenticated', user: buildUser('ASSISTANT_PROGRAMME') },
      login: vi.fn(),
      logout: vi.fn(),
    });
    expect(renderHook(() => useIsAc()).result.current).toBe(true);

    useAuthMock.mockReturnValue({
      state: { status: 'authenticated', user: buildUser('RESPONSABLE_PROGRAMME') },
      login: vi.fn(),
      logout: vi.fn(),
    });
    expect(renderHook(() => useIsAc()).result.current).toBe(false);

    useAuthMock.mockReturnValue({
      state: { status: 'loading' },
      login: vi.fn(),
      logout: vi.fn(),
    });
    expect(renderHook(() => useIsAc()).result.current).toBe(false);
  });

  it('useIsRp true pour RESPONSABLE_PROGRAMME, false sinon', () => {
    useAuthMock.mockReturnValue({
      state: { status: 'authenticated', user: buildUser('RESPONSABLE_PROGRAMME') },
      login: vi.fn(),
      logout: vi.fn(),
    });
    expect(renderHook(() => useIsRp()).result.current).toBe(true);

    useAuthMock.mockReturnValue({
      state: { status: 'authenticated', user: buildUser('ASSISTANT_PROGRAMME') },
      login: vi.fn(),
      logout: vi.fn(),
    });
    expect(renderHook(() => useIsRp()).result.current).toBe(false);
  });

  it('useIsAuthenticated reflète state.status', () => {
    useAuthMock.mockReturnValue({
      state: { status: 'authenticated', user: buildUser('ETUDIANT') },
      login: vi.fn(),
      logout: vi.fn(),
    });
    expect(renderHook(() => useIsAuthenticated()).result.current).toBe(true);

    useAuthMock.mockReturnValue({
      state: { status: 'unauthenticated' },
      login: vi.fn(),
      logout: vi.fn(),
    });
    expect(renderHook(() => useIsAuthenticated()).result.current).toBe(false);
  });
});

describe('roleLabel', () => {
  it('mappe chaque rôle au libellé UI attendu (jamais « AP »)', () => {
    expect(roleLabel('RESPONSABLE_PROGRAMME')).toBe('Responsable de programme');
    expect(roleLabel('ASSISTANT_PROGRAMME')).toBe('Attaché de classe');
    expect(roleLabel('ENSEIGNANT')).toBe('Enseignant·e');
    expect(roleLabel('ETUDIANT')).toBe('Étudiant·e');
    expect(roleLabel('RESPONSABLE_CLASSE')).toBe('Délégué·e');
    expect(roleLabel('SUPER_ADMIN')).toBe('Super administrateur·rice');
    expect(roleLabel('ADMIN')).toBe('Administrateur·rice');
    expect(roleLabel('DIRECTION')).toBe('Direction');
    expect(roleLabel('PARTENAIRE')).toBe('Partenaire');
  });

  it('ne contient jamais « AP » (alias interdit V3-D9)', () => {
    const all = [
      'RESPONSABLE_PROGRAMME',
      'ASSISTANT_PROGRAMME',
      'ENSEIGNANT',
      'ETUDIANT',
      'RESPONSABLE_CLASSE',
    ] as const;
    for (const r of all) {
      expect(roleLabel(r)).not.toMatch(/\bAP\b/);
    }
  });
});
