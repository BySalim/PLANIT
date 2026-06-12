import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MaquetteVersionDto } from '@planit/contracts';
import { SemestresView } from './semestres-view';

/**
 * Régression — l'en-tête d'accordéon de semestre ne doit JAMAIS être un
 * `<button>` contenant le bouton « + Ajouter » (rendu en Mode composition,
 * `isEditing=true`). HTML invalide → erreur d'hydratation React. Corrigé en
 * passant l'en-tête à `<div role="button">` (clavier préservé).
 */

function buildVersion(overrides: Partial<MaquetteVersionDto> = {}): MaquetteVersionDto {
  return {
    id: 'v1',
    maquetteId: 'm1',
    anneeAcademiqueId: 'a1',
    modules: [
      {
        id: 'mm1',
        maquetteVersionId: 'v1',
        moduleId: 'mod1',
        module: {
          id: 'mod1',
          code: 'ALGO',
          libelle: 'Algorithmique Avancée',
          color: '#3B82F6',
          ue: {
            id: 'ue1',
            code: 'ALGO-UE',
            libelle: 'Algorithmique & Structures',
            color: '#3B82F6',
          },
        },
        semestre: 1,
        heuresCM: 20,
        heuresTD: 10,
        heuresTP: 6,
        heuresTPE: 14,
        vhe: 36,
        vht: 50,
      },
    ],
    moduleCount: 1,
    classes: [],
    createdAt: '2026-06-02T00:00:00.000Z',
    updatedAt: '2026-06-02T00:00:00.000Z',
    ...overrides,
  };
}

const noop = (): void => {};

describe('SemestresView — Mode composition', () => {
  it('ne produit aucun <button> imbriqué dans un <button> (régression hydratation)', () => {
    const { container } = render(
      <SemestresView
        version={buildVersion()}
        niveau="L3"
        isLoading={false}
        isEditing
        edits={{}}
        onFieldChange={noop}
        onRemoveModule={noop}
        onAddModule={noop}
      />,
    );
    expect(container.querySelectorAll('button button')).toHaveLength(0);
  });

  it("rend l'en-tête de semestre comme bouton accessible (role + aria-expanded)", () => {
    render(
      <SemestresView
        version={buildVersion()}
        niveau="L3"
        isLoading={false}
        isEditing={false}
        edits={{}}
        onFieldChange={noop}
        onRemoveModule={noop}
        onAddModule={noop}
      />,
    );
    // L'en-tête S1 est exposé comme bouton (div role="button") avec aria-expanded.
    const headers = screen.getAllByRole('button', { name: /Semestre/i });
    expect(headers.length).toBeGreaterThan(0);
    expect(headers[0]).toHaveAttribute('aria-expanded');
  });

  it('dérive les libellés de semestre du niveau (L3 → S5/S6)', () => {
    render(
      <SemestresView
        version={buildVersion()}
        niveau="L3"
        isLoading={false}
        isEditing={false}
        edits={{}}
        onFieldChange={noop}
        onRemoveModule={noop}
        onAddModule={noop}
      />,
    );
    expect(screen.getByText('S5')).toBeInTheDocument();
    expect(screen.getByText('S6')).toBeInTheDocument();
    expect(screen.getByText('Semestre 5')).toBeInTheDocument();
  });
});
