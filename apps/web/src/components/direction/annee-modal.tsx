'use client';

import { useEffect, useState } from 'react';
import type { AnneeAcademiqueDto } from '@planit/contracts';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast-provider';
import { useCreateAnneeMutation, useUpdateAnneeMutation } from '@/lib/direction-mutations';

interface AnneeModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initial?: AnneeAcademiqueDto | undefined;
}

/** ISO (datetime) → valeur d'un <input type="date"> (YYYY-MM-DD). */
function isoToDateInput(iso: string): string {
  return iso.slice(0, 10);
}
/** YYYY-MM-DD → ISO datetime à minuit UTC (Africa/Dakar = UTC+0). */
function dateInputToIso(d: string): string {
  return new Date(`${d}T00:00:00.000Z`).toISOString();
}

/**
 * V05 LOT 7 — création / édition d'une année académique par la Direction.
 * L'état (PLANIFIEE/EN_COURS/CLOTUREE) se gère via « Débuter »/« Clôturer »,
 * pas ici : une année est toujours créée PLANIFIEE.
 */
export function AnneeModal({ isOpen, onClose, mode, initial }: AnneeModalProps) {
  const toast = useToast();
  const createMutation = useCreateAnneeMutation();
  const updateMutation = useUpdateAnneeMutation();
  const isEdit = mode === 'edit';

  const [libelle, setLibelle] = useState('');
  const [debut, setDebut] = useState('');
  const [fin, setFin] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (isEdit && initial) {
      setLibelle(initial.libelle);
      setDebut(isoToDateInput(initial.debut));
      setFin(isoToDateInput(initial.fin));
    } else {
      setLibelle('');
      setDebut('');
      setFin('');
    }
    setError(null);
  }, [isOpen, isEdit, initial]);

  const pending = createMutation.isPending || updateMutation.isPending;

  async function handleSubmit() {
    if (libelle.trim() === '' || debut === '' || fin === '') {
      setError('Libellé, date de début et date de fin sont requis.');
      return;
    }
    if (new Date(fin) <= new Date(debut)) {
      setError('La date de fin doit être postérieure à la date de début.');
      return;
    }
    try {
      if (isEdit && initial) {
        await updateMutation.mutateAsync({
          id: initial.id,
          dto: { libelle: libelle.trim(), debut: dateInputToIso(debut), fin: dateInputToIso(fin) },
        });
        toast.show('Année mise à jour.', { variant: 'success' });
      } else {
        await createMutation.mutateAsync({
          libelle: libelle.trim(),
          debut: dateInputToIso(debut),
          fin: dateInputToIso(fin),
          etat: 'PLANIFIEE',
        });
        toast.show('Année planifiée.', { variant: 'success' });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Modifier l'année académique" : 'Planifier une année académique'}
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void handleSubmit()}
            disabled={pending}
          >
            {isEdit ? 'Enregistrer' : 'Planifier'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormField label="Libellé" required>
          {({ id, 'aria-describedby': describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              placeholder="Ex. 2025-2026"
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
            />
          )}
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Début" required>
            {({ id }) => (
              <Input id={id} type="date" value={debut} onChange={(e) => setDebut(e.target.value)} />
            )}
          </FormField>
          <FormField label="Fin" required>
            {({ id }) => (
              <Input id={id} type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
            )}
          </FormField>
        </div>
        {error !== null ? (
          <div className="rounded-lg bg-err-100 px-4 py-2 text-sm text-err">{error}</div>
        ) : null}
      </div>
    </Modal>
  );
}
