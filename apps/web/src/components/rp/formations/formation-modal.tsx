'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  type FormationDto,
  type Niveau,
  createFormationSchema,
  updateFormationSchema,
} from '@planit/contracts';
import { Modal } from '@/components/ui/modal';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useFilieresQuery } from '@/lib/queries';
import { useAnneesQuery, useMaquettesQuery, useMaquetteVersionsQuery } from '@/lib/queries-v3';
import { useCreateFormationMutation, useUpdateFormationMutation } from '@/lib/mutations-v3';

const NIVEAUX: readonly Niveau[] = ['L1', 'L2', 'L3', 'M1', 'M2'] as const;

export type FormationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initial?: FormationDto | undefined;
};

/**
 * Modal Formation. État contrôlé local (et non react-hook-form) à cause des
 * **selects dépendants** maquette → version : `watch`/`setValue` RHF seraient
 * plus verbeux ici. La validation reste portée par les schémas Zod de
 * `@planit/contracts` (safeParse au submit).
 *
 * - **Création** : code · niveau · filière · maquette → version (année courante
 *   par défaut) · double-diplôme. `anneeAcademiqueId` résolu côté serveur.
 * - **Édition** : code · double-diplôme uniquement. Niveau / filière / version
 *   sont figés et affichés en lecture seule (changer la version d'une formation
 *   existante = opération avancée hors périmètre LOT 4).
 */
export function FormationModal({ isOpen, onClose, mode, initial }: FormationModalProps) {
  const isEdit = mode === 'edit';

  const filieresQuery = useFilieresQuery();
  const maquettesQuery = useMaquettesQuery();
  const anneesQuery = useAnneesQuery();
  const createMutation = useCreateFormationMutation();
  const updateMutation = useUpdateFormationMutation();

  const [code, setCode] = useState('');
  const [niveau, setNiveau] = useState<Niveau>('L1');
  const [filiereId, setFiliereId] = useState('');
  const [maquetteId, setMaquetteId] = useState('');
  const [versionId, setVersionId] = useState('');
  const [isDoubleDiplome, setIsDoubleDiplome] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const versionsQuery = useMaquetteVersionsQuery(maquetteId === '' ? null : maquetteId);

  const filieres = filieresQuery.data ?? [];
  // Mémoïsé : `?? []` crée une nouvelle ref à chaque rendu, ce qui
  // déstabiliserait les deps des hooks ci-dessous.
  const annees = useMemo(() => anneesQuery.data ?? [], [anneesQuery.data]);
  const currentYearId = useMemo(
    () => annees.find((a) => a.etat === 'EN_COURS')?.id ?? null,
    [annees],
  );

  // Maquettes éligibles : même filière + même niveau que la formation visée.
  const eligibleMaquettes = useMemo(
    () =>
      (maquettesQuery.data ?? []).filter((m) => m.filiereId === filiereId && m.niveau === niveau),
    [maquettesQuery.data, filiereId, niveau],
  );

  const versions = useMemo(() => versionsQuery.data ?? [], [versionsQuery.data]);

  // (Ré)initialisation à l'ouverture.
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (isEdit && initial !== undefined) {
      setCode(initial.code);
      setNiveau(initial.niveau);
      setFiliereId(initial.filiereId);
      setMaquetteId('');
      setVersionId(initial.maquetteVersionId);
      setIsDoubleDiplome(initial.isDoubleDiplome);
    } else {
      setCode('');
      setNiveau('L1');
      setFiliereId('');
      setMaquetteId('');
      setVersionId('');
      setIsDoubleDiplome(false);
    }
  }, [isOpen, isEdit, initial]);

  // Changer de maquette réinitialise la version choisie ; on présélectionne la
  // version de l'année courante si elle existe (création).
  function handleMaquetteChange(nextMaquetteId: string) {
    setMaquetteId(nextMaquetteId);
    setVersionId('');
  }

  useEffect(() => {
    if (isEdit || maquetteId === '' || versions.length === 0) return;
    const current = currentYearId
      ? versions.find((v) => v.anneeAcademiqueId === currentYearId)
      : undefined;
    setVersionId((prev) => (prev === '' ? (current?.id ?? versions[0]?.id ?? '') : prev));
  }, [isEdit, maquetteId, versions, currentYearId]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);

    if (isEdit && initial !== undefined) {
      const parsed = updateFormationSchema.safeParse({ code, isDoubleDiplome });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? 'Formulaire invalide');
        return;
      }
      try {
        await updateMutation.mutateAsync({ id: initial.id, body: parsed.data });
        onClose();
      } catch {
        // flash géré par la mutation
      }
      return;
    }

    const parsed = createFormationSchema.safeParse({
      code,
      niveau,
      filiereId,
      maquetteVersionId: versionId,
      isDoubleDiplome,
    });
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
      title={isEdit ? `Modifier ${initial?.code ?? 'la formation'}` : 'Nouvelle formation'}
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
            disabled={isPending}
          >
            {isEdit ? 'Enregistrer' : 'Créer'}
          </Button>
        </>
      }
    >
      <form id="formation-form" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <FormField label="Code" required>
          {({ id, 'aria-describedby': describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              placeholder="ex. L3-INFO-2026"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          )}
        </FormField>

        {isEdit && initial !== undefined ? (
          <div className="rounded-lg border border-border-soft bg-bg px-3 py-2 text-xs text-text-muted">
            Niveau <span className="font-semibold text-text-sec">{initial.niveau}</span> · filière{' '}
            <span className="font-semibold text-text-sec">{initial.filiere?.sigle ?? '—'}</span> ·
            maquette figée. Ces champs ne sont pas modifiables après création.
          </div>
        ) : (
          <>
            <FormField label="Niveau" required>
              {({ id, 'aria-describedby': describedBy }) => (
                <Select
                  id={id}
                  aria-describedby={describedBy}
                  value={niveau}
                  onChange={(e) => {
                    setNiveau(e.target.value as Niveau);
                    setMaquetteId('');
                    setVersionId('');
                  }}
                >
                  {NIVEAUX.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>

            <FormField label="Filière" required>
              {({ id, 'aria-describedby': describedBy }) => (
                <Select
                  id={id}
                  aria-describedby={describedBy}
                  value={filiereId}
                  onChange={(e) => {
                    setFiliereId(e.target.value);
                    setMaquetteId('');
                    setVersionId('');
                  }}
                >
                  <option value="">— Choisir une filière —</option>
                  {filieres.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.sigle} · {f.libelle}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>

            <FormField
              label="Maquette"
              required
              hint={
                filiereId !== '' && eligibleMaquettes.length === 0
                  ? 'Aucune maquette pour cette filière et ce niveau. Créez-la depuis la page Maquettes.'
                  : undefined
              }
            >
              {({ id, 'aria-describedby': describedBy }) => (
                <Select
                  id={id}
                  aria-describedby={describedBy}
                  value={maquetteId}
                  disabled={filiereId === '' || eligibleMaquettes.length === 0}
                  onChange={(e) => handleMaquetteChange(e.target.value)}
                >
                  <option value="">— Choisir une maquette —</option>
                  {eligibleMaquettes.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nom}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>

            <FormField
              label="Version (année)"
              required
              hint={
                maquetteId !== '' && versions.length === 0
                  ? 'Cette maquette n’a aucune version. Renouvelez-la pour l’année courante.'
                  : undefined
              }
            >
              {({ id, 'aria-describedby': describedBy }) => (
                <Select
                  id={id}
                  aria-describedby={describedBy}
                  value={versionId}
                  disabled={maquetteId === '' || versions.length === 0}
                  onChange={(e) => setVersionId(e.target.value)}
                >
                  <option value="">— Choisir une version —</option>
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.annee?.libelle ?? 'Version'}
                      {v.annee?.etat === 'EN_COURS' ? ' (en cours)' : ''}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
          </>
        )}

        <div className="flex items-center gap-2">
          <input
            id="formation-dd"
            type="checkbox"
            className="h-4 w-4 rounded border-border accent-primary"
            checked={isDoubleDiplome}
            onChange={(e) => setIsDoubleDiplome(e.target.checked)}
          />
          <label htmlFor="formation-dd" className="text-sm text-text">
            Double diplôme
          </label>
        </div>

        {error !== null ? (
          <div className="rounded-lg bg-err-100 px-4 py-2 text-sm text-err">{error}</div>
        ) : null}
      </form>
    </Modal>
  );
}
