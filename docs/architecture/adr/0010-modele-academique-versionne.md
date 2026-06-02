---
id: ADR-0010
titre: Modèle académique versionné — années, maquettes, versions, modules
statut: ACCEPTÉ
date: 2026-06-02
auteur: salim
vague: 03
---

# ADR-0010 — Modèle académique versionné (années · maquettes · versions · modules)

> **Statut** : Accepté · **Date** : 2026-06-02 · **Vague** : 03 (LOT 0.1) · **Auteur** : Salim (Tech Lead)

## Contexte

La Vague 02 a livré un référentiel **plat** : `Filiere`, `Classe`, `UE`,
`Module`, `Salle`, `Enseignant`. Il manque la notion centrale du métier
ISM : un **programme de formation versionné par année académique**. Sans
cela, impossible de répondre à des questions élémentaires :

- Quels modules compose le L3 GLRS **cette année** vs **l'an dernier** ?
- Combien d'heures CM/TD/TP sont prévues sur le semestre ?
- Comment renouveler un plan d'études d'une année sur l'autre **sans**
  réécrire l'historique ?

La Vague 03 (cf. `vague-03-index.md` V3-D1/D2/D3/D12) introduit ce socle.
Cet ADR fige le **modèle de données** et ses **invariants**. Les ADR-0011
(inscriptions) et ADR-0012 (suivi) s'appuient dessus.

Le design `PLANIT-IA/rp/screens/maquettes.jsx` est la référence visuelle :
un plan d'études se lit en semestres, UE colorées, modules portant
`CM · TD · TP · VHE · TPE · VHT`, avec sous-totaux UE et totaux plan.

## Décision

Quatre entités + deux enums, avec une règle d'**immutabilité
inter-versions** au cœur du modèle.

### 1. `AnneeAcademique` — source de vérité de « l'année courante » (V3-D1)

```
AnneeAcademique {
  id        cuid
  libelle   String  @unique   // « 2025-2026 »
  debut     DateTime
  fin       DateTime
  etat      AnneeEtat @default(PLANIFIEE)
}

enum AnneeEtat { PLANIFIEE  EN_COURS  CLOTUREE  SUSPENDUE }
```

**Invariant fort** : **au plus une** année `EN_COURS` à la fois. Cette
règle n'est **pas** seulement applicative — elle est garantie en base par
un **index unique partiel** Postgres :

```sql
CREATE UNIQUE INDEX "annee_academique_single_en_cours"
  ON "annee_academiques" ("etat")
  WHERE "etat" = 'EN_COURS';
```

Prisma ne sait pas exprimer un index partiel dans le schéma : il est ajouté
en **SQL brut** dans la migration (cf. ADR-0008 pour le précédent
d'injection SQL manuelle). Conséquence : passer une 2ᵉ année à `EN_COURS`
lève une violation de contrainte → le backend la traduit en **409**
(garde testée en LOT 1 A.1).

Helper backend `resolveCurrentYear()` (LOT 0.6, `@planit/utils`) = `findFirst({ where: { etat: 'EN_COURS' } })`. Toutes les
créations (formation, classe) et les filtres par défaut ciblent cette
année.

### 2. `Maquette` / `MaquetteVersion` / `MaquetteModule` (V3-D2)

```
Maquette {                       // identité stable du plan d'études
  id        cuid
  nom       String               // « Maquette GLRS L3 »
  filiereId  -> Filiere
  niveau    Niveau               // L3
  createdAt DateTime             // dates DE LA MAQUETTE (modal M.4)
  updatedAt DateTime
  @@unique([filiereId, niveau, nom])
}

MaquetteVersion {                // une instance par année académique
  id                  cuid
  maquetteId          -> Maquette
  anneeAcademiqueId   -> AnneeAcademique
  @@unique([maquetteId, anneeAcademiqueId])   // 1 version / an / maquette
}

MaquetteModule {                 // module × semestre × heures saisies
  id                  cuid
  maquetteVersionId   -> MaquetteVersion
  moduleId            -> Module
  semestre            Int        // 1 | 2 (rang dans l'année ; libellé S5/S6 dérivé du niveau)
  heuresCM            Int @default(0)
  heuresTD            Int @default(0)
  heuresTP            Int @default(0)
  heuresTPE           Int @default(0)
  @@unique([maquetteVersionId, moduleId])     // un module apparaît 1× par version
}

enum Niveau { L1  L2  L3  M1  M2 }   // Doctorat hors scope V03 (V3-D12)
```

- La **`Maquette`** porte l'identité (nom + filière + niveau) et **ses
  propres dates** — c'est ce que le modal « infos » (M.4) affiche, pas les
  dates d'une version.
- Une **`MaquetteVersion`** matérialise « cette maquette, telle année ».
  Une seule par couple (maquette, année).
- Un **`MaquetteModule`** porte les **heures saisies** (CM/TD/TP/TPE) d'un
  module dans une version, sur un semestre donné.

### 3. Heures dérivées, jamais stockées (V3-D3)

```
VHE = CM + TD + TP          // Volume Horaire Encadré
VHT = VHE + TPE             // Volume Horaire Total
```

`VHE` et `VHT` ne sont **jamais** persistés : seuls `CM/TD/TP/TPE` le sont.
Ils sont calculés à l'affichage par `computeVHE` / `computeVHT`
(`@planit/utils`, LOT 0.6), partagés backend + front pour éviter toute
divergence. Les sous-totaux UE et totaux plan du design sont des sommes de
VHE/VHT par regroupement.

**Pourquoi dériver ?** Une heure dupliquée en base est une heure qui peut
diverger. La saisie est la seule source ; tout le reste est fonction pure
des saisies. Aligné sur le précédent V02 (smart-dirty : on stocke l'état,
on calcule le badge).

### 4. Renouveler = cloner vers l'année courante (V3-D2)

« Renouveler » une maquette = **cloner profondément** sa dernière version
(tous ses `MaquetteModule` avec leurs heures) vers une **nouvelle**
`MaquetteVersion` rattachée à l'année courante.

- Le bouton « Renouveler » n'est visible **que si** aucune version
  n'existe déjà pour l'année courante (sinon `409` côté API — LOT 1 A.3).
- Le clone est **profond** : on duplique les `MaquetteModule`, on ne les
  partage pas. C'est la condition de l'immutabilité (§5).

### 5. Immutabilité inter-versions (invariant central)

> **Modifier les modules d'une version n'affecte JAMAIS une autre
> version.**

Garanti structurellement : chaque `MaquetteModule` appartient à **exactement
une** `MaquetteVersion` (FK simple, pas de partage). « Composer » la
version 2025-2026 (ajout/retrait de module, édition d'heures) crée/modifie/
supprime des lignes `MaquetteModule` portant `maquetteVersionId =
v2025`, sans jamais toucher celles de `v2024`. L'étape 10 du scénario de
démo teste explicitement cette propriété (test d'immutabilité dédié).

## Options envisagées

### Option A — Plan d'études plat (statu quo V02 étendu)

Ajouter `cm/td/tp/tpe` directement sur une table de jonction
`Filiere × Module`. **Rejeté** : aucune notion d'année → impossible de
faire coexister le plan 2024 et 2025, ni de renouveler sans écraser
l'historique. Casse l'exigence métier V3-D2.

### Option B — Versions par _copie de chaîne_ (snapshot JSON)

Stocker chaque version comme un blob JSON figé. **Rejeté** : on perd les
FK (impossible de joindre proprement modules ↔ séances pour le suivi
ADR-0012), les requêtes deviennent du JSON-digging, et l'édition « composer »
devient un patch de blob fragile.

### Option C — Maquette / Version / Module relationnels (retenu)

Trois tables relationnelles + clone profond à la création de version.
**Pour** : FK propres (suivi ADR-0012 joint `MaquetteModule` ↔ `Module` ↔
`Seance`), immutabilité structurelle (FK simple), requêtes SQL naturelles.
**Contre** : le clone profond doit être transactionnel et complet (mitigé
par un test d'immutabilité). **Retenu** — c'est le seul qui satisfait à la
fois versionnement, immutabilité et jointures du suivi.

### Option D — `semestre` comme entité

Modéliser `Semestre` en table. **Rejeté pour V03** : sur-ingénierie. Un
`Int` (1|2) sur `MaquetteModule` suffit ; le libellé d'affichage (S5/S6
pour un L3) est **dérivé du niveau** côté front. Réévaluable si un calendrier
académique par semestre arrive (hors scope, cf. OUT).

## Conséquences

### Positives

- **Source unique de l'année courante** (`AnneeAcademique.EN_COURS`),
  garantie en base, pas seulement en code.
- **Historique préservé** : corriger 2025 ne réécrit pas 2024.
- **Heures non divergentes** : VHE/VHT toujours recalculés depuis la saisie.
- **Jointures naturelles** pour le suivi (ADR-0012) et les formations
  (V3-D4).

### Négatives

- **Clone profond** à maintenir transactionnel (renouveler). Mitigé : un
  seul point d'entrée (`POST /maquettes/:id/renew`) + test d'immutabilité.
- **Pas de partage de modules entre versions** : éditer 2 versions = 2
  éditions. C'est **voulu** (immutabilité), mais ça surprend si on s'attend
  à un héritage. Documenté ici et dans la spec Maquettes.
- **Index partiel hors-Prisma** : la règle « 1 EN_COURS » vit en SQL brut.
  Tout reset/migration doit la reporter — tracé dans la migration.

### À surveiller

- Volume des `MaquetteModule` : ~6-12 modules × 2 semestres × N versions.
  Négligeable.
- Si le métier veut éditer la filière/niveau d'une maquette **après**
  création : recommandation = **figer** filière+niveau (cohérence des
  versions), autoriser le **renommage** seul (à confirmer en M.3).

## Plan de mise en œuvre

| Étape | Livrable                                                                                       | Owner | LOT   |
| ----- | ---------------------------------------------------------------------------------------------- | ----- | ----- |
| A     | Schema Prisma + migration (enums, 4 tables, index partiel SQL)                                 | Salim | 0.4   |
| B     | Contracts Zod (`MaquetteDto`, `MaquetteVersionDto`, `MaquetteModuleDto`, `AnneeAcademiqueDto`) | Salim | 0.5   |
| C     | `computeVHE/VHT`, `resolveCurrentYear` (testés)                                                | Oumar | 0.6   |
| D     | Seed (3 années, maquettes versionnées GLRS L3/L2)                                              | Oumar | 0.7   |
| E     | CRUD années/maquettes/versions + renew + compose                                               | Oumar | LOT 1 |
| F     | Page Maquettes (panneaux, semestres, composer, renouveler)                                     | Oumy  | LOT 3 |

## Décision révisable quand

- Le métier exige des semestres comme entités (calendrier académique).
- Un besoin d'héritage partiel entre versions émerge (rare — irait à
  l'encontre de l'immutabilité, demanderait un nouvel ADR).
- Le Doctorat entre en scope (ajout `D1/D2` à `Niveau`).

## Liens

- V3-D1, V3-D2, V3-D3, V3-D12 (`vague-03-index.md`)
- LOT 0.1 (`vague-03-lots.md`) — tâche source
- ADR-0011 (inscriptions) et ADR-0012 (suivi) — s'appuient sur ce modèle
- ADR-0008 — précédent d'injection SQL manuelle (index/colonnes hors-Prisma)
