# Skeleton loading pro + durcissement (auth boot, édition séance)

**Date** : 2026-06-01
**Branche** : `feat/salim`
**PR cible** : `develop`

## 1. Directives reçues

L'utilisateur signale, capture à l'appui (`/login/rp` en 404) :

1. **Premier chargement** : spinner « qui ne finit jamais », il faut **actualiser**
   pour que l'app vienne. Idem parfois : `/rp` → login → bons identifiants →
   page 404 `/login/rp`.
2. **Édition séance cassée** : cliquer « Modifier » affiche le flash « séance
   modifiée » et reste sur l'overlay de détail.
3. **Perf** : remplacer les « Chargement… » / spinners des pages liste par un
   **lazy load pro** — page affichée d'abord, données « floutées » avec animation,
   sur **toutes** les données de toutes les pages, + **documentation**.
4. Vérifier / corriger intelligemment d'autres soucis. Travailler sur sa branche.

## 2. Diagnostic (live, stack réelle backend+DB+front)

Reproduction au navigateur (preview) sur le code actuel (`feat/salim` = HEAD
`develop`, post-PR #42) :

- **Spinner infini (1)** : **ne se reproduit pas**. `/auth/me` répond 401 vite ;
  login → `/rp` ; round-trip returnUrl OK.
- **`/login/rp` 404 (1)** : **ne se reproduit pas**. Aucun code ne construit ce
  chemin (tous les `router.replace` / redirections sont absolus ; middleware émet
  `/login?returnUrl=%2Frp`). Vérifié en live : `/rp` non-auth →
  `/login?returnUrl=%2Frp` → login → `/rp`. Le returnUrl encode bien le chemin
  complet (confirmé aussi sur `/rp/enseignants`).
- **Édition (2)** : **ne se reproduit pas** non plus. « Modifier » ouvre le
  formulaire ; changement de libellé → « Enregistrer » → persiste → retour détail
  à jour.

**Conclusion** : ces 3 symptômes = exactement les bugs corrigés par PR #41/#42
(CSP `unsafe-eval` dev, race StrictMode, returnUrl). Sur le code actuel ils sont
absents → cause côté utilisateur = **serveur `next dev` / `.next` / cache
navigateur stale** (antérieur au merge). Reco : `rm -rf .next`, relancer
`next dev`, hard-refresh (Ctrl+Shift+R). **Mais** comme demandé, j'ai **durci le
code** pour rendre ces classes de bugs impossibles, indépendamment du cache.

## 3. Décisions techniques (autonomie)

### Durcissement

- **Timeout du boot auth** ([auth-context.tsx](../../../apps/web/src/contexts/auth-context.tsx)) :
  le `fetch('/auth/me')` du `AuthProvider` n'avait **aucun timeout** → si le
  backend pend (cold-start, proxy), l'app restait bloquée en `loading` (spinner
  infini « débloqué » par un refresh). Ajout d'un `setTimeout` (8 s) qui `abort`
  et bascule en `unauthenticated` (→ /login). On distingue l'abort de **cleanup**
  (ignoré, StrictMode-safe) de l'abort de **timeout** (→ dispatch `CLEAR_USER`).
- **Keys footer du drawer** ([session-detail-drawer.tsx](../../../apps/web/src/components/planning/session-detail-drawer.tsx)) :
  cause-racine du bug d'édition rapporté = **morphing de nœud DOM**. En lecture,
  le bouton primary « Modifier » (type=button) et, en édition, « Enregistrer »
  (type=submit, form=…) occupent la **même position** dans le fragment footer.
  Sans `key`, React **réutilise le nœud** : au clic « Modifier », le flush
  synchrone du `setState` mute le bouton en submit **avant** que le navigateur
  n'exécute l'activation par défaut → **soumission fantôme** du formulaire au
  simple clic. Ajout de `key` distinctes (`cancel`/`save` vs `delete`/`edit`) →
  démontage/remontage, plus de morph. (Non reproduit via clic synthétique mais le
  morph est réel ; correctif défensif + commenté.)

### Skeleton loading

- **Brique `<Skeleton>`** ([skeleton.tsx](../../../apps/web/src/components/ui/skeleton.tsx))
  - utilitaire CSS `.skeleton` (shimmer) dans
    [globals.css](../../../apps/web/src/app/globals.css) (Tailwind v4 `@utility` +
    keyframe `planitShimmer`). Fond = token `--color-border-soft`, reflet via
    `color-mix(--color-surface)` (pas de hex en dur), **figé sous
    `prefers-reduced-motion`**.
- **Squelettes par page** mimant la structure réelle (zéro CLS) : table
  Enseignants, liste Filières, accordéon UE & Modules (+ liste modules lazy),
  drawer détail séance. Branchés sur `isLoading` (cold load only — pas de flash
  au refetch/filtre grâce au comportement `placeholderData`).
- **Pattern documenté** : [docs/runbooks/skeleton-loading.md](../../runbooks/skeleton-loading.md).

## 4. Décisions soumises à validation

Aucune décision sensible (pas de dep, pas de Prisma, pas de `contracts`, pas de
suppression > 20 lignes). Reste à arbitrer par le TL si souhaité : migrer les
squelettes historiques (`planning-grid-skeleton`, `hero-skeleton`) de
`animate-pulse` vers `<Skeleton>` pour l'uniformité (noté dans le runbook, non
fait ici pour rester focalisé).

## 5. Modifications

### Créés

- `apps/web/src/components/ui/skeleton.tsx` — brique `<Skeleton>`.
- `apps/web/src/components/rp/enseignants/enseignants-table-skeleton.tsx`
- `apps/web/src/components/rp/filieres/filieres-list-skeleton.tsx`
- `apps/web/src/components/rp/ue-modules/ue-modules-skeleton.tsx` (`UeModulesSkeleton` + `ModulesListSkeleton`)
- `apps/web/src/components/planning/session-detail-skeleton.tsx`
- `docs/runbooks/skeleton-loading.md`

### Modifiés

- `apps/web/src/app/globals.css` — keyframe `planitShimmer` + `@utility skeleton` + reduced-motion.
- `apps/web/src/contexts/auth-context.tsx` — timeout boot `/auth/me` (anti-spinner-infini).
- `apps/web/src/components/planning/session-detail-drawer.tsx` — `<SessionDetailSkeleton>` + keys footer.
- `apps/web/src/app/(planit)/rp/enseignants/page.tsx` — `<EnseignantsTableSkeleton>`.
- `apps/web/src/app/(planit)/rp/filieres/page.tsx` — `<FilieresListSkeleton>`.
- `apps/web/src/app/(planit)/rp/ue-modules/page.tsx` — `<UeModulesSkeleton>` + `<ModulesListSkeleton>`.

Pas de test unitaire ajouté (composants présentationnels triviaux ; couverts par
le typecheck + la vérif navigateur). Les squelettes portent `role="status"` +
`aria-busy` pour rester testables/accessibles.

## 6. Phase CHECK — résultats

- `pnpm --filter @planit/web typecheck` ✅
- `pnpm --filter @planit/web lint` ✅ (0 warning)
- `pnpm --filter @planit/web test` ✅ **42/42** (8 fichiers) — warning `act()` du
  smoke test préexistant (AuthProvider async), pas une régression.
- `pnpm --filter @planit/web build` ✅
- **Smoke navigateur** (preview + backend :3001 + Postgres) :
  - Flux auth complet : `/rp` non-auth → `/login?returnUrl=%2Frp` → login → `/rp` ✅
  - Édition séance : Modifier → form → changement libellé → Enregistrer → persiste
    → détail à jour (avec le fix des keys) ✅
  - **Skeleton Enseignants** capturé : 72 blocs, 8 avatars, `aria-busy`
    « Chargement des enseignants », shimmer `planitShimmer` actif, **en-têtes de
    table visibles pendant le chargement** (chrome d'abord) ✅
  - `.skeleton` computed styles : `position:relative`, `overflow:hidden`,
    bg `#f0edeb` (token), `::after` gradient + `planitShimmer 1.6s` ✅

## 7. Surprises / blocages

- **Les 3 bugs ne se reproduisent pas** sur le code à jour → diagnostic réorienté
  vers le durcissement + la cause stale-cache. Important de le dire clairement à
  l'utilisateur (sinon on « corrige » du vent).
- **Vérif skeleton vs cache TanStack** : les données seed se chargent trop vite et
  `placeholderData` masque le loading au refetch. Capture obtenue en forçant une
  query froide (changement de filtre statut post-reload) + délai fetch injecté.
  Astuce ajoutée au runbook. Le screenshot hangeait sur l'animation infinie → fige
  `.skeleton::after` avant capture.
- **Donnée test restaurée** : un libellé « Algo » modifié en « Algo MODIF TEST »
  pendant le diagnostic a été remis à « Algo » (état seed d'origine, déjà dirty).

## 8. Suite

- Commit + PR `feat/salim → develop`.
- Reco utilisateur : purge `.next` + restart `next dev` + hard-refresh pour les
  symptômes stale (le code est déjà sain et désormais durci).
- Optionnel V02+ : uniformiser les squelettes historiques sur `<Skeleton>`.

## Mises à jour annexes

- **Runbook** : `docs/runbooks/skeleton-loading.md` (nouveau).
- **CLAUDE.md / ADR / tech-debt** : aucun changement (pattern additif, pas de
  décision structurante). Le pattern skeleton pourra être cité dans les « patterns
  émergés » au prochain passage CLAUDE.md si le TL le souhaite.

---

## Addendum (2026-06-02) — finalisation V02 + déblocage release Lighthouse

PR #43 mergée sur `develop`. Lancement de la release V02 (`develop → main`, PR #44).
Le **Lighthouse strict** (auto-bloquant sur cible `main`) a échoué — **pas une
régression de cette PR** : 1ʳᵉ PR strict depuis l'arrivée du middleware edge
(PR #42). Le middleware redirige `/etudiant`·`/enseignant` (audités par le job)
en **307 → /login** en anonyme → l'audit `redirects` tombe à 0 (faux négatif, le
redirect d'auth est légitime). Seul blocage ; `performance`/`accessibility`
passent (sur `/login`).

**Fix retenu (validé TL)** : le job audite désormais **`/login`** (seule page
publique post-auth, shell commun aux 3 acteurs) au lieu des routes gated. Plus de
redirect → audit vert, sans toucher au gating. Limite assumée : le contenu réel
des pages connectées n'est pas audité → tech-debt **`TD-LH-AUTH-AUDIT`** (run
authentifié via `puppeteerScript`).

- **Modifiés** : `.github/workflows/ci.yml` (URLs → `/login` + commentaire),
  `docs/runbooks/ci-lighthouse.md` (§ « Quelle URL est auditée » + futures),
  `docs/tech-debt.md` (`TD-LH-AUTH-AUDIT`), `CLAUDE.md` (note politique LH).
- **Flux** (validé TL) : commit sur `feat/salim` → PR → `develop` ; release #44
  re-run vert ; **le TL clique Merge sur #44** (main). Puis tag `v0.2.0` annoté
  sur PLANIT (par Claude) + sur PLANIT-Strategie-VibeCode (par Salim) + `push --tags`.
- Décision sensible signalée : édition de `CLAUDE.md` (note documentaire reflétant
  le fix validé, pas un changement de convention).
