import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/auth-context', async () => {
  const actual =
    await vi.importActual<typeof import('@/contexts/auth-context')>('@/contexts/auth-context');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

import { useAuth, type AuthMe } from '@/contexts/auth-context';
import { LogoutFloater } from './logout-floater';

const useAuthMock = vi.mocked(useAuth);

const logoutSpy = vi.fn();

function authState(user: AuthMe) {
  return { state: { status: 'authenticated' as const, user }, login: vi.fn(), logout: logoutSpy };
}

const RP: AuthMe = {
  id: 'rp1',
  email: 'rp@planit',
  role: 'RESPONSABLE_PROGRAMME',
  fullName: 'Aïssatou Diallo',
  ecoleId: 'ecole-ism',
  matricule: null,
};

beforeEach(() => {
  cleanup();
  logoutSpy.mockReset();
  window.localStorage.clear();
});

describe('LogoutFloater', () => {
  it("ne rend rien quand l'utilisateur n'est pas authentifié", () => {
    useAuthMock.mockReturnValue({
      state: { status: 'unauthenticated' },
      login: vi.fn(),
      logout: logoutSpy,
    });
    render(<LogoutFloater />);
    expect(screen.queryByRole('button', { name: 'Se déconnecter' })).toBeNull();
  });

  it('ne rend rien pendant le boot (loading)', () => {
    useAuthMock.mockReturnValue({
      state: { status: 'loading' },
      login: vi.fn(),
      logout: logoutSpy,
    });
    render(<LogoutFloater />);
    expect(screen.queryByRole('button', { name: 'Se déconnecter' })).toBeNull();
  });

  it('rend le bouton flottant quand authentifié', () => {
    useAuthMock.mockReturnValue(authState(RP));
    render(<LogoutFloater />);
    expect(screen.getByRole('button', { name: 'Se déconnecter' })).toBeTruthy();
  });

  it('clic → confirm (nom + email) → Déconnexion appelle logout()', () => {
    useAuthMock.mockReturnValue(authState(RP));
    render(<LogoutFloater />);

    // Pas de confirm avant le clic.
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));

    // Le mini-confirm s'ouvre avec l'identité de l'utilisateur.
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Aïssatou Diallo')).toBeTruthy();
    expect(screen.getByText('rp@planit')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Déconnexion/ }));
    expect(logoutSpy).toHaveBeenCalledTimes(1);
  });

  it('clic puis Annuler ferme le confirm sans déconnecter', () => {
    useAuthMock.mockReturnValue(authState(RP));
    render(<LogoutFloater />);

    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(logoutSpy).not.toHaveBeenCalled();
  });
});
