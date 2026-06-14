import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlanningToolbar } from './planning-toolbar';

// Le picker de référentiel consomme ces hooks (RP-only en réel) — mockés ici.
vi.mock('@/lib/queries-v2', () => ({
  useClassesQuery: () => ({ data: [{ id: 'c1', code: 'M1 IA', name: 'M1 IA' }] }),
  useSallesQuery: () => ({ data: [{ id: 's1', name: 'Amphi A' }] }),
  useEnseignantsQuery: () => ({ data: [{ id: 'e1', nomComplet: 'Dr Sow' }] }),
}));

const baseProps = {
  weekStart: new Date('2026-05-25T00:00:00.000Z'),
  onWeekChange: vi.fn(),
  viewMode: 'classique' as const,
  onViewModeChange: vi.fn(),
  referentielId: '',
  onReferentielChange: vi.fn(),
  onCreateSession: vi.fn(),
  canUndo: true,
  canRedo: false,
  onUndo: vi.fn(),
  onRedo: vi.fn(),
  onExport: vi.fn(),
  isExporting: false,
};

describe('PlanningToolbar', () => {
  it('mode RP (éditable) : undo/redo + référentiel (onglets + valeur) présents', () => {
    render(<PlanningToolbar {...baseProps} readOnly={false} />);
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refaire' })).toBeInTheDocument();
    // tablist des modes de référentiel présent
    expect(screen.getByRole('tablist', { name: 'Mode de vue planning' })).toBeInTheDocument();
    // « Mon espace » apparaît à la fois en onglet et en chip de valeur.
    expect(screen.getAllByText('Mon espace').length).toBeGreaterThan(0);
    expect(screen.getByRole('tab', { name: 'Mon espace' })).toBeInTheDocument();
  });

  it('mode lecture seule (AC/Direction) : pas d’undo/redo ni de référentiel', () => {
    render(<PlanningToolbar {...baseProps} readOnly />);
    expect(screen.queryByRole('button', { name: 'Annuler' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tablist', { name: 'Mode de vue planning' })).not.toBeInTheDocument();
    expect(screen.queryAllByText('Mon espace')).toHaveLength(0);
  });
});
