// V1 sans auth (V1-D2 / L3-D1) — TD-022 trace le remplacement par un contexte d'auth.
export interface CurrentTeacher {
  readonly id: string;
  readonly fullName: string;
  readonly role: 'ENSEIGNANT';
}

const HARDCODED_TEACHER: CurrentTeacher = {
  id: 'seed-teacher-algo',
  fullName: 'M. Oumar Ndiaye',
  role: 'ENSEIGNANT',
};

export function useCurrentTeacher(): CurrentTeacher {
  return HARDCODED_TEACHER;
}
