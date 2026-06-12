---
id: ADR-0018
titre: Maquette pilotée par la formation + double-diplôme au niveau filière
statut: ACCEPTÉ
date: 2026-06-12
auteur: salim
vague: 04
revise: [ADR-0010, ADR-0011]
---

# ADR-0018 — Maquette pilotée par la formation + double-diplôme au niveau filière

> **Statut** : Accepté · **Date** : 2026-06-12 · **Vague** : 04 (onboarding prod réel) · **Auteur** : Salim (Tech Lead)
> **Révise** : [ADR-0010](0010-modele-academique-versionne.md) (cycle de vie maquette) · [ADR-0011](0011-inscriptions-double-diplome.md) (source du double-diplôme)

## Contexte

L'onboarding réel du référentiel en production (`planit.sn`) a révélé une
**impasse** dans le cycle de vie de la maquette posé par ADR-0010 :

- Le flux était manuel et séquentiel : créer la maquette → créer sa version →
  créer la formation en choisissant maquette + version + code + double-diplôme.
- **Aucune route ne permettait de créer la _première_ `MaquetteVersion`** :
  `renew` exige une version source (→ 409 « Aucune version à renouveler »), et
  « Composer » exige une version existante. Une maquette neuve restait donc
  vide et inutilisable (blocage tracé dans le suivi go-live).
- Le RP devait saisir un **code** à la main et cocher un **double-diplôme** sur
  la formation, alors que ces informations sont déductibles.

Par ailleurs, ADR-0011 dénormalisait `isDoubleDiplome` depuis la **formation**,
alors que le double-diplôme est conceptuellement une propriété de la **filière**
(toutes les formations/classes d'une filière double-diplôme le sont).

## Décision

### 1. La maquette est un sous-produit **automatique** de la formation

On **inverse** la logique : on ne crée ni ne modifie/renouvelle plus une maquette
directement. La **création d'une formation** garantit, dans une transaction, que
la maquette `(filière, niveau)` existe et possède une **version pour l'année
courante** (`MaquettesService.ensureMaquetteAndVersion`) :

- maquette absente → créée (nom dérivé) ;
- version de l'année absente → **renouvellement** = clone profond (modules +
  heures) de la dernière version toute année ; à défaut (maquette neuve) →
  version **vide** prête à composer.

Conséquence : les endpoints `POST /maquettes`, `PUT /maquettes/:id`,
`POST /maquettes/:id/renew` sont **retirés**. `/maquettes` devient **lecture +
composition** (ajout/retrait de modules, édition des heures, export).

### 2. Création de formation = **filière + niveau** uniquement

Le RP choisit la **filière** puis le **niveau**. Le reste est **dérivé serveur**
(helpers purs `@planit/utils`, mêmes formules backend + aperçu frontend) :

- **Code** = `formationCode` → `{SIGLE}-{NIVEAU}-{libelléAnnée}`, ex.
  `GLRS-L3-2025-2026`.
- **Nom de maquette** = `maquetteNom` → `Maquette {niveau} {sigle}`, ex.
  `Maquette L1 GLRS`.
- **Semestres** = dérivés du niveau (`semestreAbsolu` / `semestreLabel`) :
  L1→S1/S2, L2→S3/S4, L3→S5/S6, M1→S7/S8, M2→S9/S10. `MaquetteModule.semestre`
  reste le **rang** (1|2) dans l'année ; le numéro absolu est dérivé à l'affichage.

Garde : **au plus une formation** par `(filière, niveau, année courante)`
(`@@unique([filiereId, niveau, anneeAcademiqueId])` + pré-contrôle 409 lisible).

### 3. Composition : on ajoute un **module**, l'UE suit

Composer une maquette = ajouter/retirer des **modules** dans un semestre (backend
déjà en place : `POST /maquette-versions/:vid/modules`, `DELETE /maquette-modules/:id`).
Un module ajouté démarre à **0 h**. L'**UE n'est jamais ajoutée explicitement** :
elle est déduite du module (`Module.ueId`) et sert d'**en-tête de regroupement**
(UE en titre, ses modules listés en dessous). Un module est unique par version.

### 4. `isDoubleDiplome` porté par la **filière**

`Formation.isDoubleDiplome` est **supprimé**. Le drapeau vit sur `Filiere`.
Classes et inscriptions le **dérivent** via `Classe → Formation → Filiere` :

- l'affichage classe (`ClasseV3Dto.isDoubleDiplome`) lit la filière de la formation ;
- à l'inscription, `isDoubleDiplomeInscription(formation)` lit
  `formation.filiere.isDoubleDiplome`. La valeur reste **dénormalisée** sur
  `Inscription.isDoubleDiplome` (clé du `@@unique([etudiantId, anneeAcademiqueId,
isDoubleDiplome])` d'ADR-0011 — **inchangé**) ; seule sa **source** change.

### 5. Schéma (migration `20260612080000_formation_maquette_autoflow`)

- `formations.isDoubleDiplome` **supprimé**.
- `Formation` : `@@unique([filiereId, niveau, anneeAcademiqueId])` (ajout).
- `Maquette` : `@@unique([filiereId, niveau])` (remplace `[filiereId, niveau, nom]`
  — le nom est dérivé, hors clé). L'index unique partiel `EN_COURS` (SQL brut)
  n'est pas touché.

## Conséquences

**Positives** : le blocage de la première version disparaît (toute formation
amorce sa maquette) ; moins de saisie et zéro incohérence code/maquette/année ;
le double-diplôme a **une** source de vérité (la filière) ; le changement d'année
n'affecte jamais les autres (immutabilité du clone, conservée d'ADR-0010).

**Négatives / arbitrages** : la maquette ne peut plus exister sans formation pour
l'année (acceptable — une maquette sans formation n'a pas d'usage) ; perte de la
donnée `formations.isDoubleDiplome` existante (recouvrée depuis la filière) ; pas
d'édition de formation (tout est dérivé/figé — create/delete uniquement).

**Hors-scope** : import de masse, écran admin (différés, cf. ADR-0017 /
`TD-V04-ADMIN-PROVISIONING`).

## Statut d'implémentation

Implémenté le 2026-06-12 : schéma + migration, `@planit/utils` (helpers),
`@planit/contracts` (schemas), `MaquettesService.ensureMaquetteAndVersion` +
`FormationsService.create`, dérivation double-diplôme (inscriptions/classes),
frontend (formulaire formation filière+niveau+aperçu code, page Maquettes
lecture/composition, sélecteur de module, libellés de semestre). Tests unit
(utils/contracts) et intégration (formations/maquettes/inscriptions/classes) verts.
