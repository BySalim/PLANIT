import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PlanningViewGroupDto } from '@planit/contracts';
import { SubViewBar } from './sub-view-bar';
import type { ByEntityColumn } from './planning-grid-by-entity';

const cols: ByEntityColumn[] = [
  { id: 'c1', label: 'GL2-A', badge: 'L2', group: 'L2' },
  { id: 'c2', label: 'GL3-A', badge: 'L3', group: 'L3' },
  { id: 'c3', label: 'GL3-B', badge: 'L3', group: 'L3' },
];

describe('SubViewBar', () => {
  it('rend les presets dérivés du champ group', () => {
    render(
      <SubViewBar
        allCols={cols}
        subView={null}
        onSubView={() => {}}
        savedViews={[]}
        onCreate={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /L2/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /L3/ })).toBeInTheDocument();
  });

  it('toggle un preset remonte la sélection', () => {
    const onSubView = vi.fn();
    render(
      <SubViewBar
        allCols={cols}
        subView={null}
        onSubView={onSubView}
        savedViews={[]}
        onCreate={() => {}}
        onDelete={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /L3/ }));
    expect(onSubView).toHaveBeenCalledWith({ kind: 'preset', key: 'L3' });
  });

  it('rend une vue custom sauvegardée et son bouton supprimer', () => {
    const onDelete = vi.fn();
    const saved: PlanningViewGroupDto[] = [
      { id: 'v1', view: 'classe', name: 'Mes L3', refIds: ['c2', 'c3'] },
    ];
    render(
      <SubViewBar
        allCols={cols}
        subView={null}
        onSubView={() => {}}
        savedViews={saved}
        onCreate={() => {}}
        onDelete={onDelete}
      />,
    );
    expect(screen.getByText('Mes L3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer la vue Mes L3' }));
    expect(onDelete).toHaveBeenCalledWith('v1');
  });

  it('le bouton + ouvre le popover de création', () => {
    render(
      <SubViewBar
        allCols={cols}
        subView={null}
        onSubView={() => {}}
        savedViews={[]}
        onCreate={() => {}}
        onDelete={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Créer une vue personnalisée' }));
    expect(screen.getByRole('button', { name: 'Créer la vue' })).toBeInTheDocument();
  });
});
