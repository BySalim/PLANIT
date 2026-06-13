# Spec — VAGUE-05-02 : Backend Direction (scope école)

> Date : 2026-06-12 · Owner : Oumar · Dépend de : LOT 0 (0.3/0.4/0.5/0.6 — mergés sur develop)

## Contexte

V05 introduit le rôle `DIRECTION` (pilotage scopé à son école). Ce LOT câble le
**backend** : service de scope, endpoints lecture filtrés, CRUD Personnel, transitions
d'année, CRUD Salles avec RBAC différencié, tests d'isolation cross-école.

Le design système est **PLANIT-app** (V03/V04 existant), pas `PLANIT-IA`.

---

## Tâches

### 2.1 — `DirectionScopeService`

Calqué sur `ac-scope.service.ts`. Lit `user.ecoleId` embarqué dans le JWT
(pas de hit BD supplémentaire). Expose :

- `isDirection(role)` → boolean
- `requireEcoleId(user)` → `string` (lève 403 si `ecoleId === null`)
- `filterByEcole<T>(user, query)` → injecte `ecoleId` dans le where Prisma

### 2.2 — Lecture scopée Direction

Brancher `ecoleId` sur les `GET` existants :

- `GET /api/classes` → filtre `formation.filiere.ecoleId`
- `GET /api/etudiants` → filtre via `Inscription.classe.formation.filiere.ecoleId`
- `GET /api/enseignants` → filtre `ecoleId` direct
- `GET /api/salles` → filtre `ecoleId` direct
- `GET /api/suivi-modules` → filtre via classe → formation → filière → école
- `GET /api/filieres` → filtre `ecoleId`
- `GET /api/formations` → filtre via `filieres.ecoleId`
- `GET /api/maquettes` → filtre via `filiere.ecoleId`
- Exposer `responsableRp` (`Filiere.responsableRpId`) dans les DTOs concernés

### 2.3 — Backend Personnel

Nouveau module `direction/` :

- `GET /api/personnel` — liste RP + AC de l'école du user (DIRECTION)
- `POST /api/personnel` — créer RP **ou** AC, scopé école (hash argon2id, helper factorisé)
- `PUT /api/personnel/:id` — modifier nom/email
- `PATCH /api/personnel/:id/suspendre` — `statut = SUSPENDU` + invalider sessions
- `PATCH /api/personnel/:id/reactiver` — `statut = ACTIF`
- RBAC `DIRECTION` sur tous les endpoints
- Audit sur create/suspend/réactiver

### 2.4 — Année par école (transitions)

Étendre `annees.controller.ts` :

- `PATCH /api/annees/:id/debuter` — passe `PLANIFIEE → EN_COURS`
  (409 si déjà une `EN_COURS` dans l'école)
- `PATCH /api/annees/:id/cloturer` — passe `EN_COURS → CLOTUREE`
- RBAC `DIRECTION`
- Audit sur chaque transition

### 2.5 — Salles (responsabilité)

Étendre `salles.controller.ts` + service :

- `POST /api/salles` — créer une salle, scopé `ecoleId`
  - `DIRECTION` : peut poser `rpResponsableId`
  - `RESPONSABLE_PROGRAMME` : `rpResponsableId` forcé à `null` (commune)
- `PUT /api/salles/:id` — modifier ; DIRECTION peut assigner/retirer `rpResponsableId`
- `GET /api/salles` → RP voit **toutes** les salles de son école (siennes + autres RP + communes)

### 2.6 — Tests intégration isolation

Fichier `apps/backend/test/direction.spec.ts` (≥ 18 tests) :

- Direction A ne voit rien de l'école B (classes/étudiants/enseignants/salles) → filtré
- Direction A peut lister ses RP/AC + créer RP + créer AC
- Personnel suspendu → login refusé (401/403)
- 2ᵉ année `EN_COURS` même école → 409
- RP voit toutes les salles de son école (y compris communes)
- RP crée salle → `rpResponsableId = null` forcé
- Direction assigne `rpResponsableId` → ok ; RP tente → 403

---

## Fichiers à créer/modifier

| Fichier                                                   | Action                                 |
| --------------------------------------------------------- | -------------------------------------- |
| `apps/backend/src/direction/direction-scope.service.ts`   | Créé                                   |
| `apps/backend/src/direction/direction.module.ts`          | Créé                                   |
| `apps/backend/src/direction/personnel.controller.ts`      | Créé                                   |
| `apps/backend/src/direction/personnel.service.ts`         | Créé                                   |
| `apps/backend/src/direction/audit.service.ts`             | Créé                                   |
| `apps/backend/src/annees/annees.controller.ts`            | Modifié (debuter/cloturer)             |
| `apps/backend/src/annees/annees.service.ts`               | Modifié (debuter/cloturer)             |
| `apps/backend/src/salles/salles.controller.ts`            | Modifié (POST/PUT)                     |
| `apps/backend/src/salles/salles.service.ts`               | Modifié (create/update, scope RP)      |
| `apps/backend/src/classes/classes.service.ts`             | Modifié (scope Direction)              |
| `apps/backend/src/etudiants/etudiants.service.ts`         | Modifié (scope Direction)              |
| `apps/backend/src/enseignants/enseignants.service.ts`     | Modifié (scope Direction)              |
| `apps/backend/src/filieres/filieres.service.ts`           | Modifié (scope Direction)              |
| `apps/backend/src/formations/formations.service.ts`       | Modifié (scope Direction)              |
| `apps/backend/src/maquettes/maquettes.service.ts`         | Modifié (scope Direction)              |
| `apps/backend/src/suivi-modules/suivi-modules.service.ts` | Modifié (scope Direction)              |
| `packages/contracts/src/admin/index.ts`                   | Modifié (PersonnelDto)                 |
| `apps/backend/src/app.module.ts`                          | Modifié (import DirectionModule)       |
| `apps/backend/test/helpers/auth.ts`                       | Modifié (DIRECTION dans SupportedRole) |
| `apps/backend/test/direction.spec.ts`                     | Créé                                   |

---

## Invariants

- Scope école **toujours résolu côté serveur** (jamais masquage UI seul)
- `ecoleId` embarqué dans le JWT → pas de hit BD supplémentaire pour le scope
- Audit écrit **dans la même transaction** que l'action sensible quand possible
- `statut = SUSPENDU` → `refreshTokens` invalidés (deleteMany) → session coupée
- Index partiel `EN_COURS` par école = garantie DB + contrôle applicatif (409 explicite)
- RP crée salle → `rpResponsableId = null` (commune) même si passé dans le body
