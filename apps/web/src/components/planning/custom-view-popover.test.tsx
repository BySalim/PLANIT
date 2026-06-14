import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CustomViewPopover } from './custom-view-popover';
import type { ByEntityColumn } from './planning-grid-by-entity';

const cols: ByEntityColumn[] = [
  { id: 'c1', label: 'GL2-A', badge: 'L2' },
  { id: 'c2', label: 'GL3-A', badge: 'L3' },
];

describe('CustomViewPopover', () => {
  it('ajoute des références et crée la vue (nom + refIds ordonnés)', () => {
    const onCreate = vi.fn();
    render(<CustomViewPopover allCols={cols} onClose={() => {}} onCreate={onCreate} />);

    // Ajout depuis la liste « Disponibles » dans l'ordre.
    fireEvent.click(screen.getByRole('button', { name: /GL2-A/ }));
    fireEvent.click(screen.getByRole('button', { name: /GL3-A/ }));

    fireEvent.change(screen.getByLabelText('Nom de la vue'), { target: { value: 'Sélection' } });
    fireEvent.click(screen.getByRole('button', { name: 'Créer la vue' }));

    expect(onCreate).toHaveBeenCalledWith('Sélection', ['c1', 'c2']);
  });

  it('désactive « Créer la vue » tant qu’aucune référence n’est sélectionnée', () => {
    render(<CustomViewPopover allCols={cols} onClose={() => {}} onCreate={() => {}} />);
    expect(screen.getByRole('button', { name: 'Créer la vue' })).toBeDisabled();
  });

  it('retire une référence sélectionnée', () => {
    const onCreate = vi.fn();
    render(<CustomViewPopover allCols={cols} onClose={() => {}} onCreate={onCreate} />);
    fireEvent.click(screen.getByRole('button', { name: /GL2-A/ }));
    // Retire GL2-A → plus de sélection → bouton désactivé.
    fireEvent.click(screen.getByRole('button', { name: 'Retirer GL2-A' }));
    expect(screen.getByRole('button', { name: 'Créer la vue' })).toBeDisabled();
  });
});
