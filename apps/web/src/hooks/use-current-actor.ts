// Hook unifié d'acteur courant — point d'entrée unique pour récupérer l'identité
// de l'utilisateur connecté côté UI (id + nom + rôle).
//
// V01 : retourne un acteur hardcodé en déléguant à useCurrentTeacher / useCurrentStudent
// selon `kind`. Les pages ne sont PAS encore migrées vers ce hook — le refacto
// Enseignant/Étudiant est repoussé V02 (cf. FACTOR-PAGES dans CLAUDE.md).
//
// TODO V02 : remplacer par useAuth() qui retourne directement le rôle depuis
// le contexte d'authentification, sans avoir à le passer en paramètre.
// L'union sera étendue avec | { kind: 'rp'; ... } | { kind: 'ac'; ... }.
//
// Cohérent avec le vocabulaire métier : `role` reprend l'enum BD
// (ENSEIGNANT / ETUDIANT) — pas les labels UI (« Enseignant » / « Étudiant »).
import { useCurrentStudent, type CurrentStudent } from './use-current-student';
import { useCurrentTeacher, type CurrentTeacher } from './use-current-teacher';

export type CurrentActor =
  | (CurrentTeacher & { readonly kind: 'teacher' })
  | (CurrentStudent & { readonly kind: 'student' });

export type CurrentActorKind = CurrentActor['kind'];

export function useCurrentActor(kind: 'teacher'): CurrentActor & { readonly kind: 'teacher' };
export function useCurrentActor(kind: 'student'): CurrentActor & { readonly kind: 'student' };
export function useCurrentActor(kind: CurrentActorKind): CurrentActor {
  // Les deux hooks sont stables (constantes hardcodées) — appel inconditionnel
  // OK vis-à-vis des règles de hooks React. Quand l'auth arrivera, ce hook
  // remplacera l'appel direct par un seul useAuth() context.
  const teacher = useCurrentTeacher();
  const student = useCurrentStudent();
  if (kind === 'teacher') {
    return { kind: 'teacher', ...teacher };
  }
  return { kind: 'student', ...student };
}
