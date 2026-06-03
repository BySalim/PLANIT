import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type ClasseV3Dto,
  type CreateClasseV3Dto,
  type CreateFormationDto,
  type CreateMaquetteDto,
  type CreateMaquetteModuleDto,
  type FormationDto,
  type InscriptionDto,
  type InscriptionRequestDto,
  type MaquetteDto,
  type MaquetteModuleDto,
  type MaquetteVersionDto,
  type UpdateClasseV3Dto,
  type UpdateFormationDto,
  type UpdateMaquetteDto,
  type UpdateMaquetteModuleDto,
  classeV3Schema,
  formationSchema,
  inscriptionSchema,
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

// ─────────────────────────────────────────────────────────────────────
// Formations (A.6 / LOT 4 C.2)
// ─────────────────────────────────────────────────────────────────────

// ── POST /api/formations ──────────────────────────────────────────────
// Toujours pour l'année courante (anneeAcademiqueId résolu côté serveur).

export function useCreateFormationMutation() {
  const invalidate = useInvalidateAcademic();
  const flash = useFlash();
  return useMutation<FormationDto, Error, CreateFormationDto>({
    mutationFn: (body) => apiPost('/formations', formationSchema, body),
    onSuccess: (data) => {
      invalidate();
      flash.push('success', `Formation « ${data.code} » créée`);
    },
    onError: (err) => {
      flash.push(
        'error',
        err.message.includes('409')
          ? 'Ce code de formation est déjà utilisé'
          : `Création impossible : ${err.message}`,
      );
    },
  });
}

// ── PUT /api/formations/:id ───────────────────────────────────────────

export function useUpdateFormationMutation() {
  const invalidate = useInvalidateAcademic();
  const flash = useFlash();
  return useMutation<FormationDto, Error, { id: string; body: UpdateFormationDto }>({
    mutationFn: ({ id, body }) => apiPut(`/formations/${id}`, formationSchema, body),
    onSuccess: () => {
      invalidate();
      flash.push('success', 'Formation mise à jour');
    },
    onError: (err) => {
      flash.push(
        'error',
        err.message.includes('409')
          ? 'Ce code de formation est déjà utilisé'
          : `Modification impossible : ${err.message}`,
      );
    },
  });
}

// ─────────────────────────────────────────────────────────────────────
// Classes V3 (B.1 / LOT 4 C.3)
// ─────────────────────────────────────────────────────────────────────

// ── POST /api/classes ─────────────────────────────────────────────────

export function useCreateClasseMutation() {
  const invalidate = useInvalidateAcademic();
  const flash = useFlash();
  return useMutation<ClasseV3Dto, Error, CreateClasseV3Dto>({
    mutationFn: (body) => apiPost('/classes', classeV3Schema, body),
    onSuccess: (data) => {
      invalidate();
      flash.push('success', `Classe « ${data.name} » créée`);
    },
    onError: (err) => {
      flash.push(
        'error',
        err.message.includes('409')
          ? 'Ce code de classe est déjà utilisé'
          : `Création impossible : ${err.message}`,
      );
    },
  });
}

// ── PUT /api/classes/:id ──────────────────────────────────────────────

export function useUpdateClasseMutation() {
  const invalidate = useInvalidateAcademic();
  const flash = useFlash();
  return useMutation<ClasseV3Dto, Error, { id: string; body: UpdateClasseV3Dto }>({
    mutationFn: ({ id, body }) => apiPut(`/classes/${id}`, classeV3Schema, body),
    onSuccess: () => {
      invalidate();
      flash.push('success', 'Classe mise à jour');
    },
    onError: (err) => {
      flash.push(
        'error',
        err.message.includes('409')
          ? 'Ce code de classe est déjà utilisé'
          : `Modification impossible : ${err.message}`,
      );
    },
  });
}

// ─────────────────────────────────────────────────────────────────────
// Inscriptions (B.3/B.4 / LOT 4 C.5) — partagé RP + AC
// ─────────────────────────────────────────────────────────────────────

// ── POST /api/classes/:classeId/inscriptions ──────────────────────────
// Flux email → existant/nouveau (union discriminée). 409 = doublon ou
// règle double-diplôme (≤ 2/an, 1 par catégorie).

export function useCreateInscriptionMutation() {
  const invalidate = useInvalidateAcademic();
  const flash = useFlash();
  return useMutation<InscriptionDto, Error, { classeId: string; body: InscriptionRequestDto }>({
    mutationFn: ({ classeId, body }) =>
      apiPost(`/classes/${classeId}/inscriptions`, inscriptionSchema, body),
    onSuccess: () => {
      invalidate();
      flash.push('success', 'Étudiant inscrit');
    },
    onError: (err) => {
      flash.push(
        'error',
        err.message.includes('409')
          ? 'Déjà inscrit dans une classe de cette catégorie cette année'
          : `Inscription impossible : ${err.message}`,
      );
    },
  });
}

// ── DELETE /api/inscriptions/:id ──────────────────────────────────────

export function useDeleteInscriptionMutation() {
  const invalidate = useInvalidateAcademic();
  const flash = useFlash();
  return useMutation<void, Error, { id: string }>({
    mutationFn: ({ id }) => apiDelete(`/inscriptions/${id}`),
    onSuccess: () => {
      invalidate();
      flash.push('success', 'Étudiant désinscrit');
    },
    onError: (err) => {
      flash.push('error', `Désinscription impossible : ${err.message}`);
    },
  });
}
