'use client';

import { useEffect } from 'react';
import { startOfWeek } from 'date-fns';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import type { SessionDto } from '@planit/contracts';
import { API_BASE } from '@/lib/api';
import { planningKeys } from '@/lib/queries';
import { toWeekStartParam } from '@/lib/week';
import { useToast } from '@/components/ui/toast-provider';

interface SessionPublishedPayload {
  readonly sessions?: readonly SessionDto[];
}

export interface UseRealtimeSessionsOptions {
  readonly onPublished?: (payload: SessionPublishedPayload) => void;
  /** Désactivé quand `onPublished` gère son propre UI. */
  readonly showToast?: boolean;
}

// Calcule la liste minimale de clés TanStack à invalider à partir des sessions
// publiées. Plutôt que d'invalider l'arbre planning entier (refetch coûteux),
// on cible : (weekStart × teacherId), (weekStart × classeId), (sessionId), stats.
function buildInvalidationKeys(sessions: readonly SessionDto[]): ReadonlyArray<readonly string[]> {
  const teacherWeek = new Set<string>();
  const classeWeek = new Set<string>();
  const weeks = new Set<string>();
  const sessionIds = new Set<string>();

  for (const session of sessions) {
    const weekStart = startOfWeek(new Date(session.startAt), { weekStartsOn: 1 });
    const weekParam = toWeekStartParam(weekStart);
    teacherWeek.add(`${weekParam}__${session.teacher.id}`);
    classeWeek.add(`${weekParam}__${session.classe.id}`);
    weeks.add(weekParam);
    sessionIds.add(session.id);
  }

  const keys: Array<readonly string[]> = [];
  for (const tuple of teacherWeek) {
    const [week, teacherId] = tuple.split('__');
    if (week !== undefined && teacherId !== undefined) {
      keys.push(planningKeys.sessionsByTeacher(week, teacherId));
    }
  }
  for (const tuple of classeWeek) {
    const [week, classeId] = tuple.split('__');
    if (week !== undefined && classeId !== undefined) {
      // NOTE V01 : pas de key `sessionsByClasse` exposée dans queries.ts —
      // on invalide la key "sessions(week)" qui couvre toutes les classes
      // pour ce week. Affiner en Vague 02 quand un hook RP par classe sera
      // ajouté (cf. TD-022).
      keys.push(planningKeys.sessions(week));
    }
  }
  for (const week of weeks) {
    keys.push(planningKeys.stats(week));
  }
  for (const sessionId of sessionIds) {
    keys.push(planningKeys.session(sessionId));
  }
  return keys;
}

export function useRealtimeSessions(
  enabled: boolean,
  options: UseRealtimeSessionsOptions = {},
): void {
  const { onPublished, showToast = true } = options;
  const queryClient = useQueryClient();
  const toast = useToast();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // V02 LOT 1 : le backend lit `userId` + `role` depuis le cookie HttpOnly
    // au handshake (cf. `ws.gateway.ts`). On envoie donc les cookies via
    // `withCredentials: true`. Le `userId` reste utile uniquement comme clé
    // de dépendance React pour réinitialiser le socket quand l'acteur change.
    const socket: Socket = io(API_BASE, { withCredentials: true });

    socket.on('session:published', (payload?: SessionPublishedPayload) => {
      const sessions = payload?.sessions;

      if (sessions !== undefined && sessions.length > 0) {
        // Invalidation ciblée : uniquement les keys impactées par les sessions reçues.
        const keys = buildInvalidationKeys(sessions);
        for (const queryKey of keys) {
          queryClient.invalidateQueries({ queryKey });
        }
      } else {
        // Fallback défensif (payload vide ou malformé) — on invalide tout l'arbre.
        queryClient.invalidateQueries({ queryKey: planningKeys.all });
      }

      if (showToast) {
        toast.show('Le planning a été mis à jour', { variant: 'success' });
      }
      if (onPublished !== undefined) {
        onPublished(payload ?? {});
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [enabled, queryClient, toast, onPublished, showToast]);
}
