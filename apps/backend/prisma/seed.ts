import { PrismaClient } from '@prisma/client';
import { seedDatabase } from './seed-data';

// Prisma seed CLI entry point (referenced by package.json#prisma.seed).
// The actual dataset lives in seed-data.ts so it can be reused by the
// integration test `resetDb` helper.

const prisma = new PrismaClient();

seedDatabase(prisma)
  .then(() => {
    console.log(
      'Seed complete (vague-02): 2 filières, 3 classes, 1 RP, 3 enseignants, 1 étudiant (argon2id), ' +
        '3 UE, 6 modules, 4 salles, settings singleton, 10 séances (incl. 1 multi-classes + 1 évaluation + 2 drafts).',
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
