-- Vague 02 — LOT 0 foundations (ADR-0007 auth + ADR-0008 smart dirty).
-- Migration **purement additive** : aucun DROP, aucune transformation data.
-- Le schéma reste compatible avec le SeanceService V01 (champs `type`,
-- `status`, `classeId`, `teacherId` conservés) ; les nouveaux champs et tables
-- préparent le LOT 2 V02 (Oumar) qui finalisera la transition.

-- CreateEnum
CREATE TYPE "SessionTypeV2" AS ENUM ('COURS', 'EVALUATION', 'EVENEMENT');

-- CreateEnum
CREATE TYPE "SessionSousType" AS ENUM ('CM', 'TD', 'TP', 'EXAMEN', 'RATTRAPAGE', 'DEVOIR');

-- CreateEnum
CREATE TYPE "EnseignantStatut" AS ENUM ('PERMANENT', 'VACATAIRE');

-- CreateEnum
CREATE TYPE "FiliereGrade" AS ENUM ('LICENCE', 'MASTER', 'DOCTORAT');

-- AlterTable: users — matricule ISM affichage-only (cf. ADR-0007 §4)
ALTER TABLE "users" ADD COLUMN "matricule" TEXT;

-- AlterTable: classes — FK Filiere optionnelle (peuplée par le seed)
ALTER TABLE "classes" ADD COLUMN "filiereId" TEXT;

-- AlterTable: modules — V02 introduit libelle/color/ueId (defaults pour rétro-compat)
ALTER TABLE "modules" ADD COLUMN "color" TEXT NOT NULL DEFAULT '#64748B',
ADD COLUMN "libelle" TEXT NOT NULL DEFAULT '',
ADD COLUMN "ueId" TEXT;

-- AlterTable: seances — V02 smart dirty + nouvelles colonnes (cf. ADR-0008)
ALTER TABLE "seances" ADD COLUMN "description" TEXT,
ADD COLUMN "enseignantId" TEXT,
ADD COLUMN "hasUnpublishedChanges" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "intervenantNom" TEXT,
ADD COLUMN "libelle" TEXT NOT NULL DEFAULT '',
ADD COLUMN "publishedSnapshot" JSONB,
ADD COLUMN "sousType" "SessionSousType",
ADD COLUMN "typeV2" "SessionTypeV2";

-- CreateTable: refresh_tokens (cf. ADR-0005 §5 / ADR-0007)
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedBy" TEXT,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable: filieres
CREATE TABLE "filieres" (
    "id" TEXT NOT NULL,
    "sigle" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "isDoubleDiplome" BOOLEAN NOT NULL DEFAULT false,
    "grade" "FiliereGrade" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "filieres_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ues
CREATE TABLE "ues" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ues_pkey" PRIMARY KEY ("id")
);

-- CreateTable: enseignants (1-1 avec users)
CREATE TABLE "enseignants" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nomComplet" TEXT NOT NULL,
    "emailInstitutionnel" TEXT NOT NULL,
    "whatsapp" TEXT,
    "statut" "EnseignantStatut" NOT NULL,
    "specialite" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enseignants_pkey" PRIMARY KEY ("id")
);

-- CreateTable: settings (singleton — id = 'singleton')
CREATE TABLE "settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "dayStartHour" INTEGER NOT NULL DEFAULT 8,
    "dayEndHour" INTEGER NOT NULL DEFAULT 20,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: seance_classes (N-N V2-D6)
CREATE TABLE "seance_classes" (
    "seanceId" TEXT NOT NULL,
    "classeId" TEXT NOT NULL,

    CONSTRAINT "seance_classes_pkey" PRIMARY KEY ("seanceId","classeId")
);

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_hash_key" ON "refresh_tokens"("hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_revokedAt_idx" ON "refresh_tokens"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "refresh_tokens_familyId_idx" ON "refresh_tokens"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "filieres_sigle_key" ON "filieres"("sigle");

-- CreateIndex
CREATE UNIQUE INDEX "ues_code_key" ON "ues"("code");

-- CreateIndex
CREATE UNIQUE INDEX "enseignants_userId_key" ON "enseignants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "enseignants_emailInstitutionnel_key" ON "enseignants"("emailInstitutionnel");

-- CreateIndex
CREATE INDEX "seance_classes_classeId_idx" ON "seance_classes"("classeId");

-- CreateIndex
CREATE INDEX "modules_ueId_idx" ON "modules"("ueId");

-- CreateIndex
CREATE INDEX "seances_isPublished_hasUnpublishedChanges_idx" ON "seances"("isPublished", "hasUnpublishedChanges");

-- CreateIndex
CREATE UNIQUE INDEX "users_matricule_key" ON "users"("matricule");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_filiereId_fkey" FOREIGN KEY ("filiereId") REFERENCES "filieres"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_ueId_fkey" FOREIGN KEY ("ueId") REFERENCES "ues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enseignants" ADD CONSTRAINT "enseignants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seances" ADD CONSTRAINT "seances_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "enseignants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seance_classes" ADD CONSTRAINT "seance_classes_seanceId_fkey" FOREIGN KEY ("seanceId") REFERENCES "seances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seance_classes" ADD CONSTRAINT "seance_classes_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
