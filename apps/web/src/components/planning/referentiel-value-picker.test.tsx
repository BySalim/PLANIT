import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReferentielValuePicker } from './referentiel-value-picker';

// V05 LOT 6 (ADR-0022 §4) — le picker contextuel du référentiel planning.
// Les hooks de listes sont mockés (RP-only en réel) : on teste le rendu par mode.
vi.mock('@/lib/queries-v2', () => ({
  useClassesQuery: () => ({ data: [{ id: 'c1', code: 'M1 IA', name: 'M1 IA' }] }),
  useSallesQuery: () => ({ data: [{ id: 's1', name: 'Amphi A' }] }),
  useEnseignantsQuery: () => ({ data: [{ id: 'e1', nomComplet: 'Dr Sow' }] }),
}));

describe('ReferentielValuePicker', () => {
  it('mode « Mon espace » : libellé statique, aucun select', () => {
    render(<ReferentielValuePicker mode="classique" value="" onChange={() => {}} />);
    expect(screen.getByText('Mon espace')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('mode Classe : liste les classes', () => {
    render(<ReferentielValuePicker mode="classe" value="" onChange={() => {}} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'M1 IA' })).toBeInTheDocument();
  });

  it('mode Salle : liste les salles', () => {
    render(<ReferentielValuePicker mode="salle" value="" onChange={() => {}} />);
    expect(screen.getByRole('option', { name: 'Amphi A' })).toBeInTheDocument();
  });

  it('mode Enseignant : liste les enseignants', () => {
    render(<ReferentielValuePicker mode="prof" value="" onChange={() => {}} />);
    expect(screen.getByRole('option', { name: 'Dr Sow' })).toBeInTheDocument();
  });
});
