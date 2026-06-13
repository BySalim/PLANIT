-- V05 LOT 6 — Espaces de travail RP isolés (ADR-0022)
-- Additive : colonnes ownerRpId nullable, UE.ecoleId, Salle.isSubjective,
-- unicités code/sigle scopées (owner/école). Backfill prod = hors scope (TD).

-- DropIndex
DROP INDEX "classes_code_key";

-- DropIndex
DROP INDEX "filieres_sigle_key";

-- DropIndex
DROP INDEX "modules_code_key";

-- DropIndex
DROP INDEX "ues_code_key";

-- AlterTable
ALTER TABLE "classes" ADD COLUMN     "ownerRpId" TEXT;

-- AlterTable
ALTER TABLE "filieres" ADD COLUMN     "ownerRpId" TEXT;

-- AlterTable
ALTER TABLE "maquettes" ADD COLUMN     "ownerRpId" TEXT;

-- AlterTable
ALTER TABLE "modules" ADD COLUMN     "ownerRpId" TEXT;

-- AlterTable
ALTER TABLE "salles" ADD COLUMN     "isSubjective" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ownerRpId" TEXT;

-- AlterTable
ALTER TABLE "seances" ADD COLUMN     "ownerRpId" TEXT;

-- AlterTable
ALTER TABLE "ues" ADD COLUMN     "ecoleId" TEXT,
ADD COLUMN     "ownerRpId" TEXT;

-- CreateIndex
CREATE INDEX "classes_ownerRpId_idx" ON "classes"("ownerRpId");

-- CreateIndex
CREATE UNIQUE INDEX "classes_ownerRpId_code_key" ON "classes"("ownerRpId", "code");

-- CreateIndex
CREATE INDEX "filieres_ownerRpId_idx" ON "filieres"("ownerRpId");

-- CreateIndex
CREATE UNIQUE INDEX "filieres_ecoleId_sigle_key" ON "filieres"("ecoleId", "sigle");

-- CreateIndex
CREATE INDEX "maquettes_ownerRpId_idx" ON "maquettes"("ownerRpId");

-- CreateIndex
CREATE INDEX "modules_ownerRpId_idx" ON "modules"("ownerRpId");

-- CreateIndex
CREATE UNIQUE INDEX "modules_ownerRpId_code_key" ON "modules"("ownerRpId", "code");

-- CreateIndex
CREATE INDEX "salles_ownerRpId_idx" ON "salles"("ownerRpId");

-- CreateIndex
CREATE INDEX "seances_ownerRpId_startAt_idx" ON "seances"("ownerRpId", "startAt");

-- CreateIndex
CREATE INDEX "ues_ecoleId_idx" ON "ues"("ecoleId");

-- CreateIndex
CREATE INDEX "ues_ownerRpId_idx" ON "ues"("ownerRpId");

-- CreateIndex
CREATE UNIQUE INDEX "ues_ownerRpId_code_key" ON "ues"("ownerRpId", "code");

-- AddForeignKey
ALTER TABLE "filieres" ADD CONSTRAINT "filieres_ownerRpId_fkey" FOREIGN KEY ("ownerRpId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_ownerRpId_fkey" FOREIGN KEY ("ownerRpId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ues" ADD CONSTRAINT "ues_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "ecoles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ues" ADD CONSTRAINT "ues_ownerRpId_fkey" FOREIGN KEY ("ownerRpId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_ownerRpId_fkey" FOREIGN KEY ("ownerRpId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salles" ADD CONSTRAINT "salles_ownerRpId_fkey" FOREIGN KEY ("ownerRpId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seances" ADD CONSTRAINT "seances_ownerRpId_fkey" FOREIGN KEY ("ownerRpId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maquettes" ADD CONSTRAINT "maquettes_ownerRpId_fkey" FOREIGN KEY ("ownerRpId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

