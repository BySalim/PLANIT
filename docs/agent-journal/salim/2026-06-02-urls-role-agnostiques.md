# URLs role-agnostiques — unification des routes (V03-01)

**Date** : 2026-06-02
**Branche** : `feat/salim` (base `develop` @ v0.2.0)
**Spec** : [VAGUE-03-01](../../specs/VAGUE-03-01-urls-role-agnostiques.md)

## 1. Directives reçues

Après la release v0.2.0, l'utilisateur constate que les URLs exposent le rôle
(`/rp`, `/etudiant`, `/enseignant`). Demande : **retirer tout nom d'acteur de la
barre d'adresse, sur toutes les pages, sans le remplacer** par un autre segment.
Approche validée : **B — unification role-aware** (et non un rewrite middleware).
Timing validé : **après la release V02**. Plan validé avant tout code.

## 2. Décisions techniques

- **Route groups Next.js** `(consult)` / `(gestion)` (invisibles dans l'URL) pour
  porter le RBAC front (`RequireAuth roles`) sans segment de rôle. Remplacent les
  layouts par dossier d'acteur.
- **Home `/` role-aware** ([app/(planit)/page.tsx](<../../../apps/web/src/app/(planit)/page.tsx>)) :
  `RequireAuth roles={[]}` (tout authentifié) puis switch — RP/AC →
  `<RpPlanningView>`, autres → `<ActorHomeView>`. Supprime l'ancien résolveur
  `app/page.tsx` (qui serait entré en conflit de route avec `/`).
- **Fusion des pages quasi-jumelles** (mesuré : 78–92 % identiques) :
  `/enseignant`+`/etudiant` → `/` (dashboard), `…/planning` → `/planning`,
  `…/seance/:id` → `/seance/:id`. Différences (hook, `teacherId`/`studentId`,
  `variant`) pilotées par **`useCurrentActor()`** (réécrit : lit `useAuth()`,
  dérive `variant` du rôle) et **`<MobileShell>` unifié** ([components/layout](../../../apps/web/src/components/layout/mobile-shell.tsx)).
- **Admin RP** déplacé sous `(gestion)` : `/enseignants`, `/filieres`,
  `/ue-modules` (sans préfixe `/rp`).
- **`ROLE_HOME` → `/`** pour tous ; login + RequireAuth (mismatch) redirigent vers
  `/`. **`next.config.ts > redirects()`** : 308 des anciennes URLs vers les
  nouvelles (pas de 404 sur bookmarks). Sidebar : 4 hrefs mis à jour.
- **RBAC réel inchangé** (guards serveur NestJS) ; le front gate par groupe.

## 3. Décisions soumises à validation

- Plan complet validé par le TL avant code (route map, ordre, périmètre).
- Suppression > 20 lignes (anciens dossiers acteurs) : flaggée, couverte par la
  validation du plan.
- `next.config.ts` (redirections) modifié — ressource d'infra front, pas dans les
  soft-locks. Aucune dép / Prisma / `contracts` touchée. `TD-022` hors scope.

## 4. Modifications

### Créés

- `app/(planit)/page.tsx` (home role-aware) ; `(consult)/layout.tsx` +
  `(consult)/planning/page.tsx` + `(consult)/seance/[id]/page.tsx` ;
  `(gestion)/layout.tsx`.
- `components/rp/rp-planning-view.tsx`, `components/consult/actor-home-view.tsx`,
  `components/layout/mobile-shell.tsx` (unifié).
- `docs/specs/VAGUE-03-01-urls-role-agnostiques.md`.

### Déplacés (git mv)

- `rp/{enseignants,filieres,ue-modules}/page.tsx` → `(gestion)/…` (contenu inchangé).

### Modifiés

- `hooks/use-current-actor.ts` (réécrit, auto-suffisant) ; `contexts/auth-context.tsx`
  (`ROLE_HOME` → `/`) ; `app/login/page.tsx` (fallbacks `/`) ;
  `components/layout/sidebar.tsx` (4 hrefs) ; `next.config.ts` (redirects) ;
  tests `smoke.test.tsx` + `return-url.test.ts`.

### Supprimés

- `app/page.tsx` (résolveur) ; dossiers `app/(planit)/{rp,enseignant,etudiant}/` ;
  `components/{enseignant,etudiant}/mobile-shell.tsx` ;
  `hooks/use-current-{teacher,student}.ts`.

## 5. Phase CHECK — résultats

- `typecheck` ✅ · `lint` ✅ (0 warning) · `test` ✅ **42/42** (8 fichiers) ·
  `build` ✅ — route map prod : `/`, `/planning`, `/seance/[id]`, `/enseignants`,
  `/filieres`, `/ue-modules`, `/login` — **aucune route à nom d'acteur**.
- **Smoke navigateur par rôle** (preview + backend + Postgres) :
  - RP login → `/` (grille planning + sidebar admin), URL sans `/rp` ✅
  - Legacy `/rp` → `/` → `/login?returnUrl=%2F` ✅ ; `/rp/enseignants` → `/enseignants` ✅
  - Enseignant login → `/` (dashboard, pas la grille RP), URL sans nom d'acteur ✅
  - `/planning` (enseignant) ✅
  - **RBAC** : enseignant sur `/enseignants` → redirigé `/` (table admin masquée) ✅
  - Console : 0 erreur ✅

## 6. Surprises / blocages

- **Backend (3001) était down** pendant la vérif (process crashé, sans rapport avec
  le refactor frontend) → `/api/*` proxifié renvoyait 500. Redémarré (`pnpm --filter
@planit/backend dev`), Postgres/Redis/MinIO toujours up. Vérif reprise OK.
- `useCurrentActor` **existait déjà** (version V01 `(kind)` non consommée) → réécrit
  en auto-suffisant. `teacher`/`student` était **inutilisé** dans la page seance →
  retiré dans la fusion.

## 7. Suite

- Commit + PR `feat/salim → develop`. Pas de release immédiate (refactor post-v0.2.0).
- `TD-022` (id métier distinct de l'id User pour le filtre planning) reste ouvert.
- Audit Lighthouse authentifié (`TD-LH-AUTH-AUDIT`) pourrait désormais auditer `/`
  et `/planning` une fois le run authentifié en place.

## 8. Mises à jour annexes

- **Spec** : `docs/specs/VAGUE-03-01-urls-role-agnostiques.md` (nouveau).
- **CLAUDE.md / tech-debt** : pas de changement structurant ici ; le pattern
  « route groups pour RBAC + URLs role-agnostiques » pourra être cité dans les
  patterns émergés V03 au prochain passage si le TL le souhaite.
