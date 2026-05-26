import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type CreateSessionV2Dto,
  type SessionV2Dto,
  type UpdateSessionV2Dto,
  sessionV2Schema,
} from '@planit/contracts';
import { apiPost, apiPut } from './api';
import { planningV2Keys } from './queries-v2';

// ─────────────────────────────────────────────────────────────────────
// Mutations Vague 02 — séances V2 (create / update / publish)
// Toutes les invalidations ciblent `planningV2Keys.all` pour rester
// indépendantes du jeu V01 tant que la page /rp n'est pas basculée.
// ─────────────────────────────────────────────────────────────────────

const sessionV2ListSchema = sessionV2Schema.array();

function useInvalidatePlanningV2() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: planningV2Keys.all });
}

// ── POST /api/v2/sessions ─────────────────────────────────────────────
// Le body est typé via la discriminated union (Cours | Évaluation | Événement).
// Le backend rejette (400) toute combinaison (type, sousType) incohérente.

export function useCreateSessionV2Mutation() {
  const invalidate = useInvalidatePlanningV2();
  return useMutation<SessionV2Dto, Error, CreateSessionV2Dto>({
    mutationFn: (body) => apiPost(`/v2/sessions`, sessionV2Schema, body),
    onSuccess: () => invalidate(),
  });
}

// ── PUT /api/v2/sessions/:id ──────────────────────────────────────────
// V2-D8 : `type` est **immutable** — l'endpoint le rejette serveur-side.
// Le body côté client n'inclut donc pas `type` (cf. updateSessionV2Schema).

export function useUpdateSessionV2Mutation() {
  const invalidate = useInvalidatePlanningV2();
  return useMutation<SessionV2Dto, Error, { id: string; body: UpdateSessionV2Dto }>({
    mutationFn: ({ id, body }) => apiPut(`/v2/sessions/${id}`, sessionV2Schema, body),
    onSuccess: () => invalidate(),
  });
}

// ── POST /api/v2/sessions/publish ─────────────────────────────────────
// Publie toutes les séances avec `hasUnpublishedChanges = true`.
// Accepte un filtre optionnel `?classeId=` pour publish ciblé.

export function usePublishSessionsV2Mutation() {
  const invalidate = useInvalidatePlanningV2();
  return useMutation<SessionV2Dto[], Error, { classeId?: string } | undefined>({
    mutationFn: (vars) => {
      const path =
        vars?.classeId !== undefined
          ? `/v2/sessions/publish?classeId=${encodeURIComponent(vars.classeId)}`
          : `/v2/sessions/publish`;
      return apiPost(path, sessionV2ListSchema);
    },
    onSuccess: () => invalidate(),
  });
}
