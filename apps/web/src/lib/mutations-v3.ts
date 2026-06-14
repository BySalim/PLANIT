import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type ClasseV3Dto,
  type CreateClasseV3Dto,
  type CreateFormationDto,
  type CreateMaquetteModuleDto,
  type FormationDto,
  type InscriptionDto,
  type InscriptionRequestDto,
  type MaquetteModuleDto,
  type SuiviModuleDto,
  type UpdateClasseV3Dto,
  type UpdateMaquetteModuleDto,
  type CreateSalleDto,
  type SalleDto,
  classeV3Schema,
  formationSchema,
  inscriptionSchema,
  maquetteModuleSchema,
  suiviModuleSchema,
  salleSchema,
} from '@planit/contracts';
import { useFlash } from '@planit/ui';
import { apiDelete, apiPatch, apiPost, apiPut } from './api';
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

// ADR-0018 : plus de mutation de création / renommage / renouvellement de
// maquette côté client — la maquette et sa version sont créées/renouvelées
// automatiquement par la création d'une formation (voir useCreateFormationMutation).
// Seule la **composition** (ajout/màj/retrait de modules) est mutable ici.

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

// ADR-0018 : pas de mutation de mise à jour de formation — code/maquette/version
// sont dérivés et figés à la création (filière + niveau seulement).

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

// ── PATCH /api/suivi-modules/:id/terminer (RP only) ───────────────────
// LOT 5 V03 — un AC reçoit 403 (backend failsafe). Le frontend désactive
// le bouton si role !== RP pour UX.

export function useTerminerSuiviMutation() {
  const invalidate = useInvalidateAcademic();
  const flash = useFlash();
  return useMutation<SuiviModuleDto, Error, { id: string }>({
    mutationFn: ({ id }) => apiPatch(`/suivi-modules/${id}/terminer`, suiviModuleSchema),
    onSuccess: (data) => {
      invalidate();
      flash.push('success', `Module « ${data.module.libelle} » marqué terminé`);
    },
    onError: (err) => {
      flash.push('error', `Action impossible : ${err.message}`);
    },
  });
}

// ── PATCH /api/suivi-modules/:id/rouvrir (RP only) ────────────────────

export function useRouvrirSuiviMutation() {
  const invalidate = useInvalidateAcademic();
  const flash = useFlash();
  return useMutation<SuiviModuleDto, Error, { id: string }>({
    mutationFn: ({ id }) => apiPatch(`/suivi-modules/${id}/rouvrir`, suiviModuleSchema),
    onSuccess: (data) => {
      invalidate();
      flash.push('success', `Module « ${data.module.libelle} » rouvert`);
    },
    onError: (err) => {
      flash.push('error', `Action impossible : ${err.message}`);
    },
  });
}

// ── Salles subjectives (V05 LOT 6 / ADR-0022 §5) — RP créateur ────────
// Un RP crée/supprime SES salles subjectives (privées). Invalide la liste
// salles (academicKeys) consommée par la vue Salles RP.

export function useCreateSubjectiveSalleMutation() {
  const invalidate = useInvalidateAcademic();
  const flash = useFlash();
  return useMutation<SalleDto, Error, CreateSalleDto>({
    mutationFn: (dto) => apiPost('/salles', salleSchema, { ...dto, isSubjective: true }),
    onSuccess: () => {
      invalidate();
      flash.push('success', 'Salle subjective créée');
    },
    onError: (err) => {
      flash.push('error', `Création impossible : ${err.message}`);
    },
  });
}

export function useDeleteSubjectiveSalleMutation() {
  const invalidate = useInvalidateAcademic();
  const flash = useFlash();
  return useMutation<void, Error, { id: string }>({
    mutationFn: ({ id }) => apiDelete(`/salles/${id}`),
    onSuccess: () => {
      invalidate();
      flash.push('success', 'Salle subjective supprimée');
    },
    onError: (err) => {
      flash.push('error', `Suppression impossible : ${err.message}`);
    },
  });
}
