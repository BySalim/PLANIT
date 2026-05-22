'use client';

import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE } from '@/lib/api';
import { planningKeys } from '@/lib/queries';
import { useToast } from '@/components/ui/toast-provider';

/**
 * E.5 — Connecte le client au WebSocket backend pour recevoir les
 * mises à jour temps réel du planning.
 *
 * Côté serveur (cf. backend) :
 *   - room `user:${userId}` : l'utilisateur ne reçoit que les events
 *     qui le concernent.
 *   - event `session:published` émis quand un RP publie une séance.
 *
 * Côté client :
 *   - Invalidation de toutes les queries `planningKeys.all` → TanStack
 *     refetch transparent (sessions de la semaine, stats, détail).
 *   - Toast in-app "Le planning a été mis à jour" (variant success).
 *
 * Le hook est no-op si `userId` est `null` (pas d'utilisateur courant).
 * Voir `docs/specs/VAGUE-01-02-enseignant.md` — décisions L3.
 */
export function useRealtimeSessions(userId: string | null): void {
  const queryClient = useQueryClient();
  const toast = useToast();

  useEffect(() => {
    if (userId === null) {
      return;
    }

    const socket: Socket = io(API_BASE, {
      auth: { userId },
      // Reconnexion gérée par défaut par socket.io-client ;
      // on garde les valeurs par défaut (reconnection: true, infini).
    });

    socket.on('session:published', () => {
      queryClient.invalidateQueries({ queryKey: planningKeys.all });
      toast.show('Le planning a été mis à jour', { variant: 'success' });
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, queryClient, toast]);
}
