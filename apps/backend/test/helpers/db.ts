import type { PrismaClient } from '@prisma/client';
import { seedDatabase } from '../../prisma/seed-data';

/**
 * Wipe every table (foreign-key-safe order) then re-seed the vague-02 dataset.
 * Called in `beforeEach` so each test starts from the known seed state.
 *
 * Ordre de suppression (du plus dépendant au moins dépendant) :
 *  1. SeanceClasse (FK seance + classe)
 *  2. Seance (FK user, classe, module, salle, enseignant)
 *  3. Enseignant (FK user) — supprimé avant User
 *  4. RefreshToken (FK user)
 *  5. User (FK classe)
 *  6. Classe (FK filiere)
 *  7. Module (FK ue)
 *  8. UE, Filiere, Salle, Settings — indépendants
 */
export async function resetDb(prisma: PrismaClient): Promise<void> {
  await prisma.seanceClasse.deleteMany();
  await prisma.seance.deleteMany();
  await prisma.enseignant.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.classe.deleteMany();
  await prisma.module.deleteMany();
  await prisma.uE.deleteMany();
  await prisma.filiere.deleteMany();
  await prisma.salle.deleteMany();
  await prisma.settings.deleteMany();
  await seedDatabase(prisma);
}
