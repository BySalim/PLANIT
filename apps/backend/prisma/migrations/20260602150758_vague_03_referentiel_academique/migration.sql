-- Vague 03 — LOT 0 référentiel académique (ADR-0010 / 0011 / 0012).
-- Migration **purement additive** : aucun DROP, aucune transformation data.
-- Tout est nullable / defaulté → compatible avec le seed V02 et le service
-- V01/V02 (Classe.filiereId direct + User.classeId conservés en transition).
-- Particularité : un index unique PARTIEL en fin de fichier garantit « au plus
-- une AnneeAcademique EN_COURS » (V3-D1) — Prisma ne sait pas l'exprimer dans
-- le schéma, il est donc écrit en SQL brut ici (cf. ADR-0008 pour le précédent).

-- CreateEnum
CREATE TYPE "Niveau" AS ENUM ('L1', 'L2', 'L3', 'M1', 'M2');

-- CreateEnum
CREATE TYPE "AnneeEtat" AS ENUM ('PLANIFIEE', 'EN_COURS', 'CLOTUREE', 'SUSPENDUE');

-- AlterTable
ALTER TABLE "classes" ADD COLUMN     "capaciteMax" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "formationId" TEXT;

-- AlterTable
ALTER TABLE "salles" ADD COLUMN     "rpResponsableId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "managerRpId" TEXT;

-- CreateTable
CREATE TABLE "annee_academiques" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "debut" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "etat" "AnneeEtat" NOT NULL DEFAULT 'PLANIFIEE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "annee_academiques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maquettes" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "filiereId" TEXT NOT NULL,
    "niveau" "Niveau" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maquettes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maquette_versions" (
    "id" TEXT NOT NULL,
    "maquetteId" TEXT NOT NULL,
    "anneeAcademiqueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maquette_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maquette_modules" (
    "id" TEXT NOT NULL,
    "maquetteVersionId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "semestre" INTEGER NOT NULL,
    "heuresCM" INTEGER NOT NULL DEFAULT 0,
    "heuresTD" INTEGER NOT NULL DEFAULT 0,
    "heuresTP" INTEGER NOT NULL DEFAULT 0,
    "heuresTPE" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maquette_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "niveau" "Niveau" NOT NULL,
    "filiereId" TEXT NOT NULL,
    "anneeAcademiqueId" TEXT NOT NULL,
    "maquetteVersionId" TEXT NOT NULL,
    "isDoubleDiplome" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscriptions" (
    "id" TEXT NOT NULL,
    "etudiantId" TEXT NOT NULL,
    "classeId" TEXT NOT NULL,
    "anneeAcademiqueId" TEXT NOT NULL,
    "isDoubleDiplome" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suivi_modules" (
    "id" TEXT NOT NULL,
    "classeId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "estTermine" BOOLEAN NOT NULL DEFAULT false,
    "termineAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suivi_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_classes" (
    "acId" TEXT NOT NULL,
    "classeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_classes_pkey" PRIMARY KEY ("acId","classeId")
);

-- CreateIndex
CREATE UNIQUE INDEX "annee_academiques_libelle_key" ON "annee_academiques"("libelle");

-- CreateIndex
CREATE INDEX "annee_academiques_etat_idx" ON "annee_academiques"("etat");

-- CreateIndex
CREATE INDEX "maquettes_filiereId_idx" ON "maquettes"("filiereId");

-- CreateIndex
CREATE UNIQUE INDEX "maquettes_filiereId_niveau_nom_key" ON "maquettes"("filiereId", "niveau", "nom");

-- CreateIndex
CREATE INDEX "maquette_versions_anneeAcademiqueId_idx" ON "maquette_versions"("anneeAcademiqueId");

-- CreateIndex
CREATE UNIQUE INDEX "maquette_versions_maquetteId_anneeAcademiqueId_key" ON "maquette_versions"("maquetteId", "anneeAcademiqueId");

-- CreateIndex
CREATE INDEX "maquette_modules_moduleId_idx" ON "maquette_modules"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "maquette_modules_maquetteVersionId_moduleId_key" ON "maquette_modules"("maquetteVersionId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "formations_code_key" ON "formations"("code");

-- CreateIndex
CREATE INDEX "formations_anneeAcademiqueId_idx" ON "formations"("anneeAcademiqueId");

-- CreateIndex
CREATE INDEX "formations_filiereId_idx" ON "formations"("filiereId");

-- CreateIndex
CREATE INDEX "formations_maquetteVersionId_idx" ON "formations"("maquetteVersionId");

-- CreateIndex
CREATE INDEX "inscriptions_classeId_idx" ON "inscriptions"("classeId");

-- CreateIndex
CREATE INDEX "inscriptions_etudiantId_idx" ON "inscriptions"("etudiantId");

-- CreateIndex
CREATE INDEX "inscriptions_anneeAcademiqueId_idx" ON "inscriptions"("anneeAcademiqueId");

-- CreateIndex
CREATE UNIQUE INDEX "inscriptions_etudiantId_classeId_anneeAcademiqueId_key" ON "inscriptions"("etudiantId", "classeId", "anneeAcademiqueId");

-- CreateIndex
CREATE UNIQUE INDEX "inscriptions_etudiantId_anneeAcademiqueId_isDoubleDiplome_key" ON "inscriptions"("etudiantId", "anneeAcademiqueId", "isDoubleDiplome");

-- CreateIndex
CREATE INDEX "suivi_modules_classeId_idx" ON "suivi_modules"("classeId");

-- CreateIndex
CREATE INDEX "suivi_modules_moduleId_idx" ON "suivi_modules"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "suivi_modules_classeId_moduleId_key" ON "suivi_modules"("classeId", "moduleId");

-- CreateIndex
CREATE INDEX "assistant_classes_classeId_idx" ON "assistant_classes"("classeId");

-- CreateIndex
CREATE INDEX "classes_formationId_idx" ON "classes"("formationId");

-- CreateIndex
CREATE INDEX "salles_rpResponsableId_idx" ON "salles"("rpResponsableId");

-- CreateIndex
CREATE INDEX "users_managerRpId_idx" ON "users"("managerRpId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_managerRpId_fkey" FOREIGN KEY ("managerRpId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "formations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salles" ADD CONSTRAINT "salles_rpResponsableId_fkey" FOREIGN KEY ("rpResponsableId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maquettes" ADD CONSTRAINT "maquettes_filiereId_fkey" FOREIGN KEY ("filiereId") REFERENCES "filieres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maquette_versions" ADD CONSTRAINT "maquette_versions_maquetteId_fkey" FOREIGN KEY ("maquetteId") REFERENCES "maquettes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maquette_versions" ADD CONSTRAINT "maquette_versions_anneeAcademiqueId_fkey" FOREIGN KEY ("anneeAcademiqueId") REFERENCES "annee_academiques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maquette_modules" ADD CONSTRAINT "maquette_modules_maquetteVersionId_fkey" FOREIGN KEY ("maquetteVersionId") REFERENCES "maquette_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maquette_modules" ADD CONSTRAINT "maquette_modules_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formations" ADD CONSTRAINT "formations_filiereId_fkey" FOREIGN KEY ("filiereId") REFERENCES "filieres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formations" ADD CONSTRAINT "formations_anneeAcademiqueId_fkey" FOREIGN KEY ("anneeAcademiqueId") REFERENCES "annee_academiques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formations" ADD CONSTRAINT "formations_maquetteVersionId_fkey" FOREIGN KEY ("maquetteVersionId") REFERENCES "maquette_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscriptions" ADD CONSTRAINT "inscriptions_etudiantId_fkey" FOREIGN KEY ("etudiantId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscriptions" ADD CONSTRAINT "inscriptions_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscriptions" ADD CONSTRAINT "inscriptions_anneeAcademiqueId_fkey" FOREIGN KEY ("anneeAcademiqueId") REFERENCES "annee_academiques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suivi_modules" ADD CONSTRAINT "suivi_modules_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suivi_modules" ADD CONSTRAINT "suivi_modules_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_classes" ADD CONSTRAINT "assistant_classes_acId_fkey" FOREIGN KEY ("acId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_classes" ADD CONSTRAINT "assistant_classes_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Partial unique index (hors-Prisma) : au plus UNE année académique EN_COURS à
-- la fois (V3-D1 / ADR-0010 §1). Toute tentative de passer une 2ᵉ année à
-- EN_COURS viole cette contrainte → le backend la traduit en 409 (LOT 1 A.1).
CREATE UNIQUE INDEX "annee_academique_single_en_cours" ON "annee_academiques" ("etat") WHERE "etat" = 'EN_COURS';
