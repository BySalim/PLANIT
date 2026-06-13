---
id: ADR-0022
titre: Espaces de travail RP isolés (ownership) + salles subjectives + masquage planning
statut: ACCEPTÉ
date: 2026-06-13
auteur: salim
vague: 05
---

# ADR-0022 — Espaces de travail RP isolés

> **Statut** : Accepté · **Date** : 2026-06-13 · **Vague** : 05 (LOT 6) · **Auteur** : Salim (Tech Lead)
>
> S'appuie sur le multi-tenance d'[ADR-0019](0019-multi-tenance-par-ecole.md), les acteurs Direction/Admin d'[ADR-0020](0020-acteurs-direction-admin.md) et la maquette pilotée par la formation d'[ADR-0018](0018-maquette-pilotee-formation-double-diplome-filiere.md).

## Contexte

Jusqu'à la V05, le scope s'arrête à l'**école** : tout RP d'une école voit **l'intégralité** du référentiel de l'école (filières, classes, modules, maquettes, séances). À l'usage réel (onboarding pilote), ce n'est pas le modèle mental du terrain : chaque RP travaille dans **son propre espace** — il crée ses filières, ses UE/modules, ses maquettes, ses classes et ses séances, et **lui seul** les voit. La Direction supervise tout (école), l'AC ne voit que ce qui est rattaché à **ses classes assignées**.

Deux besoins métier supplémentaires émergent du planning :

1. Un RP doit pouvoir **planifier dans une salle qu'il ne possède pas** (salle d'un autre RP, ou salle commune) en voyant son **occupation** pour éviter les collisions — mais **sans** voir le détail des séances des autres.
2. Un RP veut des **salles « subjectives »** : des salles hypothétiques que **lui seul** connaît au moment de planifier (existence/disponibilité incertaines), invisibles des autres dans la liste des salles.

Il faut figer le modèle de propriété, sa relation avec le « Responsable » (V5-D5), la mécanique de masquage planning et les salles subjectives.

## Décision

### 1. Ownership = champ `ownerRpId` immuable, distinct du Responsable

Chaque entité créée par un RP porte un **`ownerRpId`** = l'id du **RP créateur**, posé à la création et **jamais modifié** (`onDelete: SetNull`).

- Entités concernées : `Filiere`, `UE`, `Module`, `Maquette`, `Classe`, `Seance`, et `Salle` (créateur d'une salle subjective).
- `ownerRpId` est **distinct** de `Filiere.responsableRpId` (V5-D5 / [ADR-0020](0020-acteurs-direction-admin.md) §5) : le « Responsable » reste un champ **assignable par la Direction** pour l'affichage et la responsabilité métier ; l'`ownerRpId` est la **clé technique du périmètre de travail** (qui a créé, donc qui voit).
- Conséquence assumée : réassigner le Responsable ne déplace **pas** l'espace de travail. Le transfert d'espace (départ d'un RP) est **hors périmètre** V05 (tracé tech-debt).

### 2. UE / Modules deviennent propriété d'un RP (D1)

Jusqu'ici `UE` et `Module` étaient **globaux** (pas d'`ecoleId`, pas d'owner, `code` unique global). Ils deviennent **personnels au RP** :

- `UE` : `+ ecoleId` (requis) `+ ownerRpId`. Unicité `code` : `@unique` global → `@@unique([ownerRpId, code])`.
- `Module` : `+ ownerRpId` (école dérivable via `UE`). Unicité `code` : `@unique` global → `@@unique([ownerRpId, code])`.

Conséquence assumée : deux RP qui enseignent « Maths » ont **chacun leur** module (doublon volontaire — c'est le prix de l'espace perso strict). Alternative « catalogue partagé par école » écartée (cf. Alternatives).

### 3. Matrice de visibilité (lecture)

| Entité                                       | RP                                              | Direction                  | AC                     | Admin  |
| -------------------------------------------- | ----------------------------------------------- | -------------------------- | ---------------------- | ------ |
| Filière / Formation / UE / Module / Maquette | `ownerRpId = self`                              | toute l'école              | — (hors périmètre AC)  | —      |
| Classe                                       | `ownerRpId = self`                              | toute l'école              | classes assignées      | —      |
| Séance (planning)                            | `ownerRpId = self` (+ occupation salle, cf. §4) | toute l'école              | classes assignées      | —      |
| Suivi des modules                            | ses modules                                     | toute l'école (lecture)    | modules de ses classes | —      |
| Salle                                        | école **hors** subjectives d'autrui             | école **hors** subjectives | salles du RP manager   | toutes |

Le filtrage est **toujours** appliqué côté serveur (jamais un masquage UI), via un `RpScopeService` calqué sur `AcScopeService` ([ADR-0010](0010-modele-academique-versionne.md)) et `DirectionScopeService` ([ADR-0020](0020-acteurs-direction-admin.md)). Pour les non-RP, `RpScopeService` n'applique aucune restriction d'owner (le scope école/AC s'applique en amont).

### 4. Planning par référentiel + masquage salle

Le planning se consulte **par référentiel** : `Classe`, `Enseignant` ou `Salle` (le sélecteur « M1 IA » figé devient un vrai contrôle ; les modes `view-mode-tabs` jusqu'ici désactivés sont activés).

- Référentiel **Classe** / **Enseignant** : isolation RP normale (`ownerRpId = self`).
- Référentiel **Salle** = **exception unique à l'isolation** : le RP voit **l'occupation complète** de la salle (toute l'école), pour éviter les collisions. Les séances dont `ownerRpId ≠ self` sont renvoyées **masquées** :
  - **visibles** : créneau (début/fin) + nom du RP propriétaire (`ownerRpName`) + indicateur `masked: true`.
  - **masqués** : module, classe(s), enseignant, libellé, description, salle (tout détail identifiant le contenu).
  - Le nettoyage est fait **côté serveur** (les champs ne quittent jamais le backend) — un test d'assertion négative garantit l'absence de fuite.
- La **Direction** ne subit jamais le masquage (école en clair).

### 5. Salles subjectives (D4)

`Salle += isSubjective Boolean @default(false)` `+ ownerRpId`.

- Une salle subjective (`isSubjective = true`, `ownerRpId = créateur`) est **créée par un RP** et n'apparaît dans la **liste des salles** que pour **son créateur**. La **Direction ne la liste pas**.
- Elle apparaît au **niveau d'une séance** qui l'utilise pour tout acteur autorisé à voir cette séance (son nom est porté par la séance, comme aujourd'hui).
- Pas de détection de conflit cross-RP sur les salles subjectives : par nature privées, deux RP peuvent « réserver » la même sans se voir (« lui seul sait si elle est libre »).
- Les salles **non subjectives** restent créées/assignées par la **Direction** (V5-D6 inchangé) ; un RP peut toujours créer une salle commune (`rpResponsableId = null`).

### 6. Corrections Direction (bugs)

- **Suivi des modules** : la page role-aware route désormais `DIRECTION` vers la vue de gestion **en lecture seule** (au lieu de tomber dans la vue Étudiant et de planter). États d'erreur gérés.
- **Filières / Formations** : la Direction lit le référentiel de son école (déjà autorisé backend) ; les actions de création/édition/suppression (« + ») sont **masquées** pour la Direction — conforme à [ADR-0020](0020-acteurs-direction-admin.md) §7 (Direction = lecture seule sur les référentiels).

### 7. Assignation AC ↔ classes par la Direction

La Direction peut assigner **un ou plusieurs** AC à des classes depuis la **liste des classes**, à l'échelle de **l'école** (sans la contrainte `managerRpId` qui borne l'assignation par un RP — [ADR-0010](0010-modele-academique-versionne.md)). L'assignation RP→AC (manager) reste en place (coexistence). L'AC peut **retirer un étudiant** d'une de **ses** classes assignées (scope serveur).

## Conséquences

- **+** Modèle mental aligné sur le terrain : chaque RP travaille « chez lui », la Direction supervise, l'AC reste borné.
- **+** Réutilise les mécaniques de scope éprouvées (AC V03, Direction V05).
- **−** **Migration lourde** : UE/Module passent de globaux à propriété RP ; un module aujourd'hui partagé entre plusieurs filières/RP ne peut avoir **qu'un** owner → backfill « 1er match » + **reseed dev** (un humain lance `db:reset`). Prod **hors scope** (V05 pas encore livrée sur `main`).
- **−** La vue Salle est une **exception à l'isolation** : surface de fuite potentielle → couverte par un test d'assertion négative (aucun détail ne sort pour une séance masquée).
- **−** Chaque service de liste/détail doit désormais composer le scope owner avec le scope école/AC : factorisé dans `RpScopeService` pour éviter les oublis.

## Alternatives écartées

- **UE/Module = catalogue partagé par école** (isolation seulement sur filières/classes/maquettes/séances) : plus léger, évite les doublons, mais incompatible avec le modèle « espace perso strict » voulu par le TL. Rejeté.
- **Réutiliser `responsableRpId` comme clé d'ownership** : un seul champ, mais fusionne création et responsabilité (réassigner le Responsable ferait perdre l'accès au créateur). Rejeté au profit d'un `ownerRpId` immuable séparé.
- **Liste Étudiants cross-école (« tout l'ISM »)** : envisagée puis **abandonnée** par le TL — le scope école strict d'[ADR-0019](0019-multi-tenance-par-ecole.md) est maintenu sur les étudiants.
- **Conflits sur salles subjectives** : non pertinent (salles privées par conception). Rejeté.
