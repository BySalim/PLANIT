---
id: ADR-0019
titre: Multi-tenance par École — entité Ecole, ecoleId, scope serveur
statut: ACCEPTÉ
date: 2026-06-12
auteur: salim
vague: 05
---

# ADR-0019 — Multi-tenance par École

> **Statut** : Accepté · **Date** : 2026-06-12 · **Vague** : 05 (LOT 0.1) · **Auteur** : Salim (Tech Lead)
>
> ⚠️ Le fichier `vague-05-lots.md` référence cet ADR sous le numéro « ADR-0015 ». Cette numérotation est **périmée** : V04 a consommé 0015 (beta Cloudflare), 0016 (staging), 0017 (prod), 0018 (maquette). Le multi-tenance École prend donc **ADR-0019**, et les acteurs Direction/Admin **ADR-0020** (cf. [ADR-0020](0020-acteurs-direction-admin.md)).

## Contexte

PLANIT a été conçu **mono-tenant implicite** : toutes les entités du référentiel (`User`, `Filiere`, `Salle`, `Enseignant`, `AnneeAcademique`) appartiennent à une seule école — « École d'Ingénieurs » (ISM, Dakar). La V05 introduit la **multi-tenance par École** : la plateforme doit héberger plusieurs écoles **étanches** entre elles, avec un acteur **Direction** scopé à son école et un acteur **Admin système** cross-école.

L'enjeu central n'est pas l'UI mais l'**isolation** : aucune donnée d'une école ne doit fuiter vers une autre. La V05 est « Done » seulement quand cette isolation est **prouvée par des tests**.

## Décision

### 1. Entité `Ecole` + `ecoleId` sur les racines de scope

Une nouvelle entité `Ecole` (`id`, `nom`, `statut`, `archivedAt?`, timestamps). On ajoute `ecoleId` **uniquement sur les racines de chaîne** :

| Entité            | `ecoleId`               | Justification                                                                                                             |
| ----------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `User`            | **nullable**            | `null` pour `ADMIN`/`SUPER_ADMIN` (cross-école) ; **requis** pour tous les autres rôles (résolu applicativement, cf. §3). |
| `Filiere`         | requis (après backfill) | racine de la chaîne académique.                                                                                           |
| `Salle`           | requis (après backfill) | ressource physique d'une école.                                                                                           |
| `Enseignant`      | requis (après backfill) | personnel d'une école.                                                                                                    |
| `AnneeAcademique` | requis (après backfill) | calendrier propre à chaque école (cf. §2).                                                                                |

**Les autres entités héritent du scope par leurs FK**, sans colonne `ecoleId` redondante :

```
Classe        → Formation → Filiere → ecoleId
Inscription   → Classe    → …       → ecoleId
SuiviModule   → Classe    → …       → ecoleId
MaquetteVersion → Maquette → Filiere → ecoleId
```

On ne dénormalise **pas** `ecoleId` sur ces entités : la chaîne de FK est courte, indexée, et le scope se résout par un `where` sur la jointure. (Contraste avec `Inscription.isDoubleDiplome`, dénormalisé lui parce qu'un `@@unique` Postgres ne traverse pas une jointure — ici on n'a pas besoin de contrainte d'unicité inter-écoles.)

### 2. Année académique par école

La règle V03 « **au plus une** `AnneeAcademique` `EN_COURS` » devient « **au plus une `EN_COURS` par école** ». L'index unique partiel Postgres passe de :

```sql
CREATE UNIQUE INDEX ... ON "annee_academiques" ("etat") WHERE "etat" = 'EN_COURS';
```

à un index **sur `(ecoleId)`** :

```sql
CREATE UNIQUE INDEX "annee_academique_single_en_cours_per_ecole"
  ON "annee_academiques" ("ecoleId") WHERE "etat" = 'EN_COURS';
```

Conséquence code : `resolveCurrentYear()` (`@planit/utils`) devient **`resolveCurrentYear(ecoleId)`**. Tous les appels existants doivent passer un `ecoleId` (migration mécanique, LOT 0.5).

### 3. Scope résolu côté serveur, jamais en UI

- `CurrentUserPayload += ecoleId` (`auth/decorators/current-user.decorator.ts`), embarqué dans le JWT (pas de hit BD).
- Un `DirectionScopeService` (cf. [ADR-0020](0020-acteurs-direction-admin.md)), calqué sur `ac-scope.service.ts`, filtre **toutes** les lectures Direction par `ecoleId = user.ecoleId`.
- Les `ADMIN`/`SUPER_ADMIN` (`ecoleId = null`) ne sont **pas** scopés (ils opèrent cross-école) — c'est le RBAC `@Roles` qui borne leur accès.
- **Le filtrage est toujours un `where` serveur**, jamais un masquage front. Test de non-régression obligatoire : un acteur de l'école A qui passe un `?ecoleId=B` ou un id d'une autre école → **403/filtré**.

### 4. Migration scriptée + backfill

Migration **additive puis durcie**, en une migration scriptée :

1. Créer la table `Ecole` + insérer **« École d'Ingénieurs »** (id stable, ex. `ecole_ism`).
2. Ajouter les colonnes `ecoleId` **nullable** sur `User`, `Filiere`, `Salle`, `Enseignant`, `AnneeAcademique`.
3. **Backfill** : `UPDATE` toutes les lignes existantes (sauf `User` admin) avec l'id de l'école pilote.
4. Poser `NOT NULL` sur `Filiere/Salle/Enseignant/AnneeAcademique.ecoleId` (User reste nullable pour les admins).
5. Remplacer l'index partiel année par sa variante par-école.
6. Index FK sur chaque `ecoleId`.

Le seed v5 (LOT 0.6) crée **2 écoles** : l'école pilote (complète, jeu V03 rattaché) + une 2ᵉ école **minimale** dont le seul rôle est de **prouver l'isolation** par les tests.

> ⚠️ `prisma migrate reset` n'est pas exécutable en autonomie (cf. mémoire projet) — la migration est validée par `migrate dev` + `db seed`, le `reset` complet est lancé par un humain.

## Conséquences

- **+** Isolation structurelle : ajouter `ecoleId` aux racines suffit, les chaînes héritent. Peu de colonnes, scope centralisé.
- **+** Réutilise la mécanique de scope éprouvée en V03 (AC).
- **−** Tous les appels `resolveCurrentYear()` doivent être migrés (passage d'`ecoleId`). Risque d'oubli → couvert par le typecheck (signature changée).
- **−** Le backfill suppose que **tout** l'existant appartient à l'école pilote. Confirmé (aucune donnée cross-école hors admins).

## Alternatives écartées

- **`ecoleId` dénormalisé sur toutes les entités** : redondant, risque d'incohérence, alourdit chaque écriture. Rejeté — la chaîne de FK suffit.
- **Base par école (schema-per-tenant / DB-per-tenant)** : sur-ingénierie pour l'échelle visée (quelques écoles), complexifie migrations, seed, backups. Rejeté — un seul schéma + colonne de tenant.
- **Scope masqué côté front** : inacceptable (fuite triviale). Le scope est serveur, point.
