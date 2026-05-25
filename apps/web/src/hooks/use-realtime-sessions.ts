'use client';

import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import type { SessionDto } from '@planit/contracts';
import { API_BASE } from '@/lib/api';
import { planningKeys } from '@/lib/queries';
import { useToast } from '@/components/ui/toast-provider';

interface SessionPublishedPayload {
  readonly sessions?: readonly SessionDto[];
}

export interface UseRealtimeSessionsOptions {
  readonly onPublished?: (payload: SessionPublishedPayload) => void;
  /** Désactivé quand `onPublished` gère son propre UI. */
  readonly showToast?: boolean;
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

    // Le cookie httpOnly sert d'authentification — plus de userId en clair (F.6)
    const socket: Socket = io(API_BASE, { withCredentials: true });

    socket.on('session:published', (payload?: SessionPublishedPayload) => {
      queryClient.invalidateQueries({ queryKey: planningKeys.all });
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
