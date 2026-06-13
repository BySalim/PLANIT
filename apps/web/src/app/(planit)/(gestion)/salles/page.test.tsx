import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SalleDto } from '@planit/contracts';
import SallesPage from './page';

// Shell tire la Sidebar (→ useAuth/AuthProvider) : passthrough pour isoler la vue.
vi.mock('@/components/layout/shell', () => ({
  Shell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

// V05 LOT 6 (ADR-0022 §5) — vue Salles RP : badge « subjective », bouton de
// création, suppression. On mocke les hooks (rôle RP) pour rendre la page seule.
vi.mock('@/hooks/use-role', () => ({
  useIsRp: () => true,
  useIsAc: () => false,
  useIsDirection: () => false,
}));
vi.mock('@/hooks/use-ac-scope', () => ({
  useAcScope: () => ({ data: undefined, isLoading: false }),
}));

const salles: SalleDto[] = [
  {
    id: 's1',
    name: 'Amphi A',
    type: 'Amphi',
    capacity: 120,
    rpResponsable: null,
    isSubjective: false,
  },
  {
    id: 's2',
    name: 'Salle projet (hypothétique)',
    type: 'Salle de cours',
    capacity: 20,
    rpResponsable: null,
    isSubjective: true,
  },
];
vi.mock('@/lib/queries-v3', () => ({
  useSallesFullQuery: () => ({ data: salles, isLoading: false, isError: false }),
}));
const deleteMutate = vi.fn();
vi.mock('@/lib/mutations-v3', () => ({
  useCreateSubjectiveSalleMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteSubjectiveSalleMutation: () => ({ mutate: deleteMutate, isPending: false }),
}));
vi.mock('@/components/ui/toast-provider', () => ({ useToast: () => ({ show: vi.fn() }) }));

describe('SallesPage (vue RP) — salles subjectives', () => {
  it('affiche le badge « Subjective » + le bouton de création ; la commune en badge', () => {
    render(<SallesPage />);
    expect(screen.getByRole('button', { name: '+ Salle subjective' })).toBeInTheDocument();
    expect(screen.getByText('Subjective')).toBeInTheDocument();
    // La salle normale sans responsable est marquée « Commune ».
    expect(screen.getByText('Commune')).toBeInTheDocument();
  });

  it('demande confirmation avant de supprimer une salle subjective', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<SallesPage />);
    fireEvent.click(screen.getByRole('button', { name: /supprimer/i }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(deleteMutate).toHaveBeenCalledWith({ id: 's2' });
    confirmSpy.mockRestore();
  });

  it('ouvre la modale de création de salle subjective', () => {
    render(<SallesPage />);
    fireEvent.click(screen.getByRole('button', { name: '+ Salle subjective' }));
    expect(screen.getByText('Créer une salle subjective')).toBeInTheDocument();
  });
});
