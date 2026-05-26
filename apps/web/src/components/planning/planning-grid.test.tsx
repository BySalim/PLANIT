import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import type { SessionV2Dto } from '@planit/contracts';
import { PlanningGrid } from './planning-grid';

/**
 * Tests PlanningGrid V2 — rendu de la grille semaine (8h-20h × 7 jours),
 * positionnement vertical d'une séance et état d'erreur. Le drag/drop reste
 * hors périmètre des tests unitaires (couvert au smoke V01).
 */

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const WEEK_START = new Date('2026-05-25T00:00:00.000Z'); // Lundi.

function buildSession(overrides: Partial<SessionV2Dto> = {}): SessionV2Dto {
  return {
    id: 'session-1',
    libelle: 'Algorithmique',
    type: 'COURS',
    sousType: 'CM',
    startAt: '2026-05-26T10:00:00.000Z', // Mardi 10h.
    endAt: '2026-05-26T12:00:00.000Z',
    intervenantNom: null,
    description: null,
    hasUnpublishedChanges: false,
    isPublished: true,
    lastModifiedAt: '2026-05-25T10:00:00.000Z',
    lastPublishedAt: '2026-05-25T10:00:00.000Z',
    module: { id: 'module-1', code: 'ALGO', name: 'Algorithmique' },
    enseignant: { id: 'teacher-1', nomComplet: 'M. Oumar Ndiaye' },
    salle: { id: 'salle-1', name: 'Amphi A' },
    classes: [{ id: 'classe-1', code: 'GL3-A', name: 'GL3-A' }],
    ...overrides,
  };
}

describe('PlanningGrid', () => {
  it("rend l'en-tête des 7 jours de la semaine", () => {
    render(<PlanningGrid weekStart={WEEK_START} sessions={[]} isLoading={false} error={null} />, {
      wrapper,
    });

    expect(screen.getByText(/lundi/i)).toBeInTheDocument();
    expect(screen.getByText(/mardi/i)).toBeInTheDocument();
    expect(screen.getByText(/mercredi/i)).toBeInTheDocument();
    expect(screen.getByText(/jeudi/i)).toBeInTheDocument();
    expect(screen.getByText(/vendredi/i)).toBeInTheDocument();
    expect(screen.getByText(/samedi/i)).toBeInTheDocument();
    expect(screen.getByText(/dimanche/i)).toBeInTheDocument();
  });

  it("rend les libellés d'heure de 8h à 20h (toutes les 2h)", () => {
    render(<PlanningGrid weekStart={WEEK_START} sessions={[]} isLoading={false} error={null} />, {
      wrapper,
    });

    expect(screen.getByText('8h')).toBeInTheDocument();
    expect(screen.getByText('10h')).toBeInTheDocument();
    expect(screen.getByText('20h')).toBeInTheDocument();
  });

  it("n'affiche aucune carte séance quand sessions=[]", () => {
    render(<PlanningGrid weekStart={WEEK_START} sessions={[]} isLoading={false} error={null} />, {
      wrapper,
    });

    expect(screen.queryByRole('button', { name: /Séance/ })).toBeNull();
  });

  it('rend une séance et la positionne au bon top (10h → (10-8)*78 = 156px)', () => {
    render(
      <PlanningGrid
        weekStart={WEEK_START}
        sessions={[buildSession()]}
        isLoading={false}
        error={null}
      />,
      { wrapper },
    );

    // L'aria-label est désormais construit à partir du `libelle` V2 (pas du nom module).
    const button = screen.getByRole('button', { name: /Séance Algorithmique/ });
    const wrap = button.parentElement;
    expect(wrap?.style.top).toBe('156px');
  });

  it("affiche le message d'erreur quand error est fourni", () => {
    render(
      <PlanningGrid
        weekStart={WEEK_START}
        sessions={[]}
        isLoading={false}
        error={new Error('Boom')}
      />,
      { wrapper },
    );

    expect(screen.getByText(/Impossible de charger le planning/i)).toBeInTheDocument();
    expect(screen.getByText('Boom')).toBeInTheDocument();
  });
});
