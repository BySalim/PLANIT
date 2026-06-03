import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type CreateMaquetteDto,
  type CreateMaquetteModuleDto,
  type MaquetteDto,
  type MaquetteModuleDto,
  type MaquetteVersionDto,
  type UpdateMaquetteDto,
  type UpdateMaquetteModuleDto,
  maquetteModuleSchema,
  maquetteSchema,
  maquetteVersionSchema,
} from '@planit/contracts';
import { useFlash } from '@planit/ui';
import { apiDelete, apiPost, apiPut } from './api';
import { academicKeys } from './queries-v3';

// ─────────────────────────────────────────────────────────────────────
// Mutations Vague 03 — référentiel académique (maquettes)
// Toutes les invalidations ciblent `academicKeys.all` pour resync
// la liste + les versions après chaque mutation.
// ─────────────────────────────────────────────────────────────────────

function useInvalidateAcademic() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: academicKeys.all });
}

// ── POST /api/maquettes ───────────────────────────────────────────────

export function useCreateMaquetteMutation() {
  const invalidate = useInvalidateAcademic();
  const flash = useFlash();
  return useMutation<MaquetteDto, Error, CreateMaquetteDto>({
    mutationFn: (body) => apiPost('/maquettes', maquetteSchema, body),
    onSuccess: (data) => {
      invalidate();
      flash.push('success', `Maquette « ${data.nom} » créée`);
    },
    onError: (err) => {
      flash.push('error', `Création impossible : ${err.message}`);
    },
  });
}

// ── PUT /api/maquettes/:id ────────────────────────────────────────────
// Seul le nom est modifiable (filière + niveau figés ADR-0010).

export function useUpdateMaquetteMutation() {
  const invalidate = useInvalidateAcademic();
  const flash = useFlash();
  return useMutation<MaquetteDto, Error, { id: string; body: UpdateMaquetteDto }>({
    mutationFn: ({ id, body }) => apiPut(`/maquettes/${id}`, maquetteSchema, body),
    onSuccess: () => {
      invalidate();
      flash.push('success', 'Maquette mise à jour');
    },
    onError: (err) => {
      flash.push('error', `Modification impossible : ${err.message}`);
    },
  });
}

// ── POST /api/maquettes/:id/renew ─────────────────────────────────────
// Clone la dernière version vers l'année courante (ADR-0010).
// 409 si une version existe déjà pour l'année courante.

export function useRenewMaquetteMutation() {
  const invalidate = useInvalidateAcademic();
  const flash = useFlash();
  return useMutation<MaquetteVersionDto, Error, { maquetteId: string }>({
    mutationFn: ({ maquetteId }) =>
      apiPost(`/maquettes/${maquetteId}/renew`, maquetteVersionSchema),
    onSuccess: () => {
      invalidate();
      flash.push('success', "Maquette renouvelée pour l'année courante");
    },
    onError: (err) => {
      flash.push(
        'error',
        err.message.includes('409')
          ? "Une version existe déjà pour l'année en cours"
          : `Renouvellement impossible : ${err.message}`,
      );
    },
  });
}

// ── POST /api/maquette-versions/:vid/modules ──────────────────────────

export function useAddMaquetteModuleMutation() {
  const invalidate = useInvalidateAcademic();
  const flash = useFlash();
  return useMutation<
    MaquetteModuleDto,
    Error,
    { versionId: string; body: CreateMaquetteModuleDto }
  >({
    mutationFn: ({ versionId, body }) =>
      apiPost(`/maquette-versions/${versionId}/modules`, maquetteModuleSchema, body),
    onSuccess: () => {
      invalidate();
      flash.push('success', 'Module ajouté à la maquette');
    },
    onError: (err) => {
      flash.push('error', `Ajout impossible : ${err.message}`);
    },
  });
}

// ── PUT /api/maquette-modules/:id ─────────────────────────────────────

export function useUpdateMaquetteModuleMutation() {
  const invalidate = useInvalidateAcademic();
  return useMutation<MaquetteModuleDto, Error, { id: string; body: UpdateMaquetteModuleDto }>({
    mutationFn: ({ id, body }) => apiPut(`/maquette-modules/${id}`, maquetteModuleSchema, body),
    onSuccess: () => {
      invalidate();
    },
    // Pas de flash ici — appelé en batch depuis le mode composer, flash global géré par le parent
  });
}

// ── DELETE /api/maquette-modules/:id ─────────────────────────────────

export function useDeleteMaquetteModuleMutation() {
  const invalidate = useInvalidateAcademic();
  const flash = useFlash();
  return useMutation<void, Error, { id: string }>({
    mutationFn: ({ id }) => apiDelete(`/maquette-modules/${id}`),
    onSuccess: () => {
      invalidate();
      flash.push('success', 'Module retiré de la maquette');
    },
    onError: (err) => {
      flash.push('error', `Suppression impossible : ${err.message}`);
    },
  });
}
