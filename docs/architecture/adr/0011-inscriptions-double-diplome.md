---
id: ADR-0011
titre: Inscriptions étudiants + règle double-diplôme
statut: ACCEPTÉ
date: 2026-06-02
auteur: salim
vague: 03
---

# ADR-0011 — Inscriptions étudiants + règle double-diplôme

> **Statut** : Accepté · **Date** : 2026-06-02 · **Vague** : 03 (LOT 0.2) · **Auteur** : Salim (Tech Lead)

## Contexte

En V02, un étudiant est un `User(role ETUDIANT)` rattaché à **une** classe
via `User.classeId` (FK directe). Ce modèle ne tient pas pour V03 :

- Un étudiant a une **histoire** : il était en GL2-A en 2024-2025, il est
  en GL3-A en 2025-2026. `classeId` n'en garde qu'une.
- L'ISM pratique le **double-diplôme** : un même étudiant peut suivre **deux**
  cursus la même année (ex. une licence GLRS **et** un master GL en
  double-diplôme). `classeId` unique l'interdit.
- La fiche étudiant (LOT 5) doit afficher l'**historique d'inscriptions**
  par année.

V3-D6/D7 tranchent : on introduit une entité **`Inscription`** (etudiant ×
classe × année) et la **seule** porte d'entrée d'un nouvel étudiant est
l'inscription depuis une classe (pas de création directe d'étudiant). Cet
ADR fige le modèle, la **règle double-diplôme** et son **enforcement**, et
le **flow d'inscription par email**.

## Décision

### 1. Entité `Inscription` (V3-D7)

```
Inscription {
  id                  cuid
  etudiantId          -> User (role ETUDIANT)
  classeId            -> Classe
  anneeAcademiqueId   -> AnneeAcademique
  isDoubleDiplome     Boolean        // DÉNORMALISÉ depuis la formation de la classe
  createdAt           DateTime       // date d'inscription
  updatedAt           DateTime

  @@unique([etudiantId, classeId, anneeAcademiqueId])              // anti-doublon strict
  @@unique([etudiantId, anneeAcademiqueId, isDoubleDiplome])       // règle DD (cœur)
  @@index([classeId])
  @@index([etudiantId])
}
```

### 2. Règle double-diplôme — enforcement **en base** (V3-D7)

> Un étudiant a **au plus 1** classe **non-double-diplôme** **et au plus 1**
> classe **double-diplôme** par année (≤ 2 inscriptions/an ; 1:1 par
> catégorie).

L'enforcement **ne repose pas** sur du code applicatif seul (contournable,
sujet aux races). Il est porté par une **contrainte d'unicité composite** :

```
@@unique([etudiantId, anneeAcademiqueId, isDoubleDiplome])
```

`isDoubleDiplome` est **dénormalisé** sur l'`Inscription` (recopié depuis
`Formation.isDoubleDiplome` de la classe au moment de l'inscription). La
contrainte garantit alors mécaniquement :

- `(etudiant, 2025-2026, false)` unique → 1 seule classe non-DD/an.
- `(etudiant, 2025-2026, true)` unique → 1 seule classe DD/an.
- Les deux coexistent → **≤ 2** inscriptions/an, **1 par catégorie**.

Toute violation lève une contrainte unique Postgres → le backend la traduit
en **409** (« déjà inscrit dans une classe de cette catégorie cette
année »). Testé en LOT 2 B.9.

**Pourquoi dénormaliser `isDoubleDiplome` ?** Parce que la contrainte
d'unicité a besoin de la valeur **sur la ligne** `Inscription` — Postgres
ne peut pas indexer à travers une jointure (`classe → formation →
isDoubleDiplome`). Le coût (recopie à l'inscription) est trivial ; le
bénéfice (règle métier garantie par la base) est majeur. C'est le même
arbitrage que le smart-dirty V02 (stocker pour garantir, plutôt que
recalculer à chaque fois).

**Cohérence de la dénormalisation** : `isDoubleDiplome` d'une classe ne
change pas en cours d'année (figé via sa formation). Si un jour une
formation bascule DD ↔ non-DD, il faudra re-synchroniser les inscriptions
existantes — tracé comme risque, non bloquant en V03 (les formations sont
créées avec leur catégorie définitive).

### 3. Flow d'inscription par email (V3-D7, partagé RP + AC)

L'inscription part **toujours de l'email**, depuis la fiche classe :

```
1. RP/AC saisit l'email de l'étudiant à inscrire.
2. GET /api/etudiants/lookup?email=…  (résolution préalable)
   ├─ étudiant EXISTE  → mode « existant » : ajout direct
   └─ étudiant INCONNU → mode « nouveau »  : formulaire (nomComplet, matricule)
3. POST /api/classes/:id/inscriptions  — body = discriminated union :
   { mode: 'existant', email }
   { mode: 'nouveau',  email, nomComplet, matricule }
```

Le payload est une **union discriminée** Zod sur `mode` (contracts LOT 0.5,
même pattern que `createSessionV2Schema` discriminé sur `type`). Backend :

- `existant` : l'étudiant **doit** exister (sinon 404) → crée l'`Inscription`.
- `nouveau` : crée le `User(ETUDIANT)` (`nomComplet`, `email`, `matricule`
  **saisi** — pas généré, V3-D6) **puis** l'`Inscription`, dans une **même
  transaction** (atomicité : pas d'étudiant orphelin si l'inscription
  échoue sur la règle DD).

`matricule` est **saisi** par le RP/AC, pas auto-généré (V3-D6) — l'ISM a
ses propres matricules (« ISM-2024-0001 »). Il reste `@unique` sur `User`.

### 4. `User.classeId` conservé en transition

La FK directe `User.classeId` (V01/V02) est **conservée** par cette
migration. La source de vérité devient `Inscription`, mais le drop de
`classeId` est **tracé en tech-debt** (`TD-V03-CLASSEID`) : on l'enlève
quand tous les consommateurs (planning par `studentId`) seront passés par
`Inscription`. Migration additive — on ne casse rien (cf. décision sensible
« Drop de `User.classeId` » du fichier vague).

## Options envisagées

### Option A — Garder `User.classeId` (multi-valué impossible)

**Rejeté** : ni historique, ni double-diplôme. Ne répond pas à V3-D7.

### Option B — `Inscription` sans dénormalisation, règle applicative

`Inscription(etudiant, classe, année)` + vérification de la règle DD dans
le service avant insert. **Rejeté** : contournable (deux requêtes
concurrentes passent la lecture avant l'écriture → race → 2 inscriptions
non-DD la même année). La règle métier mérite une garantie **base**.

### Option C — `Inscription` + `isDoubleDiplome` dénormalisé + `@@unique` (retenu)

La catégorie est sur la ligne, la contrainte unique compose dessus. **Pour** :
règle garantie par la base, atomique, non contournable. **Contre** :
dénormalisation à tenir cohérente (mitigé : catégorie figée à l'année).
**Retenu** — c'est la seule option qui rend la règle infalsifiable.

### Option D — Catégorie via un enum `categorie` plutôt qu'un booléen

`categorie ∈ {STANDARD, DOUBLE_DIPLOME}`. Équivalent au booléen pour V03
(2 catégories). **Reporté** : si une 3ᵉ catégorie apparaît (ex. auditeur
libre), basculer en enum — nouvel ADR. Le booléen suffit aujourd'hui et
colle au champ `Filiere.isDoubleDiplome` existant.

## Conséquences

### Positives

- **Historique d'inscriptions** natif (fiche étudiant LOT 5).
- **Règle double-diplôme infalsifiable** (contrainte base, pas code).
- **Une seule porte d'entrée étudiant** (inscription) → pas de doublons
  d'étudiants créés à la volée ailleurs (V3-D6).
- **Flow partagé RP + AC** sans duplication (composant + endpoint communs).

### Négatives

- **Dénormalisation `isDoubleDiplome`** à resynchroniser si une formation
  change de catégorie (rare ; risque tracé).
- **`classeId` en transition** : double source temporaire (FK directe +
  `Inscription`). Drop tracé `TD-V03-CLASSEID`.
- **Matricule saisi** = responsabilité humaine d'unicité (la base la garantit
  via `@unique`, mais une collision lève une 409 à gérer côté UI).

### À surveiller

- Migration des données V02 : l'unique étudiant seedé (`User.classeId =
GL3-A`) reçoit une `Inscription` correspondante dans le seed v3 (LOT 0.7),
  `classeId` conservé en parallèle.

## Plan de mise en œuvre

| Étape | Livrable                                                                                          | Owner   | LOT           |
| ----- | ------------------------------------------------------------------------------------------------- | ------- | ------------- |
| A     | Schema : table `Inscription` + 2 `@@unique` + index                                               | Salim   | 0.4           |
| B     | Contracts : `InscriptionDto`, `InscriptionRequestDto` (union `existant`/`nouveau`), `EtudiantDto` | Salim   | 0.5           |
| C     | Seed : inscriptions (dont 1 étudiant DD : GLRS non-DD + GL master DD)                             | Oumar   | 0.7           |
| D     | Endpoints inscription + lookup + règle DD (409) + désinscription                                  | Oumar   | LOT 2 B.3/B.4 |
| E     | Modal inscription flow email (partagé RP+AC)                                                      | Libasse | LOT 4 C.5     |

## Décision révisable quand

- Une 3ᵉ catégorie d'inscription apparaît → `categorie` enum (Option D).
- Le drop de `User.classeId` est planifié (`TD-V03-CLASSEID`).
- Une formation peut changer de catégorie en cours d'année (resync
  dénormalisation).

## Liens

- V3-D6, V3-D7 (`vague-03-index.md`)
- LOT 0.2 (`vague-03-lots.md`) — tâche source
- ADR-0010 (modèle académique) — `AnneeAcademique`, `Formation`
- LOT 2 B.3/B.4 (backend), LOT 4 C.5 (front inscription)
- Précédent union discriminée : `createSessionV2Schema` (ADR-0008 / V2-D4)
