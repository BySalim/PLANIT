'use client';

import { useAuth } from '@/contexts/auth-context';

export interface CurrentStudent {
  readonly id: string;
  readonly fullName: string;
  readonly role: 'ETUDIANT';
}

// Fallback utilisé si l'état auth n'est pas encore résolu (RequireAuth garantit
// que ce cas ne se produit pas en production dans une page ETUDIANT).
const HARDCODED_STUDENT: CurrentStudent = {
  id: 'seed-student',
  fullName: 'Ibrahima Sow',
  role: 'ETUDIANT',
};

export function useCurrentStudent(): CurrentStudent {
  const { state } = useAuth();
  if (state.status !== 'authenticated') return HARDCODED_STUDENT;
  return { id: state.user.id, fullName: state.user.fullName, role: 'ETUDIANT' };
}
