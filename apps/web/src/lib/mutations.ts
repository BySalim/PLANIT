import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type CreateSessionDto,
  type SessionDto,
  type UpdateSessionDto,
  type EnseignantDto,
  type CreateEnseignantDto,
  type UpdateEnseignantDto,
  type UEDto,
  type CreateUEDto,
  type UpdateUEDto,
  type ModuleV2Dto,
  type CreateModuleDto,
  type UpdateModuleDto,
  type FiliereDto,
  type CreateFiliereDto,
  type UpdateFiliereDto,
  sessionSchema,
  enseignantSchema,
  ueSchema,
  moduleV2Schema,
  filiereSchema,
} from '@planit/contracts';
import { apiPost, apiPut, apiDelete } from './api';
import { planningKeys, enseignantKeys, ueKeys, filiereKeys } from './queries';

const sessionListSchema = sessionSchema.array();

function useInvalidatePlanning() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: planningKeys.all });
}

export function useCreateSessionMutation() {
  const invalidate = useInvalidatePlanning();
  return useMutation<SessionDto, Error, CreateSessionDto>({
    mutationFn: (body) => apiPost('/sessions', sessionSchema, body),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateSessionMutation() {
  const invalidate = useInvalidatePlanning();
  return useMutation<SessionDto, Error, { id: string; body: UpdateSessionDto }>({
    mutationFn: ({ id, body }) => apiPut(`/sessions/${id}`, sessionSchema, body),
    onSuccess: () => invalidate(),
  });
}

export function usePublishSessionsMutation() {
  const invalidate = useInvalidatePlanning();
  return useMutation<SessionDto[], Error, { classeId?: string } | undefined>({
    mutationFn: (vars) => {
      const path = vars?.classeId
        ? `/sessions/publish?classeId=${encodeURIComponent(vars.classeId)}`
        : '/sessions/publish';
      return apiPost(path, sessionListSchema);
    },
    onSuccess: () => invalidate(),
  });
}

// ── Enseignants ──────────────────────────────────────────────────────

function useInvalidateEnseignants() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: enseignantKeys.all });
}

export function useCreateEnseignantMutation() {
  const invalidate = useInvalidateEnseignants();
  return useMutation<EnseignantDto, Error, CreateEnseignantDto>({
    mutationFn: (body) => apiPost('/enseignants', enseignantSchema, body),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateEnseignantMutation() {
  const invalidate = useInvalidateEnseignants();
  return useMutation<EnseignantDto, Error, { id: string; body: UpdateEnseignantDto }>({
    mutationFn: ({ id, body }) => apiPut(`/enseignants/${id}`, enseignantSchema, body),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteEnseignantMutation() {
  const invalidate = useInvalidateEnseignants();
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiDelete(`/enseignants/${id}`),
    onSuccess: () => invalidate(),
  });
}

// ── UE ───────────────────────────────────────────────────────────────

function useInvalidateUes() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ueKeys.all });
}

export function useCreateUeMutation() {
  const invalidate = useInvalidateUes();
  return useMutation<UEDto, Error, CreateUEDto>({
    mutationFn: (body) => apiPost('/ues', ueSchema, body),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateUeMutation() {
  const invalidate = useInvalidateUes();
  return useMutation<UEDto, Error, { id: string; body: UpdateUEDto }>({
    mutationFn: ({ id, body }) => apiPut(`/ues/${id}`, ueSchema, body),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteUeMutation() {
  const invalidate = useInvalidateUes();
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiDelete(`/ues/${id}`),
    onSuccess: () => invalidate(),
  });
}

// ── Modules ──────────────────────────────────────────────────────────

export function useCreateModuleMutation() {
  const invalidate = useInvalidateUes();
  return useMutation<ModuleV2Dto, Error, { ueId: string; body: CreateModuleDto }>({
    mutationFn: ({ ueId, body }) => apiPost(`/ues/${ueId}/modules`, moduleV2Schema, body),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateModuleMutation() {
  const invalidate = useInvalidateUes();
  return useMutation<ModuleV2Dto, Error, { id: string; body: UpdateModuleDto }>({
    mutationFn: ({ id, body }) => apiPut(`/modules/${id}`, moduleV2Schema, body),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteModuleMutation() {
  const invalidate = useInvalidateUes();
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiDelete(`/modules/${id}`),
    onSuccess: () => invalidate(),
  });
}

// ── Filières ─────────────────────────────────────────────────────────

function useInvalidateFilieres() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: filiereKeys.all });
}

export function useCreateFiliereMutation() {
  const invalidate = useInvalidateFilieres();
  return useMutation<FiliereDto, Error, CreateFiliereDto>({
    mutationFn: (body) => apiPost('/filieres', filiereSchema, body),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateFiliereMutation() {
  const invalidate = useInvalidateFilieres();
  return useMutation<FiliereDto, Error, { id: string; body: UpdateFiliereDto }>({
    mutationFn: ({ id, body }) => apiPut(`/filieres/${id}`, filiereSchema, body),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteFiliereMutation() {
  const invalidate = useInvalidateFilieres();
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiDelete(`/filieres/${id}`),
    onSuccess: () => invalidate(),
  });
}
