'use client';

import { useEffect } from 'react';
import { useToast } from '@/components/ui/toast-provider';

// Écoute l'event global dispatché par api.ts sur 403
export function ForbiddenListener() {
  const toast = useToast();

  useEffect(() => {
    const handler = () => toast.show('Accès refusé', { variant: 'error' });
    window.addEventListener('api:forbidden', handler);
    return () => window.removeEventListener('api:forbidden', handler);
  }, [toast]);

  return null;
}
