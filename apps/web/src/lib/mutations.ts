import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type CreateSessionDto,
  type SessionDto,
  type UpdateSessionDto,
  sessionSchema,
} from '@planit/contracts';
import { apiPost, apiPut } from './api';
import { planningKeys } from './queries';

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
