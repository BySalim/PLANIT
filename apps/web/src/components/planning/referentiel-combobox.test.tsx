import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReferentielCombobox } from './referentiel-combobox';

vi.mock('@/lib/queries-v2', () => ({
  useClassesQuery: () => ({ data: [{ id: 'c1', code: 'M1 IA', name: 'Master 1 IA' }] }),
  useSallesQuery: () => ({ data: [{ id: 's1', name: 'Amphi A' }] }),
  useEnseignantsQuery: () => ({ data: [{ id: 'e1', nomComplet: 'Dr Sow', specialite: 'IA' }] }),
}));

describe('ReferentielCombobox', () => {
  it('affiche la dimension + la valeur sélectionnée sur le bouton', () => {
    render(<ReferentielCombobox dim="classe" value="c1" onChange={() => {}} />);
    expect(screen.getByText('Classe')).toBeInTheDocument();
    expect(screen.getByText('M1 IA')).toBeInTheDocument();
    // Popover fermé : pas de recherche.
    expect(screen.queryByPlaceholderText('Rechercher…')).not.toBeInTheDocument();
  });

  it('ouvre le popover, change de sous-onglet et sélectionne une salle', () => {
    const onChange = vi.fn();
    render(<ReferentielCombobox dim="classe" value="c1" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Classe/ }));
    expect(screen.getByPlaceholderText('Rechercher…')).toBeInTheDocument();
    // Sous-onglet Salle.
    fireEvent.click(screen.getByRole('button', { name: 'Salle' }));
    fireEvent.click(screen.getByRole('option', { name: /Amphi A/ }));
    expect(onChange).toHaveBeenCalledWith('salle', 's1');
  });

  it('filtre la liste par recherche', () => {
    render(<ReferentielCombobox dim="prof" value="e1" onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Enseignant/ }));
    fireEvent.change(screen.getByPlaceholderText('Rechercher…'), { target: { value: 'zzz' } });
    expect(screen.getByText('Aucun résultat.')).toBeInTheDocument();
  });
});
