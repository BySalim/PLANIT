-- LOT 2 V02 — assouplissement des FK Seance pour permettre :
-- 1) un EVENEMENT V02 sans enseignant interne (intervenant externe via
--    `intervenantNom` libre, cf. V2-D5)
-- 2) un EVENEMENT V02 sans salle (en attendant assignation)
-- ON DELETE SET NULL préserve l'historique séance si la salle/le User
-- est supprimé.

-- DropForeignKey
ALTER TABLE "seances" DROP CONSTRAINT "seances_salleId_fkey";

-- DropForeignKey
ALTER TABLE "seances" DROP CONSTRAINT "seances_teacherId_fkey";

-- AlterTable
ALTER TABLE "seances" ALTER COLUMN "salleId" DROP NOT NULL,
ALTER COLUMN "teacherId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "seances" ADD CONSTRAINT "seances_salleId_fkey" FOREIGN KEY ("salleId") REFERENCES "salles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seances" ADD CONSTRAINT "seances_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
