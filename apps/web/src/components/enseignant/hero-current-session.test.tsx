import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SessionDto } from '@planit/contracts';
import { HeroCurrentSession } from './hero-current-session';

/**
 * Tests for HeroCurrentSession — vérifie l'affichage de la séance en cours,
 * du fallback "Aucune séance en cours" et de la mention "Prochaine séance"
 * quand une séance future existe.
 */

const FIXED_NOW = new Date('2026-05-25T10:30:00.000Z');

function buildSession(overrides: Partial<SessionDto> = {}): SessionDto {
  return {
    id: 'session-1',
    type: 'CM',
    status: 'PUBLIE',
    startAt: '2026-05-25T10:00:00.000Z',
    endAt: '2026-05-25T12:00:00.000Z',
    isPublished: true,
    lastModifiedAt: '2026-05-25T10:00:00.000Z',
    lastPublishedAt: '2026-05-25T10:00:00.000Z',
    classe: { id: 'classe-1', code: 'GL3-A', name: 'Génie Logiciel 3 A' },
    module: { id: 'module-1', code: 'ALGO', name: 'Algorithmique' },
    salle: { id: 'salle-1', name: 'Amphi A' },
    teacher: { id: 'teacher-1', fullName: 'M. Oumar Ndiaye' },
    ...overrides,
  };
}

describe('HeroCurrentSession — séance en cours', () => {
  it('affiche le nom du module, la salle et le badge "En cours"', () => {
    render(<HeroCurrentSession sessions={[buildSession()]} now={FIXED_NOW} />);

    expect(screen.getByText('Algorithmique')).toBeInTheDocument();
    expect(screen.getByText('Amphi A')).toBeInTheDocument();
    expect(screen.getByText(/En cours/)).toBeInTheDocument();
  });

  it("affiche le badge classe en variant 'teacher'", () => {
    render(<HeroCurrentSession sessions={[buildSession()]} now={FIXED_NOW} variant="teacher" />);
    expect(screen.getByText('GL3-A')).toBeInTheDocument();
  });

  it("affiche le nom du prof en variant 'student' (et pas le badge classe)", () => {
    render(<HeroCurrentSession sessions={[buildSession()]} now={FIXED_NOW} variant="student" />);
    expect(screen.getByText('M. Oumar Ndiaye')).toBeInTheDocument();
    expect(screen.queryByText('GL3-A')).toBeNull();
  });

  it("expose une progressbar reflétant l'avancement de la séance", () => {
    // FIXED_NOW (10:30) sur une séance 10:00 → 12:00 ⇒ ~25 %.
    render(<HeroCurrentSession sessions={[buildSession()]} now={FIXED_NOW} />);

    const progress = screen.getByRole('progressbar');
    expect(progress.getAttribute('aria-valuenow')).toBe('25');
  });
});

describe('HeroCurrentSession — pas de séance en cours', () => {
  it('affiche "Aucune séance en cours" quand la liste est vide', () => {
    render(<HeroCurrentSession sessions={[]} now={FIXED_NOW} />);

    expect(screen.getByText('Aucune séance en cours')).toBeInTheDocument();
  });

  it('mentionne la prochaine séance quand une séance future existe', () => {
    const next = buildSession({
      id: 'next',
      startAt: '2026-05-25T14:00:00.000Z',
      endAt: '2026-05-25T16:00:00.000Z',
      module: { id: 'module-2', code: 'BDD', name: 'Bases de Données' },
      salle: { id: 'salle-2', name: 'Salle 201' },
    });

    render(<HeroCurrentSession sessions={[next]} now={FIXED_NOW} />);

    expect(screen.getByText('Aucune séance en cours')).toBeInTheDocument();
    expect(screen.getByText(/Prochaine séance/i)).toBeInTheDocument();
    expect(screen.getByText('Bases de Données')).toBeInTheDocument();
  });

  it("affiche le message 'pas d'autre séance' quand seule une séance passée existe", () => {
    const past = buildSession({
      id: 'past',
      startAt: '2026-05-25T08:00:00.000Z',
      endAt: '2026-05-25T09:00:00.000Z',
    });

    render(<HeroCurrentSession sessions={[past]} now={FIXED_NOW} />);

    expect(screen.getByText('Aucune séance en cours')).toBeInTheDocument();
    expect(screen.getByText(/Pas d'autre séance/i)).toBeInTheDocument();
  });
});
