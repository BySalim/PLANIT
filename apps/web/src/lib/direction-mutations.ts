import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  personnelSchema,
  anneeAcademiqueSchema,
  salleSchema,
  type PersonnelDto,
  type CreatePersonnelDto,
  type UpdatePersonnelDto,
  type AnneeAcademiqueDto,
  type SalleDto,
  type CreateSalleDto,
  type UpdateSalleDto,
} from '@planit/contracts';
import { apiPost, apiPut, apiPatch } from './api';
import { personnelKeys, anneesDirectionKeys, sallesDirectionKeys } from './direction-queries';

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
