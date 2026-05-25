'use client';

import { useAuth } from '@/contexts/auth-context';

export interface CurrentTeacher {
  readonly id: string;
  readonly fullName: string;
  readonly role: 'ENSEIGNANT';
}

// Fallback utilisé si l'état auth n'est pas encore résolu (RequireAuth garantit
// que ce cas ne se produit pas en production dans une page ENSEIGNANT).
const HARDCODED_TEACHER: CurrentTeacher = {
  id: 'seed-teacher-algo',
  fullName: 'M. Oumar Ndiaye',
  role: 'ENSEIGNANT',
};

export function useCurrentTeacher(): CurrentTeacher {
  const { state } = useAuth();
  if (state.status !== 'authenticated') return HARDCODED_TEACHER;
  return { id: state.user.id, fullName: state.user.nomComplet, role: 'ENSEIGNANT' };
}
