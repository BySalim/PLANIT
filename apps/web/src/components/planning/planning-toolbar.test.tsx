import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlanningToolbar } from './planning-toolbar';

// Le combobox référentiel consomme ces hooks (RP-only en réel) — mockés ici.
vi.mock('@/lib/queries-v2', () => ({
  useClassesQuery: () => ({ data: [{ id: 'c1', code: 'M1 IA', name: 'Master 1 IA' }] }),
  useSallesQuery: () => ({ data: [{ id: 's1', name: 'Amphi A' }] }),
  useEnseignantsQuery: () => ({ data: [{ id: 'e1', nomComplet: 'Dr Sow', specialite: 'IA' }] }),
}));

const baseProps = {
  weekStart: new Date('2026-05-25T00:00:00.000Z'),
  onWeekChange: vi.fn(),
  viewMode: 'classique' as const,
  onViewModeChange: vi.fn(),
  classicDim: 'classe' as const,
  classicId: 'c1',
  onClassicChange: vi.fn(),
  activeDay: 0,
  onDayChange: vi.fn(),
  onCreateSession: vi.fn(),
  canUndo: true,
  canRedo: false,
  onUndo: vi.fn(),
  onRedo: vi.fn(),
  onExport: vi.fn(),
  isExporting: false,
};

describe('PlanningToolbar', () => {
  it('mode RP / Classique : undo/redo, onglets, combobox référentiel (valeur courante)', () => {
    render(<PlanningToolbar {...baseProps} readOnly={false} />);
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refaire' })).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: 'Mode de vue planning' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Classique' })).toBeInTheDocument();
    // Le combobox affiche la classe sélectionnée.
    expect(screen.getByText('M1 IA')).toBeInTheDocument();
  });

  it('vue by-X (Classe) : sélecteur de jour affiché', () => {
    render(<PlanningToolbar {...baseProps} viewMode="classe" readOnly={false} />);
    expect(screen.getByLabelText('Jour affiché')).toBeInTheDocument();
  });

  it('mode lecture seule : pas d’undo/redo ni d’onglets', () => {
    render(<PlanningToolbar {...baseProps} readOnly />);
    expect(screen.queryByRole('button', { name: 'Annuler' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tablist', { name: 'Mode de vue planning' })).not.toBeInTheDocument();
  });
});
