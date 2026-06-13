# SPEC — VAGUE-05 LOT 1 · Admin système (cross-école)

> **Membre** : Oumy (`feat/oumy`) · **Date** : 2026-06-13 · **LOT** : V05 — LOT 1 (1.1 → 1.7)
> **Refs** : [vague-05-index.md](../../../PLANIT-Strategie-VibeCode/vagues/vague-05-index.md) · [vague-05-lots.md](../../../PLANIT-Strategie-VibeCode/vagues/vague-05-lots.md) · ADR-0019 (multi-tenance École) · ADR-0020 (acteurs Direction + Admin)

## 1. Contexte & objectif

LOT 0 (fondations multi-tenance) est **livré sur `develop`** : schema v5 (`Ecole`, `AuditLog`, `Role += DIRECTION/ADMIN/SUPER_ADMIN`, `UserStatut`, `ecoleId` partout, `Filiere.responsableRpId`), contracts admin (`packages/contracts/src/admin`), seed 2 écoles + admin + directions, `CurrentUserPayload += ecoleId`.

LOT 1 construit l'**espace Admin système cross-école** : un `ADMIN`/`SUPER_ADMIN` (rattaché à aucune école, `ecoleId = null`) crée/archive des écoles, crée la Direction d'une école, gère les comptes de **toutes** les écoles (créer / suspendre / archiver / reset password), et consulte le **journal d'audit**. Toute action sensible est tracée.

> **Reprise de périmètre** : la répartition TL assigne le backend 1.1→1.5+1.7 à Oumar/Djibril et seul 1.6 à Oumy. Oumar n'ayant pas commencé (zéro collision), Oumy prend **tout le LOT 1** sur `feat/oumy` (validé en session). Oumar bascule sur le LOT 2 (= « Plan B » documenté). Signalé en journal + PR.

## 2. Périmètre

**IN** (1.1 → 1.7) :

- **Écoles** : `GET /api/ecoles`, `POST`, `PUT /:id`, `PATCH /:id/archive`. Audit create/archive.
- **Créer Direction** : `POST /api/ecoles/:id/direction` (crée le `User DIRECTION` rattaché à l'école, argon2id, transaction). Audit.
- **Utilisateurs cross-école** : `GET /api/utilisateurs?ecoleId=&role=&statut=&q=` (paginé), `POST`, `PUT /:id`, `PATCH /:id/suspendre` + `/reactiver`, `PATCH /:id/archiver`, `POST /:id/reset-password`. Invalidation de session sur suspension/archivage. Audit systématique.
- **Journal d'audit** : `GET /api/journal?ecoleId=&action=&actorId=&q=` (paginé, tri desc). Écriture mutualisée via `AuditService`.
- **RBAC** `ADMIN`/`SUPER_ADMIN` (guard `@Roles` existant) + **distinction** : seul un `SUPER_ADMIN` crée/modifie/gère un compte `ADMIN` ou `SUPER_ADMIN` (règle cross-field service). Swagger annoté.
- **Frontend espace Admin** : `/ecoles`, `/utilisateurs`, `/journal` — route group `(admin)` role-gaté, `NAV_ADMIN` dans la sidebar. UI composée depuis le design system PLANIT existant.

**OUT** : impersonation · Direction (LOT 2/3) · matrice RBAC éditable · notifications/emails (V06 — reset = mot de passe temporaire affiché une fois).

## 3. Décisions adoptées (défauts documentés `vague-05-lots.md`)

| Sujet                       | Décision                                                                                                                                                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ADMIN vs SUPER_ADMIN**    | `ADMIN` gère écoles + comptes **non-admin** ; **seul `SUPER_ADMIN`** crée/modifie/suspend/archive/reset un compte de rôle `ADMIN` ou `SUPER_ADMIN`. Garde cross-field côté service (403 sinon).                                                               |
| **Suspension → session**    | `login()` refuse un compte `SUSPENDU` ou archivé (`deletedAt`). Suspension/archivage **révoque les refresh tokens** du compte (`AuthService.revokeUserSessions`). Access JWT stateless restant expire sous son TTL (pas de hit BD par requête — ADR-0007 §5). |
| **Reset password**          | Génère un mot de passe temporaire fort, le hash (argon2id), le renvoie **une seule fois** (`ResetPasswordResultDto.temporaryPassword`). Transmis hors-bande (pas de canal email avant V06).                                                                   |
| **Création compte**         | `statut = ACTIF` (mot de passe posé d'emblée). `ecoleId` requis sauf `ADMIN`/`SUPER_ADMIN` (`null`) — invariant cross-field service (Zod ne le porte pas).                                                                                                    |
| **Suppression**             | Aucune suppression dure : « supprimer » = archiver (`User.deletedAt`).                                                                                                                                                                                        |
| **Audit visible Direction** | Non en V05 — journal **Admin only**.                                                                                                                                                                                                                          |
| **Pas de nouvel ADR**       | LOT 1 implémente ADR-0019/0020 déjà mergés. Aucune décision d'archi nouvelle.                                                                                                                                                                                 |

## 4. Données

Aucune migration : schema v5 déjà en place (LOT 0). Modèles consommés : `Ecole`, `User` (`ecoleId?`, `statut`, `deletedAt`, `passwordHash`, `matricule?`), `AuditLog`, `RefreshToken`. Contracts : `@planit/contracts` (`ecoleSchema`, `createEcoleSchema`, `userAdminSchema`, `createUserAdminSchema`, `auditLogSchema`, `resetPasswordResultSchema`, `roleSchema`, `userStatutSchema`) — **non modifiés**. Schémas de **query** (filtres/pagination) définis inline dans les controllers (pattern existant `enseignants.controller.ts`).

## 5. Sécurité

- Tous les endpoints `@Roles('ADMIN','SUPER_ADMIN')` (fail-closed via `JwtAuthGuard` global + `RolesGuard`). Non-admin → 403.
- Mots de passe : argon2id (`ARGON2_OPTS` ADR-0007 §1), jamais loggés (redacter pino en place).
- Audit écrit **dans la même transaction** que l'action quand possible (cohérence action↔trace).
- Invalidation de session sur suspension (refresh révoqués) ; `login()` re-checke `statut`/`deletedAt`.
- Couverture unit/integration ≥ 50 % sur les services (règle V02+).

## 6. Frontend

- `auth-context.tsx` : remplacer le `authMeSchema` local (5 rôles, périmé) par l'import `authMeSchema` de `@planit/contracts` (9 rôles + `ecoleId` + `matricule`). `UserRole` devient l'enum complet → compléter `roleLabel()` (exhaustif) + `ROLE_HOME` (admin → `/ecoles`, direction → `/`).
- `app/(planit)/page.tsx` : un `ADMIN`/`SUPER_ADMIN` sur `/` est redirigé vers `ROLE_HOME[role]` (il n'a pas de vue planning).
- `sidebar.tsx` : `navForRole` += `NAV_ADMIN` (Écoles · Utilisateurs · Journal).
- Route group `apps/web/src/app/(planit)/(admin)/` : `layout.tsx` = `<RequireAuth roles={['ADMIN','SUPER_ADMIN']}>` + `<Shell>` ; pages `ecoles/`, `utilisateurs/`, `journal/`. URLs propres (route group invisible — V5-D9).
- Données : `lib/admin-queries.ts` (query keys + `useQuery`) + `lib/admin-mutations.ts` (TanStack, invalidation + toast). Parsers Zod construits depuis les schémas contracts (`z.array(...)`, wrapper paginé inline — pattern `queries.ts`).
- UI : `Modal`/`Drawer`/`Button`/`Input`/`Select`/`FormField`/`SearchInput`/`Skeleton`/`RowActionButton`/`toast` existants. Tokens design (zéro hex). Labels FR, vocabulaire métier (AC jamais AP).

## 7. Tests

- **Backend (intégration, supertest)** : écoles CRUD + archive · créer Direction · `POST utilisateurs` (tout rôle, invariant ecoleId) · suspendu → **login refusé** · archive → sort des listes · reset password (renvoie un mdp, login avec le nouveau OK) · audit écrit sur chaque action sensible · non-admin → 403 · `ADMIN` tente de créer un `ADMIN` → 403 (réservé SUPER_ADMIN).
- **Backend (unit)** : `AuditService.log`, génération mdp temporaire, garde cross-field admin.
- **Frontend** : `roleLabel`/`ROLE_HOME` exhaustifs (rôles admin), variante `NAV_ADMIN` de la sidebar, smoke d'une page admin (rendu liste + états loading/empty mockés).

## 8. Invariants

1. Un non-`ADMIN`/`SUPER_ADMIN` reçoit **403** sur tout `/api/ecoles`, `/api/utilisateurs`, `/api/journal`.
2. Un compte `SUSPENDU` ou archivé ne peut **pas** se connecter (`login` 401).
3. Toute mutation sensible (create/archive école · create/suspend/archive/reset compte · create direction) produit **exactement une** ligne `AuditLog`.
4. Aucune suppression dure d'un `User` ou d'une `Ecole`.
5. `ecoleId` cohérent : non-null pour les rôles scopés, null pour `ADMIN`/`SUPER_ADMIN` (refus 400/403 sinon).
6. Code existant (RP/AC/Enseignant/Étudiant) **inchangé** : lint + typecheck + tests verts.
