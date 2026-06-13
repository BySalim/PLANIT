import type { PrismaClient } from '@prisma/client';
import { seedDatabase } from '../../prisma/seed-data';

/**
 * Wipe every table (foreign-key-safe order) then re-seed the dataset.
 * Called in `beforeEach` so each test starts from the known seed state.
 *
 * Ordre de suppression (du plus dépendant au moins dépendant). V03 ajoute des
 * FK `Restrict` (MaquetteModule/SuiviModule → Module, Maquette/Formation →
 * Filiere, MaquetteVersion/Formation/Inscription → AnneeAcademique, Formation →
 * MaquetteVersion) : ces tables doivent donc être purgées AVANT leurs parents,
 * sinon le `deleteMany()` du parent viole la contrainte.
 *  1. SeanceClasse (FK seance + classe)
 *  2. Seance (FK user, classe, module, salle, enseignant)
 *  3. SuiviModule (FK classe + module)
 *  4. Inscription (FK user + classe + annee)
 *  5. AssistantClasse (FK user + classe)
 *  6. MaquetteModule (FK version + module)
 *  7. Formation (FK filiere + annee + version)
 *  8. MaquetteVersion (FK maquette + annee)
 *  9. Maquette (FK filiere)
 * 10. Enseignant (FK user) — avant User
 * 11. RefreshToken (FK user)
 * 12. User (FK classe + manager self)
 * 13. Classe (FK filiere + formation)
 * 14. Module (FK ue)
 * 15. AnneeAcademique
 * 16. UE, Filiere, Salle, Settings — indépendants
 */
export async function resetDb(prisma: PrismaClient): Promise<void> {
  await prisma.seanceClasse.deleteMany();
  await prisma.seance.deleteMany();
  // V03 — dépendants de classe/module/annee/version (avant leurs parents).
  await prisma.suiviModule.deleteMany();
  await prisma.inscription.deleteMany();
  await prisma.assistantClasse.deleteMany();
  await prisma.maquetteModule.deleteMany();
  await prisma.formation.deleteMany();
  await prisma.maquetteVersion.deleteMany();
  await prisma.maquette.deleteMany();
  await prisma.enseignant.deleteMany();
  await prisma.refreshToken.deleteMany();
  // V05 — AuditLog.actorId → User (Restrict) : purger avant les users sinon
  // `user.deleteMany()` viole la contrainte dès qu'une action a été tracée.
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.classe.deleteMany();
  await prisma.module.deleteMany();
  await prisma.anneeAcademique.deleteMany();
  await prisma.uE.deleteMany();
  await prisma.filiere.deleteMany();
  await prisma.salle.deleteMany();
  await prisma.settings.deleteMany();
  // V05 — `Ecole` en dernier (toutes les tables à `ecoleId` viennent d'être
  // purgées) ; isole les écoles créées par un test du suivant.
  await prisma.ecole.deleteMany();
  await seedDatabase(prisma);
}
