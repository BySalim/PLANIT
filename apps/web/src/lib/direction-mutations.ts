import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  personnelSchema,
  anneeAcademiqueSchema,
  salleSchema,
  type PersonnelDto,
  type CreatePersonnelDto,
  type UpdatePersonnelDto,
  type AnneeAcademiqueDto,
  type CreateAnneeAcademiqueDto,
  type UpdateAnneeAcademiqueDto,
  type SalleDto,
  type CreateSalleDto,
  type UpdateSalleDto,
} from '@planit/contracts';
import { apiPost, apiPut, apiPatch } from './api';
import {
  personnelKeys,
  anneesDirectionKeys,
  sallesDirectionKeys,
  acClassesKeys,
  acClasseIdsSchema,
} from './direction-queries';

// ── Personnel ─────────────────────────────────────────────────────────────────

export function useCreatePersonnelMutation() {
  const qc = useQueryClient();
  return useMutation<PersonnelDto, Error, CreatePersonnelDto>({
    mutationFn: (dto) => apiPost('/personnel', personnelSchema, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: personnelKeys.all });
    },
  });
}

export function useUpdatePersonnelMutation() {
  const qc = useQueryClient();
  return useMutation<PersonnelDto, Error, { id: string; dto: UpdatePersonnelDto }>({
    mutationFn: ({ id, dto }) => apiPut(`/personnel/${id}`, personnelSchema, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: personnelKeys.all });
    },
  });
}

export function useSuspendrePersonnelMutation() {
  const qc = useQueryClient();
  return useMutation<PersonnelDto, Error, string>({
    mutationFn: (id) => apiPatch(`/personnel/${id}/suspendre`, personnelSchema),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: personnelKeys.all });
    },
  });
}

export function useReactiverPersonnelMutation() {
  const qc = useQueryClient();
  return useMutation<PersonnelDto, Error, string>({
    mutationFn: (id) => apiPatch(`/personnel/${id}/reactiver`, personnelSchema),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: personnelKeys.all });
    },
  });
}

// ── Années (Direction) ────────────────────────────────────────────────────────

// V05 LOT 7 — la Direction crée/modifie les années de son école (V5-D4).
export function useCreateAnneeMutation() {
  const qc = useQueryClient();
  return useMutation<AnneeAcademiqueDto, Error, CreateAnneeAcademiqueDto>({
    mutationFn: (dto) => apiPost('/annees', anneeAcademiqueSchema, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: anneesDirectionKeys.all });
    },
  });
}

export function useUpdateAnneeMutation() {
  const qc = useQueryClient();
  return useMutation<AnneeAcademiqueDto, Error, { id: string; dto: UpdateAnneeAcademiqueDto }>({
    mutationFn: ({ id, dto }) => apiPut(`/annees/${id}`, anneeAcademiqueSchema, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: anneesDirectionKeys.all });
    },
  });
}

export function useDebuterAnneeMutation() {
  const qc = useQueryClient();
  return useMutation<AnneeAcademiqueDto, Error, string>({
    mutationFn: (id) => apiPatch(`/annees/${id}/debuter`, anneeAcademiqueSchema),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: anneesDirectionKeys.all });
    },
  });
}

export function useCloturerAnneeMutation() {
  const qc = useQueryClient();
  return useMutation<AnneeAcademiqueDto, Error, string>({
    mutationFn: (id) => apiPatch(`/annees/${id}/cloturer`, anneeAcademiqueSchema),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: anneesDirectionKeys.all });
    },
  });
}

// ── Salles (Direction) ────────────────────────────────────────────────────────

export function useCreateSalleMutation() {
  const qc = useQueryClient();
  return useMutation<SalleDto, Error, CreateSalleDto>({
    mutationFn: (dto) => apiPost('/salles', salleSchema, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: sallesDirectionKeys.all });
    },
  });
}

export function useUpdateSalleMutation() {
  const qc = useQueryClient();
  return useMutation<SalleDto, Error, { id: string; dto: UpdateSalleDto }>({
    mutationFn: ({ id, dto }) => apiPut(`/salles/${id}`, salleSchema, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: sallesDirectionKeys.all });
    },
  });
}

// ── Assignation AC ↔ classes (V05 LOT 6 / ADR-0022 §7) ──────────────────────────

export function useSetAcClassesMutation() {
  const qc = useQueryClient();
  return useMutation<{ classeIds: string[] }, Error, { acId: string; classeIds: string[] }>({
    mutationFn: ({ acId, classeIds }) =>
      apiPut(`/ac/${acId}/classes`, acClasseIdsSchema, { classeIds }),
    onSuccess: (_data, { acId }) => {
      void qc.invalidateQueries({ queryKey: acClassesKeys.byAc(acId) });
    },
  });
}
