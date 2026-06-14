import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ClasseV3Dto } from '@planit/contracts';
import { AssignAcModal } from './assign-ac-modal';

// V05 LOT 6 (ADR-0022 §7) — modale Direction d'assignation AC ↔ classes.
// Hooks/mutation mockés (Direction-only en réel).
// Références STABLES (TanStack Query mémoïse `data` en réel) : sinon le
// `useEffect([acClassesQuery.data])` boucle à l'infini sous mock.
vi.mock('@/lib/direction-queries', () => {
  const personnel = {
    data: [
      { id: 'ac1', fullName: 'Awa Touré', role: 'ASSISTANT_PROGRAMME' },
      { id: 'rp1', fullName: 'Aminata Diallo', role: 'RESPONSABLE_PROGRAMME' },
    ],
  };
  const acClasses = { data: { classeIds: ['cl1'] } };
  return {
    usePersonnelQuery: () => personnel,
    useAcClassesQuery: () => acClasses,
  };
});
vi.mock('@/lib/direction-mutations', () => ({
  useSetAcClassesMutation: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ classeIds: [] }),
    isPending: false,
  }),
}));
vi.mock('@/components/ui/toast-provider', () => ({ useToast: () => ({ show: vi.fn() }) }));

function classe(id: string, code: string): ClasseV3Dto {
  return {
    id,
    code,
    name: `Classe ${code}`,
    niveau: 'L3',
    filiere: null,
    formationId: null,
    anneeLibelle: null,
    isDoubleDiplome: false,
    capaciteMax: 30,
    places: { inscrits: 0, capaciteMax: 30 },
    responsable: null,
  };
}

const classes = [classe('cl1', 'GL3-A'), classe('cl2', 'GL3-B')];

describe('AssignAcModal', () => {
  it('liste les AC (pas les RP) puis, après sélection, les classes cochables', () => {
    render(<AssignAcModal isOpen onClose={() => {}} classes={classes} />);
    expect(screen.getByText('Assigner des classes à un AC')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Awa Touré' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Aminata Diallo' })).not.toBeInTheDocument();

    // Tant qu'aucun AC n'est choisi, pas de liste de classes.
    expect(screen.queryByText('GL3-A')).not.toBeInTheDocument();

    // Sélection de l'AC → les classes de l'école apparaissent.
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ac1' } });
    expect(screen.getByText('GL3-A')).toBeInTheDocument();
    expect(screen.getByText('GL3-B')).toBeInTheDocument();
  });

  it('ne rend rien quand fermée', () => {
    render(<AssignAcModal isOpen={false} onClose={() => {}} classes={classes} />);
    expect(screen.queryByText('Assigner des classes à un AC')).not.toBeInTheDocument();
  });
});
