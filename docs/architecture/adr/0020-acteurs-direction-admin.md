---
id: ADR-0020
titre: Acteurs Direction + Admin système — rôles, scope, cycle de vie, audit
statut: ACCEPTÉ
date: 2026-06-12
auteur: salim
vague: 05
---

# ADR-0020 — Acteurs Direction + Admin système

> **Statut** : Accepté · **Date** : 2026-06-12 · **Vague** : 05 (LOT 0.2) · **Auteur** : Salim (Tech Lead)
>
> ⚠️ `vague-05-lots.md` référence cet ADR sous « ADR-0016 » (numérotation périmée, cf. [ADR-0019](0019-multi-tenance-par-ecole.md)). Numéro réel : **ADR-0020**. S'appuie sur le multi-tenance d'ADR-0019.

## Contexte

La V05 ajoute deux acteurs à PLANIT, par-dessus le multi-tenance d'[ADR-0019](0019-multi-tenance-par-ecole.md) :

- **Direction** — scopée à **son** école, en **lecture / pilotage** (tableau de bord, planning read-all, suivi, référentiels en lecture, + gestion du personnel, de l'année et des salles de son école). Pas opératrice de planning.
- **Admin système** — **cross-école** : CRUD des écoles, création des Directions, gestion des comptes de toutes les écoles, journal d'audit.

Il faut figer : les rôles, la distinction `ADMIN`/`SUPER_ADMIN`, le cycle de vie des comptes, le journal d'audit, et le routing role-aware.

## Décision

### 1. Rôles

`Role += DIRECTION`. Activation de `ADMIN` et `SUPER_ADMIN` (déjà dans l'enum, jusqu'ici inutilisés).

- `SUPER_ADMIN` / `ADMIN` : `ecoleId = null` (cross-école).
- `DIRECTION`, `RESPONSABLE_PROGRAMME`, `ASSISTANT_PROGRAMME`, `ENSEIGNANT`, `ETUDIANT` : `ecoleId` **requis**.

**Distinction `ADMIN` vs `SUPER_ADMIN`** (défaut V05, tranché ici) :

- `SUPER_ADMIN` = compte **fondateur** de la plateforme : gère les `ADMIN` + la configuration plateforme.
- `ADMIN` = opérateur : gère **écoles + comptes + audit**, ne gère **pas** les autres admins.
- V05 seede **1 `SUPER_ADMIN`** + **1 `ADMIN`**. La garde RBAC distingue les deux ; en pratique l'essentiel de l'espace système est ouvert aux deux, seule la gestion des comptes `ADMIN`/`SUPER_ADMIN` est réservée au `SUPER_ADMIN`.

### 2. Cycle de vie des comptes (V5-D7)

`User.statut ∈ { EN_ATTENTE, ACTIF, SUSPENDU }` (nouveau champ, défaut `ACTIF` au backfill).

- **« Révoquer l'accès » = suspendre** : `statut = SUSPENDU` → login refusé **et sessions actives invalidées immédiatement** (révocation de la famille de refresh tokens, mécanique ADR-0005 §5). À tester explicitement.
- **« Supprimer » = archiver** : soft-delete via `User.deletedAt` (déjà présent). Sort des listes, jamais de suppression dure (intégrité référentielle + audit).
- **École** : `Ecole.archivedAt` pour archiver une école sans la supprimer.

Aucune suppression dure nulle part.

### 3. Journal d'audit (V5-D8)

Table `AuditLog` : `id`, `actorId` (FK User), `action` (string), `targetType`, `targetId`, `ecoleId?`, `meta` (Json), `createdAt`.

- Écrit sur les **actions sensibles** : création/suspension/réactivation/archivage de compte, reset password, création/archivage d'école, assignation/retrait de responsable de salle, transitions d'année (`débuter`/`clôturer`).
- Écriture **dans la même transaction** que l'action quand c'est possible, via un `AuditService` mutualisé.
- **Consultation = Admin uniquement** en V05 (défaut tranché). Une vue d'audit scopée pour la Direction est **différée** (le champ `ecoleId` sur `AuditLog` la rendra triviale plus tard).

### 4. Scope Direction

`DirectionScopeService`, calqué sur `apps/backend/src/ac/ac-scope.service.ts` : résout `ecoleId` du user et filtre **toutes** les lectures Direction (classes, étudiants, enseignants, salles, planning, suivi, filières, formations, maquettes, UE/modules) par `ecoleId`. RBAC réel = gardes serveur, jamais masquage UI (cf. ADR-0019 §3).

### 5. Responsable de programme (V5-D5)

`Filiere.responsableRpId` (FK `User` RP, **nullable**). Hérité par formations/classes via la filière. Surfacé partout comme **« Responsable »** (Suivi, Classes, Filières, Formations, Maquettes). Nullable = filière sans RP attitré (affichage « — / Non assigné »).

### 6. Routing role-aware (V5-D9, héritage V3-D13)

- **Direction** : servie sous le groupe `(gestion)` aux **mêmes URLs propres**, en mode scopé + lecture/pilotage. Aucune URL à nom d'acteur.
- **Admin** : nouvel **espace système** role-gaté (`ADMIN`/`SUPER_ADMIN`) — pages neuves `/ecoles`, `/utilisateurs`, `/journal`.

### 7. Décisions sensibles — défauts tranchés

- **Reset mot de passe** : sans canal d'envoi (notifications = V06), V05 génère un **mot de passe temporaire affiché une fois** à l'Admin/Direction, transmis hors-bande. (Aligné sur le CLI `reset-password` prod, TD-003.)
- **Impersonation** : **OUT** (futur).
- **Direction édite les référentiels** : **non** en V05 (lecture seule sur Filières/Formations/UE/Maquettes). Un besoin d'édition ouvrira une tâche dédiée.

## Conséquences

- **+** Réutilise la création de comptes atomique + argon2id (`enseignants.service.ts:80`, à factoriser en helper) et la mécanique de scope AC.
- **+** Audit dès le LOT 0 (table + service), branché au fil des mutations sensibles.
- **−** Chaque mutation sensible doit penser à écrire l'audit → mutualisé dans `AuditService` pour éviter les oublis.
- **−** L'invalidation de session sur suspension touche la mécanique refresh — à tester explicitement (cas « compte suspendu pendant une session active »).

## Alternatives écartées

- **Suppression dure des comptes** : casse l'intégrité référentielle + l'audit. Rejeté (soft-delete only).
- **Matrice RBAC éditable / workflow d'approbation** : non demandé, sur-ingénierie. Rejeté.
- **Audit ouvert à la Direction dès V05** : reporté (le `ecoleId` sur `AuditLog` le permettra sans refonte).
