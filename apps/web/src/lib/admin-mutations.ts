import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type CreateEcoleDto,
  type CreateUserAdminDto,
  type EcoleDto,
  type ResetPasswordResultDto,
  type UpdateEcoleDto,
  type UpdateUserAdminDto,
  type UserAdminDto,
  ecoleSchema,
  resetPasswordResultSchema,
  userAdminSchema,
} from '@planit/contracts';
import { apiPatch, apiPost, apiPut } from './api';
import { ecoleKeys, journalKeys, utilisateurKeys } from './admin-queries';

/** Invalide plusieurs racines de clés (les actions admin écrivent aussi l'audit). */
function useInvalidate() {
  const qc = useQueryClient();
  return (keys: readonly (readonly unknown[])[]) =>
    Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey })));
}

// ── Écoles ───────────────────────────────────────────────────────────────────
export function useCreateEcoleMutation() {
  const invalidate = useInvalidate();
  return useMutation<EcoleDto, Error, CreateEcoleDto>({
    mutationFn: (body) => apiPost('/ecoles', ecoleSchema, body),
    // Crée aussi le compte Direction → rafraîchir la liste des utilisateurs.
    onSuccess: () => invalidate([ecoleKeys.all, utilisateurKeys.all, journalKeys.all]),
  });
}

export function useUpdateEcoleMutation() {
  const invalidate = useInvalidate();
  return useMutation<EcoleDto, Error, { id: string; body: UpdateEcoleDto }>({
    mutationFn: ({ id, body }) => apiPut(`/ecoles/${id}`, ecoleSchema, body),
    onSuccess: () => invalidate([ecoleKeys.all, journalKeys.all]),
  });
}

export function useArchiveEcoleMutation() {
  const invalidate = useInvalidate();
  return useMutation<EcoleDto, Error, string>({
    mutationFn: (id) => apiPatch(`/ecoles/${id}/archive`, ecoleSchema),
    onSuccess: () => invalidate([ecoleKeys.all, journalKeys.all]),
  });
}

// ── Utilisateurs ─────────────────────────────────────────────────────────────
export function useCreateUserMutation() {
  const invalidate = useInvalidate();
  return useMutation<UserAdminDto, Error, CreateUserAdminDto>({
    mutationFn: (body) => apiPost('/utilisateurs', userAdminSchema, body),
    onSuccess: () => invalidate([utilisateurKeys.all, journalKeys.all]),
  });
}

export function useUpdateUserMutation() {
  const invalidate = useInvalidate();
  return useMutation<UserAdminDto, Error, { id: string; body: UpdateUserAdminDto }>({
    mutationFn: ({ id, body }) => apiPut(`/utilisateurs/${id}`, userAdminSchema, body),
    onSuccess: () => invalidate([utilisateurKeys.all, journalKeys.all]),
  });
}

export function useSuspendUserMutation() {
  const invalidate = useInvalidate();
  return useMutation<UserAdminDto, Error, string>({
    mutationFn: (id) => apiPatch(`/utilisateurs/${id}/suspendre`, userAdminSchema),
    onSuccess: () => invalidate([utilisateurKeys.all, journalKeys.all]),
  });
}

export function useReactivateUserMutation() {
  const invalidate = useInvalidate();
  return useMutation<UserAdminDto, Error, string>({
    mutationFn: (id) => apiPatch(`/utilisateurs/${id}/reactiver`, userAdminSchema),
    onSuccess: () => invalidate([utilisateurKeys.all, journalKeys.all]),
  });
}

export function useArchiveUserMutation() {
  const invalidate = useInvalidate();
  return useMutation<UserAdminDto, Error, string>({
    mutationFn: (id) => apiPatch(`/utilisateurs/${id}/archiver`, userAdminSchema),
    onSuccess: () => invalidate([utilisateurKeys.all, journalKeys.all]),
  });
}

export function useResetPasswordMutation() {
  const invalidate = useInvalidate();
  return useMutation<ResetPasswordResultDto, Error, string>({
    mutationFn: (id) => apiPost(`/utilisateurs/${id}/reset-password`, resetPasswordResultSchema),
    onSuccess: () => invalidate([journalKeys.all]),
  });
}
