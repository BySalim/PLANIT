# Journal — LOT 1 V05 : Admin système (cross-école)

> **Membre** : Oumy (`feat/oumy`) · **Date** : 2026-06-13 · **LOT** : Vague 05 — LOT 1 (1.1 → 1.7)
> **SPEC** : [VAGUE-05-01-admin-systeme.md](../../specs/VAGUE-05-01-admin-systeme.md)

## 1. Directives reçues

« Réaliser **tout** le LOT 1 de la Vague 5 sans casser le code actuel, méthodes les plus
intelligentes / maintenables / communautaires. Suivre les étapes du LOT ; signaler les points non
décidables seul, sinon adopter l'approche la plus intelligente. Frontend : se référer à
PLANIT-Design (interface déjà élaborée pour certaines perspectives). Commits, push et PR en fin de LOT. »

## 2. Décisions techniques (autonomie)

- **Helper `createAccount` factorisé dans `UtilisateursService`** (choke point unique de création de
  compte, argon2id + invariant `ecoleId`), réutilisé par le CRUD Admin **et** la création de Direction
  (`EcolesService`). Évite la duplication du pattern `enseignants.service.ts:80`.
- **Audit écrit dans la transaction de l'action** : `AuditService.log(tx, …)` reçoit le client de
  transaction → l'entrée d'audit et la mutation committent ensemble (cohérence action↔trace, ADR-0020 §6).
- **Invalidation de session sur suspension/archivage** via un nouveau `AuthService.revokeUserSessions(userId)`
  (ciblé, calqué sur `revokeAllSessions`). Combiné au **verrou `statut`/`deletedAt` ajouté dans `login()`**.
- **Distinction ADMIN/SUPER_ADMIN en service (cross-field)** : `assertCanManageRoles` — seul un
  SUPER_ADMIN gère un compte ADMIN/SUPER_ADMIN (le `RolesGuard` ne sait pas exprimer « tout sauf les
  admins »). Garde anti-self-lockout sur suspendre/archiver.
- **`archiver` renvoie le DTO (200)** au lieu de 204 → uniforme avec suspend/reactivate et évite
  d'ajouter un helper `apiPatch` void côté front.
- **Frontend `auth-context` branché sur `@planit/contracts.authMeSchema`** (9 rôles + `ecoleId` +
  `matricule`), remplaçant le schéma local 5-rôles **qui faisait échouer le parse d'un compte admin**
  (login muet, bloqué en `loading`). C'était anticipé par le commentaire « en attente de 0.4 ».
  `roleLabel` rendu exhaustif, `ROLE_HOME` complété (admin → `/ecoles`), `app/(planit)/page.tsx`
  redirige l'admin hors planning, `useIsAdmin()` ajouté.
- **Espace Admin via `navForRole` + groupe `(admin)`** : `NAV_ADMIN` (Écoles · Utilisateurs · Journal)
  branché dans la sidebar existante (point d'évolution unique acté au LOT 6), pages sous
  `(planit)/(admin)/` role-gatées `RequireAuth ADMIN/SUPER_ADMIN`. URLs propres (V5-D9), Shell réutilisé.
- **Schémas de query inline** dans les controllers (pattern `enseignants.controller`), parsers de
  réponse Zod inline côté web → **`packages/contracts/` non touché** (zone sensible évitée ; 0.4 a
  livré tous les DTOs nécessaires).
- **Reset password** = mot de passe temporaire généré (`randomBytes(13).base64url`, ≥104 bits),
  affiché une fois (`TempPasswordDialog` + copie presse-papier), sessions révoquées. Pas d'e-mail (V06).
- **`resetDb` (helper test) étendu V05** : purge `AuditLog` avant `User` (FK `actorId` Restrict) et
  `Ecole` en dernier (isolation des écoles créées par un test). `loginAs` accepte désormais
  ADMIN/SUPER_ADMIN/DIRECTION (emails du seed v5).

## 3. Décisions soumises à validation (Salim)

- **Reprise de tout le LOT 1 par Oumy** alors que la répartition assigne le backend 1.1→1.5+1.7 à
  Oumar/Djibril (seul 1.6 à Oumy). Validé en session ; Oumar n'avait pas commencé (zéro collision) →
  il bascule sur le LOT 2 (= « Plan B » documenté dans `vague-05-lots.md`). **À acter par le TL.**
- **Conflit de directive UI** : l'utilisateur a demandé de se référer à PLANIT-Design, mais la règle
  **impérative** en tête de `vague-05-index.md` l'interdit pour V05 (UI composée depuis le design
  system PLANIT). J'ai suivi la règle V05 (l'espace Admin n'existe pas dans PLANIT-Design de toute façon).
- **Statuts `vague-05-lots.md` non flippés** (repo stratégie `master`) — précédent LOT 6 : ne pas
  modifier sans demande. 1.1→1.7 à passer `[x]` après validation TL.
- **Choix sensibles tranchés par défaut** (cf. `vague-05-lots.md` « décisions sensibles ») : ADMIN gère
  le non-admin / SUPER_ADMIN gère les admins ; journal Admin-only ; reset = mdp temporaire affiché.

## 4. Modifications

**Backend — créés** : `audit/{audit.module,audit.service,audit.controller}.ts` ·
`ecoles/{ecoles.module,ecoles.service,ecoles.controller}.ts` ·
`utilisateurs/{utilisateurs.module,utilisateurs.service,utilisateurs.controller}.ts` ·
`test/admin.spec.ts` (18 cas).
**Backend — modifiés** : `auth/auth.service.ts` (login refuse SUSPENDU/`deletedAt` + `revokeUserSessions`) ·
`app.module.ts` (enregistrement 3 modules) · `test/helpers/auth.ts` (+rôles admin) ·
`test/helpers/db.ts` (purge AuditLog + Ecole).

**Frontend — créés** : `app/(planit)/(admin)/layout.tsx` + `(admin)/{ecoles,utilisateurs,journal}/page.tsx` ·
`components/admin/{ecole-modal,direction-modal,user-modal,temp-password-dialog,admin-table-skeleton}.tsx` ·
`lib/admin-queries.ts` · `lib/admin-mutations.ts`.
**Frontend — modifiés** : `contexts/auth-context.tsx` (contracts authMeSchema + ROLE_HOME) ·
`hooks/use-role.ts` (roleLabel exhaustif + `useIsAdmin`) · `app/(planit)/page.tsx` (redirect admin) ·
`components/layout/sidebar.tsx` (NAV_ADMIN + navForRole) · tests `sidebar.test.tsx`,
`use-role.test.ts`, `logout-floater.test.tsx` (mocks `AuthMe` + cas admin).

**Docs** : SPEC `VAGUE-05-01-admin-systeme.md` + ce journal.

## 5. Phase CHECK — résultats

- **Backend** : `typecheck` ✅ (EXIT=0), `lint` ✅ (EXIT=0). Tests d'intégration `admin.spec.ts`
  **écrits** mais **non exécutés localement** (Postgres requis ; backend non démarrable sur ce poste
  Windows — contrainte connue depuis LOT 4/6, creds conteneur). → exécutés en **CI**.
- **Web** : `typecheck` ✅, `lint` ✅ (0 warning), `vitest` ✅ **99 tests** (98 existants + variante
  sidebar Admin ; `use-role` enrichi des rôles admin). Aucune régression de l'élargissement `UserRole`.
- **Smoke navigateur** : **non réalisé** (auth + données = backend indisponible localement). À dérouler
  côté Ubuntu/CI (login `superadmin@planit.test` / `Test1234!` → `/ecoles`, créer école + Direction,
  créer/suspendre/archiver/reset un compte, vérifier le journal, isolation).
- **Décision sensible env** : `pnpm install --frozen-lockfile` (déps déclarées manquantes) +
  `prisma generate` — pas d'ajout de dépendance.

## 6. Surprises

- **Disque C: plein à 100 %** (14 Mo libres) en cours de route → `prisma generate` (copie du moteur)
  et les builds échouaient (`ENOSPC`). L'utilisateur a libéré ~3 Go ; `.next` (228 Mo) purgé. À surveiller.
- **`pnpm install` clobber le client Prisma généré** (revient aux stubs par défaut) → toujours
  re-`prisma generate` après un install, sinon `tsc` casse (`Prisma has no exported member …`) sur
  tout le backend, pas seulement le code neuf.
- **`auth-context` 5-rôles** : un admin ne pouvait littéralement pas se connecter au web (parse KO).
  Bug latent depuis l'ajout des rôles V05 au backend, révélé par le LOT 1.
- **`resetDb` ne purgeait ni `AuditLog` ni `Ecole`** : sans le fix, le 1ᵉʳ test créant un audit
  cassait le `user.deleteMany()` du `beforeEach` suivant (FK Restrict).

## 7. Suite

- **PR `feat/oumy` → `develop`** (LOT 1) — ouverte en fin de session.
- **Signal équipe** : Oumy a pris tout le LOT 1 (Admin) → **Oumar libre pour le LOT 2** (Direction
  backend, cœur de l'isolation). À confirmer par le TL + flipper 1.1→1.7 `[x]`.
- **Smoke Ubuntu/CI** : dérouler le scénario admin complet ; vérifier l'isolation cross-école.
- Aucun soft-lock posé (ni `schema.prisma` ni `contracts/` touchés).

## 8. Mises à jour annexes

- `CLAUDE.md` : **non modifié** (patterns V05 à capitaliser en clôture de vague, LOT 5.4). Candidats :
  `AuditService` transactionnel · `revokeUserSessions` + verrou `login` statut · distinction
  ADMIN/SUPER_ADMIN en service · `navForRole` += NAV_ADMIN · auth-context branché contracts.
- ADR : aucun nouveau (LOT 1 implémente ADR-0019/0020 déjà mergés).
- Tech-debt : RAS de neuf.
