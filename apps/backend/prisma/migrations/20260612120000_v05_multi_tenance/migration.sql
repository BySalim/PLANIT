-- V05 — Multi-tenance par École (ADR-0019 / ADR-0020).
-- Migration scriptée : additive → backfill « École d'Ingénieurs » → durcissement
-- NOT NULL → index partiel « 1 EN_COURS PAR école ». Hand-éditée : le backfill
-- s'intercale entre ADD COLUMN nullable et SET NOT NULL (Prisma ne sait pas le
-- générer pour une colonne requise ajoutée à une table peuplée).

-- ── Enums ────────────────────────────────────────────────────────────────────
CREATE TYPE "UserStatut" AS ENUM ('EN_ATTENTE', 'ACTIF', 'SUSPENDU');
CREATE TYPE "EcoleStatut" AS ENUM ('ACTIVE', 'ARCHIVEE');
ALTER TYPE "Role" ADD VALUE 'DIRECTION';

-- ── Nouvelles tables ─────────────────────────────────────────────────────────
CREATE TABLE "ecoles" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "statut" "EcoleStatut" NOT NULL DEFAULT 'ACTIVE',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ecoles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "ecoleId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- ── École pilote (cible du backfill) ─────────────────────────────────────────
INSERT INTO "ecoles" ("id", "nom", "statut", "createdAt", "updatedAt")
VALUES ('ecole_ism', 'École d''Ingénieurs', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ── Colonnes ecoleId (nullable d'abord) + nouveaux champs ────────────────────
ALTER TABLE "users"
  ADD COLUMN "ecoleId" TEXT,
  ADD COLUMN "statut" "UserStatut" NOT NULL DEFAULT 'ACTIF';
ALTER TABLE "filieres"
  ADD COLUMN "ecoleId" TEXT,
  ADD COLUMN "responsableRpId" TEXT;
ALTER TABLE "salles" ADD COLUMN "ecoleId" TEXT;
ALTER TABLE "enseignants" ADD COLUMN "ecoleId" TEXT;
ALTER TABLE "annee_academiques" ADD COLUMN "ecoleId" TEXT;

-- ── Backfill : tout l'existant V03 → école pilote ───────────────────────────
UPDATE "filieres" SET "ecoleId" = 'ecole_ism' WHERE "ecoleId" IS NULL;
UPDATE "salles" SET "ecoleId" = 'ecole_ism' WHERE "ecoleId" IS NULL;
UPDATE "enseignants" SET "ecoleId" = 'ecole_ism' WHERE "ecoleId" IS NULL;
UPDATE "annee_academiques" SET "ecoleId" = 'ecole_ism' WHERE "ecoleId" IS NULL;
-- Les comptes existants (RP/AC/enseignant/étudiant) appartiennent à l'école
-- pilote ; ADMIN/SUPER_ADMIN restent ecoleId NULL (cross-école).
UPDATE "users" SET "ecoleId" = 'ecole_ism'
  WHERE "ecoleId" IS NULL AND "role" NOT IN ('ADMIN', 'SUPER_ADMIN');

-- ── Durcissement NOT NULL après backfill ────────────────────────────────────
ALTER TABLE "filieres" ALTER COLUMN "ecoleId" SET NOT NULL;
ALTER TABLE "salles" ALTER COLUMN "ecoleId" SET NOT NULL;
ALTER TABLE "enseignants" ALTER COLUMN "ecoleId" SET NOT NULL;
ALTER TABLE "annee_academiques" ALTER COLUMN "ecoleId" SET NOT NULL;

-- ── Uniques globales → uniques par école ────────────────────────────────────
DROP INDEX "annee_academiques_libelle_key";
DROP INDEX "salles_name_key";

-- ── Index partiel « 1 EN_COURS » : global (V03) → par école (V05, ADR-0019 §2)
DROP INDEX IF EXISTS "annee_academique_single_en_cours";
CREATE UNIQUE INDEX "annee_academique_single_en_cours_per_ecole"
  ON "annee_academiques" ("ecoleId") WHERE "etat" = 'EN_COURS';

-- ── Index + uniques (générés par Prisma) ────────────────────────────────────
CREATE UNIQUE INDEX "ecoles_nom_key" ON "ecoles"("nom");
CREATE INDEX "audit_logs_ecoleId_createdAt_idx" ON "audit_logs"("ecoleId", "createdAt");
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "annee_academiques_ecoleId_idx" ON "annee_academiques"("ecoleId");
CREATE UNIQUE INDEX "annee_academiques_ecoleId_libelle_key" ON "annee_academiques"("ecoleId", "libelle");
CREATE INDEX "enseignants_ecoleId_idx" ON "enseignants"("ecoleId");
CREATE INDEX "filieres_ecoleId_idx" ON "filieres"("ecoleId");
CREATE INDEX "filieres_responsableRpId_idx" ON "filieres"("responsableRpId");
CREATE INDEX "salles_ecoleId_idx" ON "salles"("ecoleId");
CREATE UNIQUE INDEX "salles_ecoleId_name_key" ON "salles"("ecoleId", "name");
CREATE INDEX "users_ecoleId_idx" ON "users"("ecoleId");

-- ── Foreign keys ────────────────────────────────────────────────────────────
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "ecoles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "filieres" ADD CONSTRAINT "filieres_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "ecoles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "filieres" ADD CONSTRAINT "filieres_responsableRpId_fkey" FOREIGN KEY ("responsableRpId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "salles" ADD CONSTRAINT "salles_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "ecoles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enseignants" ADD CONSTRAINT "enseignants_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "ecoles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "annee_academiques" ADD CONSTRAINT "annee_academiques_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "ecoles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
