'use client';

import { useEffect, useMemo, useState } from 'react';
import { type Niveau, createFormationSchema } from '@planit/contracts';
import { formationCode } from '@planit/utils';
import { Modal } from '@/components/ui/modal';
import { FormField } from '@/components/ui/form-field';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useFilieresQuery } from '@/lib/queries';
import { useAnneesQuery } from '@/lib/queries-v3';
import { useCreateFormationMutation } from '@/lib/mutations-v3';

const NIVEAUX: readonly Niveau[] = ['L1', 'L2', 'L3', 'M1', 'M2'] as const;

export type FormationModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

/**
 * Modal de **création** d'une formation (ADR-0018). Le RP choisit seulement
 * **filière + niveau** ; le `code` est dérivé et prévisualisé, et la maquette
 * `(filière, niveau)` + sa version pour l'année courante sont créées ou
 * **renouvelées** automatiquement côté serveur. Aucune édition : tout le reste
 * est dérivé/figé après création.
 */
export function FormationModal({ isOpen, onClose }: FormationModalProps) {
  const filieresQuery = useFilieresQuery();
  const anneesQuery = useAnneesQuery();
  const createMutation = useCreateFormationMutation();

  const [niveau, setNiveau] = useState<Niveau>('L1');
  const [filiereId, setFiliereId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const filieres = filieresQuery.data ?? [];
  // Mémoïsé : `?? []` crée une nouvelle ref à chaque rendu (deps du useMemo).
  const annees = useMemo(() => anneesQuery.data ?? [], [anneesQuery.data]);
  const currentYear = useMemo(() => annees.find((a) => a.etat === 'EN_COURS') ?? null, [annees]);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setNiveau('L1');
    setFiliereId('');
  }, [isOpen]);

  const selectedFiliere = filieres.find((f) => f.id === filiereId) ?? null;

  // Aperçu du code dérivé — identique au calcul backend (helper partagé).
  const codePreview =
    selectedFiliere !== null && currentYear !== null
      ? formationCode({
          sigle: selectedFiliere.sigle,
          niveau,
          anneeLibelle: currentYear.libelle,
        })
      : null;

  const isPending = createMutation.isPending;

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    if (currentYear === null) {
      setError("Aucune année académique en cours, créez-la d'abord.");
      return;
    }
    const parsed = createFormationSchema.safeParse({ niveau, filiereId });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Formulaire invalide');
      return;
    }
    try {
      await createMutation.mutateAsync(parsed.data);
      onClose();
    } catch {
      // flash géré par la mutation
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nouvelle formation"
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isPending}>
            Annuler
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            form="formation-form"
            disabled={isPending || filiereId === '' || currentYear === null}
          >
            Créer
          </Button>
        </>
      }
    >
      <form id="formation-form" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <FormField label="Filière" required>
          {({ id, 'aria-describedby': describedBy }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              value={filiereId}
              onChange={(e) => setFiliereId(e.target.value)}
            >
              <option value="">Choisir une filière</option>
              {filieres.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.sigle} · {f.libelle}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField label="Niveau" required>
          {({ id, 'aria-describedby': describedBy }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              value={niveau}
              onChange={(e) => setNiveau(e.target.value as Niveau)}
            >
              {NIVEAUX.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        {codePreview !== null && (
          <div className="flex items-center justify-between rounded-lg border border-border-soft bg-bg px-3 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Code
            </span>
            <span className="font-mono text-[13px] font-semibold text-primary">{codePreview}</span>
          </div>
        )}

        {error !== null ? (
          <div className="rounded-lg bg-err-100 px-4 py-2 text-sm text-err">{error}</div>
        ) : null}
      </form>
    </Modal>
  );
}
