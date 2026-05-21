import { PrismaClient } from '@prisma/client';
import { seedDatabase } from './seed-data';

// Prisma seed CLI entry point (referenced by package.json#prisma.seed).
// The actual dataset lives in seed-data.ts so it can be reused by the
// integration test `resetDb` helper.

const prisma = new PrismaClient();

seedDatabase(prisma)
  .then(() => {
    console.log(
      'Seed complete (vague-01): 1 RP, 3 enseignants, 1 étudiant, 1 classe, 3 modules, 3 salles, 6 séances.',
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
