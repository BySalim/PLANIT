// Référentiels hardcodés pour les formulaires Vague 01.
// TODO[VAGUE-02]: exposer /api/classes /api/modules /api/salles /api/teachers
// et remplacer ces constantes par des queries TanStack.
//
// Source : apps/backend/prisma/seed-data.ts (Vague 01).

export const seedClasses = [
  { id: 'seed-classe-gl3a', label: 'GL3-A — Génie Logiciel 3ème année A' },
] as const;

export const seedModules = [
  { id: 'seed-module-algo', label: 'ALGO — Algorithmique Avancée' },
  { id: 'seed-module-bdd', label: 'BDD — Bases de Données' },
  { id: 'seed-module-net', label: 'NET — Réseaux Informatiques' },
] as const;

export const seedSalles = [
  { id: 'seed-salle-amphi', label: 'Amphi A' },
  { id: 'seed-salle-201', label: 'Salle 201' },
  { id: 'seed-salle-labo', label: 'Labo Informatique' },
] as const;

export const seedTeachers = [
  { id: 'seed-teacher-algo', label: 'M. Oumar Ndiaye (ALGO)' },
  { id: 'seed-teacher-bdd', label: 'Mme Fatou Sall (BDD)' },
  { id: 'seed-teacher-net', label: 'M. Cheikh Diop (NET)' },
] as const;
