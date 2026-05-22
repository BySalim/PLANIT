/**
 * V1 — Enseignant courant hardcodé selon décision L3-D1 de la spec
 * `docs/specs/VAGUE-01-02-enseignant.md`.
 *
 * Justification : V1-D2 — pas d'auth. À remplacer par un contexte d'auth
 * en Vague 02 (cf. `docs/tech-debt.md`).
 */
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
