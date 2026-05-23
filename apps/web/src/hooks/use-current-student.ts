// V1 sans auth (VAGUE-01-03) — TD-022 trace le remplacement par un contexte d'auth.
export interface CurrentStudent {
  readonly id: string;
  readonly fullName: string;
  readonly role: 'ETUDIANT';
}

const HARDCODED_STUDENT: CurrentStudent = {
  id: 'seed-student',
  fullName: 'Ibrahima Sow',
  role: 'ETUDIANT',
};

export function useCurrentStudent(): CurrentStudent {
  return HARDCODED_STUDENT;
}
