import type { PrismaClient } from '@prisma/client';
import { seedDatabase } from '../../prisma/seed-data';

/**
 * Wipe every table (foreign-key-safe order) then re-seed the vague-01 dataset.
 * Called in `beforeEach` so each test starts from the known seed state.
 */
export async function resetDb(prisma: PrismaClient): Promise<void> {
  await prisma.seance.deleteMany();
  await prisma.user.deleteMany();
  await prisma.classe.deleteMany();
  await prisma.module.deleteMany();
  await prisma.salle.deleteMany();
  await seedDatabase(prisma);
}
