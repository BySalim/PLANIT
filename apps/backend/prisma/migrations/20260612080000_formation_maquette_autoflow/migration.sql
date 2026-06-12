-- ADR-0018 — Maquette pilotée par la formation + double-diplôme au niveau filière.
--
--  * `formations.isDoubleDiplome` retiré (la catégorie double-diplôme est portée
--    par la filière et dérivée à l'affichage / l'inscription).
--  * Maquette : unicité ramenée à (filiereId, niveau) — le nom est dérivé.
--  * Formation : au plus une par (filiereId, niveau, anneeAcademiqueId).
--
-- NB : l'index unique partiel `AnneeAcademique WHERE etat = 'EN_COURS'` (SQL brut
-- d'une migration antérieure) n'est PAS touché par cette migration.

-- DropIndex
DROP INDEX "maquettes_filiereId_niveau_nom_key";

-- AlterTable
ALTER TABLE "formations" DROP COLUMN "isDoubleDiplome";

-- CreateIndex
CREATE UNIQUE INDEX "formations_filiereId_niveau_anneeAcademiqueId_key" ON "formations"("filiereId", "niveau", "anneeAcademiqueId");

-- CreateIndex
CREATE UNIQUE INDEX "maquettes_filiereId_niveau_key" ON "maquettes"("filiereId", "niveau");
