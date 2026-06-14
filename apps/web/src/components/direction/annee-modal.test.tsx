import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AnneeAcademiqueDto } from '@planit/contracts';
import { AnneeModal } from './annee-modal';

const createAsync = vi.fn().mockResolvedValue({});
const updateAsync = vi.fn().mockResolvedValue({});
vi.mock('@/lib/direction-mutations', () => ({
  useCreateAnneeMutation: () => ({ mutateAsync: createAsync, isPending: false }),
  useUpdateAnneeMutation: () => ({ mutateAsync: updateAsync, isPending: false }),
}));
vi.mock('@/components/ui/toast-provider', () => ({ useToast: () => ({ show: vi.fn() }) }));

describe('AnneeModal', () => {
  it('création : titre, saisie, soumission → createMutation', async () => {
    render(<AnneeModal isOpen onClose={() => {}} mode="create" />);
    expect(screen.getByText('Planifier une année académique')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Ex. 2025-2026'), {
      target: { value: '2030-2031' },
    });
    const dates = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dates[0]!, { target: { value: '2030-09-01' } });
    fireEvent.change(dates[1]!, { target: { value: '2031-06-30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Planifier' }));

    await waitFor(() => expect(createAsync).toHaveBeenCalled());
    expect(createAsync.mock.calls[0]![0]).toMatchObject({
      libelle: '2030-2031',
      etat: 'PLANIFIEE',
    });
  });

  it('édition : préremplit le libellé', () => {
    const initial: AnneeAcademiqueDto = {
      id: 'a1',
      libelle: '2025-2026',
      debut: '2025-09-01T00:00:00.000Z',
      fin: '2026-06-30T00:00:00.000Z',
      etat: 'PLANIFIEE',
    };
    render(<AnneeModal isOpen onClose={() => {}} mode="edit" initial={initial} />);
    expect(screen.getByText("Modifier l'année académique")).toBeInTheDocument();
    expect(screen.getByDisplayValue('2025-2026')).toBeInTheDocument();
  });

  it('refuse une fin antérieure au début', () => {
    render(<AnneeModal isOpen onClose={() => {}} mode="create" />);
    fireEvent.change(screen.getByPlaceholderText('Ex. 2025-2026'), { target: { value: 'X' } });
    const dates = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dates[0]!, { target: { value: '2030-09-01' } });
    fireEvent.change(dates[1]!, { target: { value: '2030-08-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Planifier' }));
    expect(screen.getByText(/postérieure à la date de début/)).toBeInTheDocument();
  });
});
