import { PrismaClient } from '@prisma/client';
import { seedDatabase } from './seed-data';

// Prisma seed CLI entry point (referenced by package.json#prisma.seed).
// The actual dataset lives in seed-data.ts so it can be reused by the
// integration test `resetDb` helper.

const prisma = new PrismaClient();

seedDatabase(prisma)
  .then(() => {
    console.log(
      'Seed complete (vague-03): socle V02 (2 filières, classes, RP, 3 enseignants, ' +
        '3 UE, 6 modules, 4 salles, 10 séances) + V03 : 3 années (2025-2026 EN_COURS), ' +
        '2ᵉ RP + 1 AC, 6 étudiants, 4 maquettes versionnées, 4 formations, classes ' +
        '(formation + capacité) dont 1 MASTER double-diplôme, salles rpResponsable, ' +
        '5 inscriptions (dont 1 double-diplôme + 1 historique), suivi des modules.',
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
