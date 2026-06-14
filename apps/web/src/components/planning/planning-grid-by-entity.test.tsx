import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SessionV2Dto } from '@planit/contracts';
import { PlanningGridByEntity } from './planning-grid-by-entity';

vi.mock('@/lib/mutations-v2', () => ({
  useUpdateSessionV2Mutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

const DAY = new Date('2026-05-26T00:00:00.000Z'); // mardi

function session(overrides: Partial<SessionV2Dto> = {}): SessionV2Dto {
  return {
    id: 'sess-1',
    libelle: 'Algorithmique',
    type: 'COURS',
    sousType: 'CM',
    startAt: '2026-05-26T10:00:00.000Z',
    endAt: '2026-05-26T12:00:00.000Z',
    intervenantNom: null,
    description: null,
    hasUnpublishedChanges: false,
    isPublished: true,
    lastModifiedAt: '2026-05-26T09:00:00.000Z',
    lastPublishedAt: '2026-05-26T09:00:00.000Z',
    module: { id: 'm1', code: 'ALGO', name: 'Algorithmique', color: '#2563EB' },
    enseignant: { id: 'e1', nomComplet: 'Dr Sow' },
    salle: { id: 's1', name: 'Amphi A' },
    classes: [{ id: 'c1', code: 'M1 IA', name: 'Master 1 IA' }],
    ownerRpId: 'rp-1',
    ownerRpName: 'Mme Diallo',
    masked: false,
    ...overrides,
  };
}

describe('PlanningGridByEntity', () => {
  it('rend une colonne par entité et place la séance dans sa colonne', () => {
    render(
      <PlanningGridByEntity
        dimension="classe"
        day={DAY}
        columns={[
          { id: 'c1', label: 'M1 IA' },
          { id: 'c2', label: 'M2 IA' },
        ]}
        sessions={[session()]}
        isLoading={false}
      />,
    );
    // 'M1 IA' apparaît 2× : en-tête de colonne + chip de la carte placée dans cette colonne.
    expect(screen.getAllByText('M1 IA').length).toBeGreaterThanOrEqual(2);
    // 'M2 IA' n'a aucune séance → seul l'en-tête de colonne le rend.
    expect(screen.getByText('M2 IA')).toBeInTheDocument();
    expect(screen.getByText('Algorithmique')).toBeInTheDocument();
  });

  it('état vide quand aucune colonne', () => {
    render(
      <PlanningGridByEntity
        dimension="salle"
        day={DAY}
        columns={[]}
        sessions={[]}
        isLoading={false}
      />,
    );
    expect(screen.getByText(/Aucun référentiel/)).toBeInTheDocument();
  });

  it('rend une séance masquée en « Occupé » sans détail', () => {
    render(
      <PlanningGridByEntity
        dimension="salle"
        day={DAY}
        columns={[{ id: 's1', label: 'Amphi A' }]}
        sessions={[
          session({ masked: true, module: null, enseignant: null, classes: [], libelle: '' }),
        ]}
        isLoading={false}
      />,
    );
    expect(screen.getByText('Occupé')).toBeInTheDocument();
    expect(screen.queryByText('Algorithmique')).not.toBeInTheDocument();
  });
});
