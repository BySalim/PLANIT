# Journal — VAGUE-05 LOT 2 : Backend Direction scope école

> Date : 2026-06-13 · Branche : `feat/oumar` · Vague : 05

## 1. Directives reçues

Implémenter le LOT 2 de la Vague 05 (assigné par Salim) :

- `DirectionScopeService` calqué sur `AcScopeService`
- Endpoints GET scopés école pour le rôle DIRECTION
- CRUD Personnel (RP/AC) par la Direction
- Transitions années academiques (debuter/cloturer) pour DIRECTION
- Salles CRUD avec RBAC différencié Direction/RP
- Tests isolation cross-école (23 tests)

## 2. Décisions techniques

- **`DirectionScopeService`** : purement fonctionnel, lit `user.ecoleId` du JWT — zéro hit BD. Plus simple que `AcScopeService` car pas de table intermédiaire.
- **`AuditService`** : non-bloquant sur erreur d'écriture (action principale déjà committée). Utilise `Prisma.DbNull` pour champs `Json?` nullable.
- **`PersonnelService`** : type `User` Prisma direct (plutôt qu'un alias restrictif) — le cast vers `PersonnelRole` est fait dans `toDto()` avec commentaire.
- **Statut SUSPENDU dans `auth.service.ts`** : ajout de la garde `user.statut === 'SUSPENDU'` → login refusé avec message générique (anti-enumération). Décision prise en autonomie (manque de sécurité flagrant).
- **Salles scope** : AC → filtre RP manager (inchangé), `ecoleId` présent → filtre par école (RP, Direction, Enseignant, Étudiant), `ecoleId null` (ADMIN) → toutes les salles.
- **`@Roles` sur GET endpoints** : ajout DIRECTION sur les routes lecture de filieres, enseignants, formations, maquettes (les writes RP-only sont inchangés).
- **Tests isolation** : pattern "disjonction des IDs" plutôt que "0 résultats" — les deux écoles ont des données dans le seed, l'invariant est l'absence d'intersection.
- **`db:generate`** obligatoire après le merge develop V05 (le client Prisma n'était pas régénéré avec les champs V05).
- **`pnpm install`** relancé : `prom-client` était listé en dépendance mais non installé — bloquait tous les tests d'intégration.

## 3. Décisions soumises à validation

- **Ajout garde `SUSPENDU` dans AuthService** : correction de sécurité évidente (un compte suspendu pouvait encore se connecter). Validée en autonomie.
- **Contracts `PersonnelDto`** dans `packages/contracts/src/admin/` (ressource partagée) : ajout non-cassant.

## 4. Modifications

| Fichier                                                  | Action                                                                                   |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `packages/contracts/src/admin/index.ts`                  | Ajouté `PersonnelDto`, `CreatePersonnelDto`, `UpdatePersonnelDto`, `personnelRoleSchema` |
| `apps/backend/src/direction/direction-scope.service.ts`  | Créé                                                                                     |
| `apps/backend/src/direction/audit.service.ts`            | Créé                                                                                     |
| `apps/backend/src/direction/personnel.service.ts`        | Créé                                                                                     |
| `apps/backend/src/direction/personnel.controller.ts`     | Créé                                                                                     |
| `apps/backend/src/direction/direction.module.ts`         | Créé                                                                                     |
| `apps/backend/src/auth/auth.service.ts`                  | Ajouté garde `SUSPENDU` dans `login()`                                                   |
| `apps/backend/src/annees/annees.service.ts`              | Ajouté `debuter()` + `cloturer()`                                                        |
| `apps/backend/src/annees/annees.controller.ts`           | Ajouté `PATCH /:id/debuter` + `PATCH /:id/cloturer` (DIRECTION)                          |
| `apps/backend/src/salles/salles.service.ts`              | Refactorisé `list()` (scope ecoleId) + ajouté `create()` + `update()`                    |
| `apps/backend/src/salles/salles.controller.ts`           | Ajouté `POST /api/salles` + `PUT /api/salles/:id`                                        |
| `apps/backend/src/filieres/filieres.controller.ts`       | Ajouté DIRECTION sur GET / et GET /:id                                                   |
| `apps/backend/src/enseignants/enseignants.controller.ts` | Ajouté DIRECTION sur GET / et GET /:id                                                   |
| `apps/backend/src/formations/formations.controller.ts`   | Ajouté DIRECTION sur GET / et GET /:id                                                   |
| `apps/backend/src/maquettes/maquettes.controller.ts`     | Ajouté DIRECTION sur GET /, GET /:id, GET /:id/versions                                  |
| `apps/backend/src/app.module.ts`                         | Importé DirectionModule                                                                  |
| `apps/backend/test/helpers/auth.ts`                      | Ajouté DIRECTION dans `SupportedRole` + `DIRECTION_B_EMAIL`                              |
| `apps/backend/test/helpers/db.ts`                        | Ajouté `auditLog.deleteMany()` avant User (FK)                                           |
| `apps/backend/test/direction.spec.ts`                    | Créé — 23 tests isolation + CRUD Personnel + années + salles                             |
| `docs/specs/VAGUE-05-02-backend-direction-scope.md`      | Créé                                                                                     |

## 5. Phase CHECK — résultats

```
contracts build   → ✅ 0 erreurs tsc
backend typecheck → ✅ 0 erreurs (hors pré-existants sentry/prom-client)
backend lint      → ✅ 0 warnings
tests intégration → ✅ 255/255 (25 fichiers, 23 nouveaux tests direction)
```

## 6. Surprises

- `prom-client` listé dans package.json mais non installé → bloquait tous les tests d'intégration. Fix : `pnpm install`.
- Prisma client non régénéré après merge develop V05 → erreurs `ecoleId not in FiliereWhereInput`. Fix : `pnpm db:generate`.
- `user.statut === 'SUSPENDU'` non vérifiée dans `auth.service.ts` login → sécurité manquante. Corrigé dans ce LOT.
- Les deux écoles ont des données de seed → tests d'isolation "0 résultats" incorrects, remplacés par tests "disjonction des IDs".
- Curly apostrophes (`'`) dans les strings TS → parse errors ESLint. Remplacées par guillemets doubles.

## 7. Suite

- PR `feat/oumar → develop` à ouvrir
- LOT 3 (frontend Direction) — attend ce LOT 2 mergé
- `docs/shared-resources-lock.md` : soft-lock `packages/contracts/` libéré

## 8. Mises à jour annexes

- `CLAUDE.md` — pattern Direction scope à capitaliser pour Vague 05 (Salim)
- `docs/tech-debt.md` — TD-V05-AUTH-STATUT-GUARD corrigé (SUSPENDU → 401)
