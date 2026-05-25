import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SessionDto } from '@planit/contracts';
import { SessionCard } from './session-card';

/**
 * Tests for SessionCard — vérifie le rendu des infos principales et l'indicateur
 * visuel "non publié" (présent uniquement quand isPublished === false).
 */

function buildSession(overrides: Partial<SessionDto> = {}): SessionDto {
  return {
    id: 'session-1',
    type: 'CM',
    status: 'PROVISOIRE',
    startAt: '2026-05-25T10:00:00.000Z',
    endAt: '2026-05-25T12:00:00.000Z',
    isPublished: false,
    lastModifiedAt: '2026-05-25T10:00:00.000Z',
    lastPublishedAt: null,
    classe: { id: 'classe-1', code: 'GL3-A', name: 'Génie Logiciel 3 A' },
    module: { id: 'module-1', code: 'ALGO', name: 'Algorithmique' },
    salle: { id: 'salle-1', name: 'Amphi A' },
    teacher: { id: 'teacher-1', fullName: 'M. Oumar Ndiaye' },
    ...overrides,
  };
}

describe('SessionCard', () => {
  it("affiche le nom du module, le code de classe et l'enseignant", () => {
    render(<SessionCard session={buildSession()} />);

    expect(screen.getByText('Algorithmique')).toBeInTheDocument();
    expect(screen.getByText('GL3-A')).toBeInTheDocument();
    expect(screen.getByText('M. Oumar Ndiaye')).toBeInTheDocument();
    expect(screen.getByText('Amphi A')).toBeInTheDocument();
  });

  it("affiche le libellé de catégorie pour un cours (CM/TD/TP → 'Cours')", () => {
    render(<SessionCard session={buildSession({ type: 'CM' })} />);
    expect(screen.getByText('Cours')).toBeInTheDocument();
  });

  it("affiche le libellé 'Eval' pour une évaluation", () => {
    render(<SessionCard session={buildSession({ type: 'EXAM' })} />);
    expect(screen.getByText('Eval')).toBeInTheDocument();
  });

  it("ajoute le suffixe '(non publiée)' à l'aria-label quand isPublished=false", () => {
    render(<SessionCard session={buildSession({ isPublished: false })} />);

    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toMatch(/non publiée/);
  });

  it("n'ajoute PAS le suffixe '(non publiée)' quand isPublished=true", () => {
    render(<SessionCard session={buildSession({ isPublished: true })} />);

    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).not.toMatch(/non publiée/);
  });

  it("affiche un marqueur 'Modifications non publiées' quand isPublished=false", () => {
    const { container } = render(<SessionCard session={buildSession({ isPublished: false })} />);

    const marker = container.querySelector('[title="Modifications non publiées"]');
    expect(marker).not.toBeNull();
  });

  it("n'affiche PAS le marqueur 'Modifications non publiées' quand isPublished=true", () => {
    const { container } = render(<SessionCard session={buildSession({ isPublished: true })} />);

    const marker = container.querySelector('[title="Modifications non publiées"]');
    expect(marker).toBeNull();
  });
});
