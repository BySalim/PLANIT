# Journal — Fix AC : 403 « Accès refusé » + lecture seule complète

> **Membre** : Salim (`feat/salim`) · **Date** : 2026-06-06 · **Contexte** : correctif post-merge LOT 6 V03 (#58) · **PR** : [#59](https://github.com/BySalim/PLANIT/pull/59)

## 1. Directives reçues

« Mets-toi à jour sur le projet. Review de la PR #58. [Constat en testant : tempête de toasts
« Accès refusé » côté AC sur planning/classes/enseignants + page Enseignants vide] — quelle est
la cause ? Accepte la PR d'Oumy et corrigeons tout sur ma branche, je m'occupe de corriger, fais
le nécessaire pour la correction convenable. »

Décisions de cadrage prises avec le TL (via questions) :

- Merge #58 → develop **maintenant**, correctifs ensuite.
- Correctifs sur **`feat/salim`** (et non `feat/oumy`).
- **Backend RBAC autorisé** : ouvrir le `GET` enseignants à l'AC.

## 2. Diagnostic (PROBE)

Logs backend = 403 `RolesGuard` sur `GET /api/enseignants`, `/api/ues?withModules=true`,
`/api/formations`, `/api/filieres`. Utilisateur connecté = `seed-ac` (`ASSISTANT_PROGRAMME`).

**Cause racine** : #58 a géré l'AC au niveau **UI** (boutons cachés via `isRp`) mais **pas au
niveau data-fetching**. Les pages/composants AC lançaient toujours des `GET` vers des endpoints
`@Roles('RESPONSABLE_PROGRAMME')` (niveau classe). Chaque 403 → `api.ts` dispatch `api:forbidden`
→ `ForbiddenListener` global → un toast « Accès refusé ». Doublons = retry React Query + StrictMode.

Mapping prouvé :

- **Planning `/`** : `<SessionDetailDrawer>` monté en permanence → `useEnseignantsQuery` + `useUesQuery`.
- **Classes** : `useFilieresQuery` (filtre) + `<ClasseModal>` monté → `useFormationsQuery`.
- **Enseignants** : la page lit `/api/enseignants` (RP-only) → page vide.

Deux natures distinctes : ① requêtes qui ne devraient jamais partir pour l'AC (frontend) ;
② lecture légitime de l'AC fermée côté backend (V3-D9 G.6).

## 3. Décisions techniques (autonomie)

- **Gating au niveau des hooks de query** (`enabled: isRp`) plutôt que prop-drilling page par
  page. Les référentiels d'**édition** (`useEnseignantsQuery`/`useUesQuery`/`useSallesQuery` v2,
  `useFilieresQuery`, `useFormationsQuery`) ne servent qu'aux selects RP. Centralise le fix dans
  la couche data, kill tous les 403 d'un coup. La page Enseignants utilise un hook **distinct**
  (`queries.ts`, paginé) laissé **non gaté** → elle charge bien pour l'AC.
- **Backend granularité méthode** : `@Roles('RESPONSABLE_PROGRAMME', 'ASSISTANT_PROGRAMME')` sur
  les 2 `@Get` du `EnseignantsController`. Le `RolesGuard` lit `getAllAndOverride([handler,
class])` → la méthode override la classe. Le `@Roles` classe (RP-only) couvre toujours
  `POST/PUT/DELETE`. Writes restent réservés au RP. Pattern déjà utilisé par `etudiants`/`inscriptions`.
- **Fermeture du trou drawer** (découvert en répondant à « la logique voulue est-elle toujours
  là ? ») : `<SessionDetailDrawer>` affichait « Modifier »/« Supprimer » même pour l'AC. Ajout
  prop `readOnly` (propagée depuis `RpPlanningView = isAc`) → footer d'actions masqué. Le corps
  reste consultable (champs dénormalisés `session.enseignant/.salle/.module`, pas les listes coupées).
- **Finition page Classes** : filtre filière + `<ClasseModal>` non montés pour l'AC (cohérence
  visuelle + évite la query inutile même si déjà gatée).

## 4. Décisions soumises à validation

- **Merge fix-forward de #58** (AC temporairement cassé sur develop) : explicitement décidé par
  le TL (« merge maintenant, fix ensuite »).
- **Ouverture RBAC lecture enseignants à l'AC** : explicitement autorisée par le TL (change de
  surface API/sécurité, normalement domaine `feat/oumar`).

## 5. Modifications

**Frontend**

- `apps/web/src/lib/queries-v2.ts` — `enabled: isRp` sur enseignants/ues/salles.
- `apps/web/src/lib/queries.ts` — `enabled: isRp` sur `useFilieresQuery`.
- `apps/web/src/lib/queries-v3.ts` — `enabled: isRp` sur `useFormationsQuery`.
- `apps/web/src/app/(planit)/(gestion)/classes/page.tsx` — filtre filière + `<ClasseModal>` réservés RP.
- `apps/web/src/components/planning/session-detail-drawer.tsx` — prop `readOnly`, footer masqué.
- `apps/web/src/components/rp/rp-planning-view.tsx` — propage `readOnly` au drawer.

**Backend**

- `apps/backend/src/enseignants/enseignants.controller.ts` — `@Roles(RP, AC)` sur les 2 `@Get`.
- `apps/backend/test/enseignants.spec.ts` — +2 tests (AC lecture → 200, AC écriture → 403).

Commits : `2586de1` (gating + RBAC), `394ecdb` (drawer read-only).

## 6. Résultats CHECK

- Web : `typecheck` ✅ · `lint` ✅ · `test` ✅ **61/61** (sidebar AC, use-role, planning-grid, smoke RP).
- Back : `typecheck` ✅ · `lint` ✅.
- Back tests d'intégration : **non lancés localement** — `resetDb()` fait `deleteMany()` +
  re-seed sur `planit_dev` (DB dev active). Délégués à la CI (DB éphémère).

## 7. Surprises

- **Deux clones** sur la machine : l'app tourne depuis `C:\Users\ouedr\PLANIT-JBA\PLANIT`
  (visible dans les stack traces) ; le travail se fait depuis `…\OneDrive\Desktop\PLANIT`.
  L'app tournante affiche encore les 403 tant que le clone d'exécution n'a pas tiré le fix +
  redémarré le backend.
- Typecheck initialement rouge par **environnement** (deps `html-to-image`/`jspdf` déclarées mais
  non installées dans ce clone ; client Prisma périmé ; `.next/types` obsolètes). Réglé par
  `pnpm install` + `prisma generate` + purge `.next`. Aucune erreur dans les fichiers touchés.
- La logique « AC lecture seule » de #58 était **incomplète** (drawer) — révélé par la question
  du TL, pas par les 403.

## 8. Suite

- Vérification navigateur dans le clone d'exécution après pull `develop` (une fois #59 mergée) :
  login AC → planning sans toast, double-clic séance → drawer sans « Modifier », page Enseignants
  peuplée.
- Si l'AC doit voir Salles/Classes au-delà du scope actuel, prévoir endpoints scoped dédiés
  (déjà amorcé via `GET /api/ac/me/scope`).

## 9. Mises à jour annexes

- Aucun lock posé (correctif court, pas de ressource partagée verrouillée).
- `shared-resources-lock.md` inchangé.
- Le `EnseignantsController` ouvre maintenant la lecture à l'AC — à signaler à Oumar
  (`feat/oumar`) pour cohérence si d'autres référentiels lecture doivent suivre.
