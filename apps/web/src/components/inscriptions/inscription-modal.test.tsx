import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EtudiantLookupDto } from '@planit/contracts';
import { apiGet } from '@/lib/api';
import { InscriptionModal } from './inscription-modal';

// Le flux email → lookup → existant/nouveau est la logique la plus à risque du
// LOT 4 : on isole le composant en mockant l'API et la mutation.
vi.mock('@/lib/api', () => ({ apiGet: vi.fn() }));

const mutateAsync = vi.fn().mockResolvedValue({});
vi.mock('@/lib/mutations-v3', () => ({
  useCreateInscriptionMutation: () => ({ mutateAsync, isPending: false }),
}));

const apiGetMock = vi.mocked(apiGet);

function lookup(found: EtudiantLookupDto): Promise<EtudiantLookupDto> {
  return Promise.resolve(found);
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('InscriptionModal — flux email', () => {
  it('email connu → étape confirmation avec le nom de l’étudiant', async () => {
    apiGetMock.mockReturnValueOnce(
      lookup({
        found: true,
        etudiant: { id: 'e1', nomComplet: 'Awa Diop', email: 'awa@ism.edu.sn', matricule: 'ISM-1' },
      }),
    );

    render(<InscriptionModal isOpen onClose={vi.fn()} classeId="c1" />);

    fireEvent.change(screen.getByPlaceholderText('ex. awa.diop@ism.edu.sn'), {
      target: { value: 'awa@ism.edu.sn' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Rechercher' }));

    expect(await screen.findByText('Awa Diop')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inscrire' })).toBeInTheDocument();
  });

  it('email inconnu → étape nouvel étudiant (nom + matricule)', async () => {
    apiGetMock.mockReturnValueOnce(lookup({ found: false, etudiant: null }));

    render(<InscriptionModal isOpen onClose={vi.fn()} classeId="c1" />);

    fireEvent.change(screen.getByPlaceholderText('ex. awa.diop@ism.edu.sn'), {
      target: { value: 'inconnu@ism.edu.sn' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Rechercher' }));

    expect(await screen.findByText('Nom complet')).toBeInTheDocument();
    expect(screen.getByText('Matricule')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Créer et inscrire' })).toBeInTheDocument();
  });

  it('email invalide → message d’erreur, pas d’appel API', async () => {
    render(<InscriptionModal isOpen onClose={vi.fn()} classeId="c1" />);

    fireEvent.change(screen.getByPlaceholderText('ex. awa.diop@ism.edu.sn'), {
      target: { value: 'pas-un-email' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Rechercher' }));

    expect(await screen.findByText('Adresse email invalide.')).toBeInTheDocument();
    expect(apiGetMock).not.toHaveBeenCalled();
  });
});
