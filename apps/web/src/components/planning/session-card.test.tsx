import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SessionV2Dto } from '@planit/contracts';
import { SessionCard } from './session-card';

/**
 * Tests SessionCard V2 — rendu des champs principaux + indicateur de
 * modifications non publiées (R.8, piloté par `hasUnpublishedChanges`).
 */

function buildSession(overrides: Partial<SessionV2Dto> = {}): SessionV2Dto {
  return {
    id: 'session-1',
    libelle: 'Cours Algorithmique',
    type: 'COURS',
    sousType: 'CM',
    startAt: '2026-05-25T10:00:00.000Z',
    endAt: '2026-05-25T12:00:00.000Z',
    intervenantNom: null,
    description: null,
    hasUnpublishedChanges: false,
    isPublished: true,
    lastModifiedAt: '2026-05-25T10:00:00.000Z',
    lastPublishedAt: '2026-05-25T10:00:00.000Z',
    module: { id: 'module-1', code: 'ALGO', name: 'Algorithmique' },
    enseignant: { id: 'teacher-1', nomComplet: 'M. Oumar Ndiaye' },
    salle: { id: 'salle-1', name: 'Amphi A' },
    classes: [{ id: 'classe-1', code: 'GL3-A', name: 'Génie Logiciel 3 A' }],
    ...overrides,
  };
}

describe('SessionCard', () => {
  it("affiche le libellé, le code de classe et l'enseignant", () => {
    render(<SessionCard session={buildSession()} />);

    expect(screen.getByText('Cours Algorithmique')).toBeInTheDocument();
    expect(screen.getByText('GL3-A')).toBeInTheDocument();
    expect(screen.getByText('M. Oumar Ndiaye')).toBeInTheDocument();
    expect(screen.getByText('Amphi A')).toBeInTheDocument();
  });

  it("affiche le libellé de catégorie 'Cours' pour un type COURS", () => {
    render(<SessionCard session={buildSession({ type: 'COURS' })} />);
    expect(screen.getByText('Cours')).toBeInTheDocument();
  });

  it("affiche le libellé 'Eval' pour une évaluation", () => {
    render(<SessionCard session={buildSession({ type: 'EVALUATION', sousType: 'EXAMEN' })} />);
    expect(screen.getByText('Eval')).toBeInTheDocument();
  });

  it("affiche '+N' quand la séance concerne plusieurs classes", () => {
    render(
      <SessionCard
        session={buildSession({
          classes: [
            { id: 'c1', code: 'GL3-A', name: 'Génie Logiciel 3 A' },
            { id: 'c2', code: 'GL3-B', name: 'Génie Logiciel 3 B' },
            { id: 'c3', code: 'GL3-C', name: 'Génie Logiciel 3 C' },
          ],
        })}
      />,
    );
    expect(screen.getByText('GL3-A +2')).toBeInTheDocument();
  });

  it("affiche l'intervenant à la place du prof pour un EVENEMENT", () => {
    render(
      <SessionCard
        session={buildSession({
          type: 'EVENEMENT',
          sousType: null,
          module: null,
          enseignant: null,
          intervenantNom: 'M. Diop (invité)',
        })}
      />,
    );
    expect(screen.getByText('M. Diop (invité)')).toBeInTheDocument();
  });

  it("ajoute le suffixe 'modifications non publiées' à l'aria-label quand hasUnpublishedChanges=true", () => {
    render(<SessionCard session={buildSession({ hasUnpublishedChanges: true })} />);

    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toMatch(/modifications non publiées/);
  });

  it("n'ajoute PAS le suffixe quand hasUnpublishedChanges=false", () => {
    render(<SessionCard session={buildSession({ hasUnpublishedChanges: false })} />);

    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).not.toMatch(/non publiées/);
  });

  it('affiche le marqueur visuel quand hasUnpublishedChanges=true', () => {
    const { container } = render(
      <SessionCard session={buildSession({ hasUnpublishedChanges: true })} />,
    );
    const marker = container.querySelector('[title="Modifications non publiées"]');
    expect(marker).not.toBeNull();
  });

  it("n'affiche PAS le marqueur quand hasUnpublishedChanges=false", () => {
    const { container } = render(
      <SessionCard session={buildSession({ hasUnpublishedChanges: false })} />,
    );
    const marker = container.querySelector('[title="Modifications non publiées"]');
    expect(marker).toBeNull();
  });
});
