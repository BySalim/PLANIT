import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('@/contexts/auth-context', async () => {
  const actual =
    await vi.importActual<typeof import('@/contexts/auth-context')>('@/contexts/auth-context');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

import { useAuth, type AuthMe } from '@/contexts/auth-context';
import { Sidebar } from './sidebar';

const useAuthMock = vi.mocked(useAuth);

function authState(user: AuthMe) {
  return {
    state: { status: 'authenticated' as const, user },
    login: vi.fn(),
    logout: vi.fn(),
  };
}

beforeEach(() => {
  cleanup();
});

describe('Sidebar — variant RP vs AC (LOT 6 G.2)', () => {
  it('rend le menu RP complet pour un RESPONSABLE_PROGRAMME', () => {
    useAuthMock.mockReturnValue(
      authState({
        id: 'rp1',
        email: 'rp@planit',
        role: 'RESPONSABLE_PROGRAMME',
        fullName: 'Aïssatou Diallo',
      }),
    );
    render(<Sidebar />);
    // Items spécifiques RP (OFFRE DE FORMATION) — absents du menu AC.
    expect(screen.getAllByText('Filières').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Formations').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Maquettes de formation').length).toBeGreaterThan(0);
    expect(screen.getAllByText('UE & Modules').length).toBeGreaterThan(0);
    // Profile bloc affiche le vrai user, jamais le hardcoded.
    expect(screen.getByText('Aïssatou Diallo')).toBeTruthy();
    expect(screen.getByText('Responsable de programme')).toBeTruthy();
  });

  it("rend le menu AC strict (8 entrées, pas d'offre de formation) pour un ASSISTANT_PROGRAMME", () => {
    useAuthMock.mockReturnValue(
      authState({
        id: 'ac1',
        email: 'ac@planit',
        role: 'ASSISTANT_PROGRAMME',
        fullName: 'Fatou Sow',
      }),
    );
    render(<Sidebar />);
    // Items AC attendus (V3-D9).
    expect(screen.getAllByText('Tableau de bord').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Planning').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Suivi des modules').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Demandes').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Étudiants').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Classes').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Enseignants').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Salles').length).toBeGreaterThan(0);
    // Items RP-only ABSENTS.
    expect(screen.queryByText('Filières')).toBeNull();
    expect(screen.queryByText('Formations')).toBeNull();
    expect(screen.queryByText('Maquettes de formation')).toBeNull();
    expect(screen.queryByText('UE & Modules')).toBeNull();
    expect(screen.queryByText('Conflits')).toBeNull();
    // Label rôle UI = « Attaché de classe » (jamais « AP »).
    expect(screen.getByText('Attaché de classe')).toBeTruthy();
    expect(screen.queryByText(/\bAP\b/)).toBeNull();
  });

  it('affiche le fallback « … » quand auth en chargement', () => {
    useAuthMock.mockReturnValue({
      state: { status: 'loading' },
      login: vi.fn(),
      logout: vi.fn(),
    });
    render(<Sidebar />);
    // Le bloc profil affiche les fallbacks discrets, pas un faux nom hardcodé.
    expect(screen.queryByText('Aïssatou Diallo')).toBeNull();
    expect(screen.getByText('…')).toBeTruthy();
  });
});
