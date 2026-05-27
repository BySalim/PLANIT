import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type CreateSessionV2Dto,
  type SessionV2Dto,
  type UpdateSessionV2Dto,
  sessionV2Schema,
} from '@planit/contracts';
import { useFlash } from '@planit/ui';
import { apiDelete, apiPost, apiPut } from './api';
import { planningV2Keys } from './queries-v2';

// ─────────────────────────────────────────────────────────────────────
// Mutations Vague 02 — séances V2 (create / update / publish)
// Toutes les invalidations ciblent `planningV2Keys.all` pour rester
// indépendantes du jeu V01 tant que la page /rp n'est pas basculée.
//
// I.7 — chaque mutation push un flash succès/erreur via `useFlash()`. Le
// caller peut quand même override via `mutate(vars, { onSuccess, onError })`
// pour des comportements spécifiques (ex : fermer une modale).
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
  const flash = useFlash();
  return useMutation<SessionV2Dto, Error, CreateSessionV2Dto>({
    mutationFn: (body) => apiPost(`/v2/sessions`, sessionV2Schema, body),
    onSuccess: () => {
      invalidate();
      flash.push('success', 'Séance créée');
    },
    onError: (err) => {
      flash.push('error', `Création de la séance impossible : ${err.message}`);
    },
  });
}

// ── PUT /api/v2/sessions/:id ──────────────────────────────────────────
// V2-D8 : `type` est **immutable** — l'endpoint le rejette serveur-side.
// Le body côté client n'inclut donc pas `type` (cf. updateSessionV2Schema).

export function useUpdateSessionV2Mutation() {
  const invalidate = useInvalidatePlanningV2();
  const flash = useFlash();
  return useMutation<SessionV2Dto, Error, { id: string; body: UpdateSessionV2Dto }>({
    mutationFn: ({ id, body }) => apiPut(`/v2/sessions/${id}`, sessionV2Schema, body),
    onSuccess: () => {
      invalidate();
      flash.push('success', 'Séance mise à jour');
    },
    onError: (err) => {
      flash.push('error', `Mise à jour impossible : ${err.message}`);
    },
  });
}

// ── DELETE /api/v2/sessions/:id ───────────────────────────────────────
// LOT 4 V2 — supprime une séance V02 jamais publiée. Utilisé par :
//  - le bouton « Supprimer » du drawer détail (visible si lastPublishedAt === null)
//  - l'undo d'une création (la pile undo appelle ce hook avec l'id de la
//    séance à supprimer)
// Le backend refuse 400 si la séance a déjà été publiée.

export function useDeleteSessionV2Mutation() {
  const invalidate = useInvalidatePlanningV2();
  const flash = useFlash();
  return useMutation<void, Error, { id: string; silent?: boolean }>({
    mutationFn: ({ id }) => apiDelete(`/v2/sessions/${id}`),
    onSuccess: (_, vars) => {
      invalidate();
      if (!vars.silent) flash.push('success', 'Séance supprimée');
    },
    onError: (err) => {
      flash.push('error', `Suppression impossible : ${err.message}`);
    },
  });
}

// ── POST /api/v2/sessions/publish ─────────────────────────────────────
// Publie toutes les séances avec `hasUnpublishedChanges = true`.
// Accepte un filtre optionnel `?classeId=` pour publish ciblé.

export function usePublishSessionsV2Mutation() {
  const invalidate = useInvalidatePlanningV2();
  const flash = useFlash();
  return useMutation<SessionV2Dto[], Error, { classeId?: string } | undefined>({
    mutationFn: (vars) => {
      const path =
        vars?.classeId !== undefined
          ? `/v2/sessions/publish?classeId=${encodeURIComponent(vars.classeId)}`
          : `/v2/sessions/publish`;
      return apiPost(path, sessionV2ListSchema);
    },
    onSuccess: (published) => {
      invalidate();
      const count = published.length;
      flash.push(
        'success',
        count === 0
          ? 'Rien à publier'
          : count === 1
            ? '1 séance publiée'
            : `${count} séances publiées`,
      );
    },
    onError: (err) => {
      flash.push('error', `Publication impossible : ${err.message}`);
    },
  });
}
