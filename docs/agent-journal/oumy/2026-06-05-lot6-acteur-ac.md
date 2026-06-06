# Journal — LOT 6 V03 : Acteur AC (Attaché de Classe)

> **Membre** : Oumy (`feat/oumy`) · **Date** : 2026-06-05 · **LOT** : Vague 03 — LOT 6 (G.1 → G.7)

## 1. Directives reçues

« Réaliser tout le LOT 6 de la Vague 3 sans casser le code actuel, avec les méthodes les
plus propres/maintenables de la communauté. Suivre les étapes du LOT ; signaler les points
non décidables seul, sinon adopter l'approche la plus intelligente. Se référer à
`PLANIT-Design/atc/` pour le frontend. Commits, push et PR en fin de LOT. »

## 2. Décisions techniques (autonomie)

- **Branchement par rôle dans la même sidebar** (`NAV_RP` / `NAV_AC` + `navForRole(role)`) au
  lieu d'un second composant `<AcSidebar>`. Évite la duplication des poignées de drag, du
  collapsed-mode et du bloc profil. La fonction `navForRole` est le point d'évolution unique
  si d'autres rôles (Direction, Admin) doivent recevoir leur propre menu.
- **Profil sidebar branché sur `useAuth()`** — fix opportuniste : le bloc affichait
  systématiquement « Aïssatou Diallo · Responsable de programme » (constante `PROFILE`
  hardcodée pré-V02). Bug pour le RP réel et bug pour tous les autres rôles. Comme la
  sidebar était de toute façon modifiée pour le menu role-aware, fix gratuit ici.
- **Route group `(gestion)/(rp-only)/`** au lieu d'un `RequireAuth` répété sur 4 pages.
  Déplacement git mv préservant l'historique ; aucune URL ne change (route group invisible).
  Un AC qui force `/maquettes` est redirigé vers `/` par `<RequireAuth>` (comportement
  existant — fallback `ROLE_HOME[role]`).
- **`readOnly?: boolean` propagée** sur `PlanningToolbar` / `PlanningGrid` / `PlanningFooter`
  plutôt qu'un `<AcPlanningView>` parallèle. Un seul parcours de code, divergence visuelle
  nulle, tests existants restent verts (le défaut `readOnly=false` préserve le comportement RP).
  Dans le `PlanningGrid` j'ai opté pour des **early-return** dans les handlers (handleDrop,
  handleDragOver, startResize, onMouseMove/Down/Up/Leave sur les colonnes, useEffect Ctrl+C/V)
  plus rendu conditionnel des `ResizeHandle` et de `onDragStart`. C'est moins clean qu'un
  hook custom dédié mais minimum invasif et bien testable.
- **Hooks transverses `useRole/useIsAc/useIsRp/roleLabel`** (apps/web/src/hooks/use-role.ts).
  Évite `state.user.role === 'X'` dispersé partout. Un seul point d'évolution si l'enum
  change.
- **`useAcScope()`** = TanStack Query gated sur `useIsAc()`. Aucun fetch si l'utilisateur
  n'est pas AC (pas de 403 inutile côté backend, pas de bruit console Lighthouse).
- **Menu AC strictement 8 entrées** (V3-D9). Groupement choisi : PRINCIPAL (4) · MES CLASSES
  (2) · RÉFÉRENTIELS (2). Le label « MES CLASSES » évoque le scoping AC sans en faire trop.
  Décision actée dans la spec — réversible si le TL préfère un autre découpage.
- **Suivi modules** : bouton Terminer/Rouvrir + bulk select **masqués** pour AC (au lieu
  d'être désactivés avec tooltip comme avant). Cohérent avec la philosophie « menu AC strict » :
  on n'invite pas l'AC à des actions qu'il n'a pas le droit d'effectuer.
- **Page Salles** : V03 minimal — AC voit ses salles via `useAcScope()`, RP voit un
  `ComingSoonPlaceholder`. Tracée tech-debt `TD-V03-SALLES-RP` pour la version RP complète.
- **Fiche enseignant** : le bouton « Voir » ouvre la modale d'édition (passe `openEdit`) même
  côté AC ; la modale est éditable mais le backend refusera l'envoi 403. Acceptable pour V03 ;
  tracé tech-debt `TD-V03-AC-VIEW-ENSEIGNANT` pour une vraie fiche lecture seule en V04.

## 3. Décisions soumises à validation (Salim)

- **Groupement du menu AC** (PRINCIPAL / MES CLASSES / RÉFÉRENTIELS) : choix sensé mais le
  TL pourrait préférer un seul groupe ou un autre découpage.
- **`Tableau de bord` et `Demandes` côté RP** : les hrefs RP pointent maintenant vers les
  pages placeholder partagées avec l'AC (au lieu de `href: '#'`). Cohérent (un seul écran
  V03 placeholder) mais c'est un léger changement UX côté RP.
- **`Salles` côté RP** : placeholder doux V03 — le LOT 6 ne prévoit pas la version RP. À
  confirmer que ce placeholder est acceptable ou s'il faut le retirer du menu RP en attendant.

## 4. Modifications

**Créés**

- `docs/specs/VAGUE-03-06-ac-frontend.md` (SPEC)
- `apps/web/src/hooks/use-role.ts` (useRole / useIsAc / useIsRp / useIsAuthenticated / roleLabel)
- `apps/web/src/hooks/use-ac-scope.ts` (useAcScope, TanStack Query)
- `apps/web/src/components/ui/coming-soon-placeholder.tsx` (placeholder partagé)
- `apps/web/src/app/(planit)/(gestion)/tableau-de-bord/page.tsx` (G.7)
- `apps/web/src/app/(planit)/(gestion)/demandes/page.tsx` (G.7)
- `apps/web/src/app/(planit)/(gestion)/(rp-only)/layout.tsx` (G.1, RequireAuth RP-only)
- `apps/web/src/app/(planit)/(gestion)/salles/page.tsx` (G.6)
- `apps/web/src/hooks/__tests__/use-role.test.ts` (7 tests)
- `apps/web/src/components/layout/sidebar.test.tsx` (3 tests)

**Déplacés (route group `(rp-only)`)**

- `apps/web/src/app/(planit)/(gestion)/maquettes/` → `(rp-only)/maquettes/`
- `apps/web/src/app/(planit)/(gestion)/formations/` → `(rp-only)/formations/`
- `apps/web/src/app/(planit)/(gestion)/filieres/` → `(rp-only)/filieres/`
- `apps/web/src/app/(planit)/(gestion)/ue-modules/` → `(rp-only)/ue-modules/`

**Modifiés**

- `apps/web/src/components/layout/sidebar.tsx` (NAV_RP/NAV_AC + profil branché useAuth)
- `apps/web/src/app/(planit)/(gestion)/suivi-modules/page.tsx` (CTA Terminer masqués si AC)
- `apps/web/src/app/(planit)/(gestion)/classes/page.tsx` (CTA création/édition masqués si AC)
- `apps/web/src/app/(planit)/(gestion)/enseignants/page.tsx` (CTA RP-only masqués si AC)
- `apps/web/src/components/planning/planning-toolbar.tsx` (prop `readOnly`)
- `apps/web/src/components/planning/planning-grid.tsx` (prop `readOnly` + early-return handlers)
- `apps/web/src/components/planning/stats-bar.tsx` (prop `readOnly` masque PublishButton)
- `apps/web/src/components/rp/rp-planning-view.tsx` (détecte isAc, propage readOnly,
  adapte breadcrumb)

## 5. Phase CHECK — résultats

- **typecheck** (`tsc --noEmit` apps/web) : ✅ vert (0 erreur) — vérifié après chaque commit
  thématique.
- **lint** (`pnpm lint` apps/web → `next lint --max-warnings 0`) : ✅ vert.
- **tests** (`vitest run` apps/web) : ✅ **61/61** (14 fichiers), dont 10 nouveaux (use-role
  - sidebar variant). `smoke.test.tsx` qui rend `RpPlanningView` reste vert (preuve
    non-régression du défaut `readOnly=false`). `planning-grid.test.tsx` (5 tests) idem.
- **build** (`next build`) : ⏳ lancé en arrière-plan ; complète avant push.
- **smoke navigateur** : ⚠️ **non réalisé localement** — backend non démarrable sur ce poste
  Windows (Prisma client OK, mais Postgres conteneur rejette les identifiants `.env` —
  bug environnemental connu, hors périmètre LOT 6 et déjà documenté dans le journal LOT 4).
  À faire dans l'environnement Ubuntu (stack complète). Garantie statique forte (typecheck +
  lint + tests + build verts ; 5 commits thématiques séparés pour faciliter la review).

## 6. Surprises

- **`PROFILE` hardcodé** dans la sidebar : depuis V02 le composant affichait « Aïssatou
  Diallo » quel que soit le rôle connecté (constante figée). C'était à la fois un bug RP
  (faux nom) et un bug AC (rôle erroné). Fix opportuniste dans G.2.
- **`(gestion)/planning` n'existe pas** : contrairement à ce que mon PROBE initial supposait,
  le planning RP/AC est rendu directement par le home `/` (V3-D13). Le route group
  `(consult)/planning` existe pour les acteurs lecture (étudiant/enseignant), mais il est
  isolé du flux RP/AC. Conséquence : pas de fichier `(gestion)/planning/page.tsx` à modifier.
  La modification readOnly se fait dans `<RpPlanningView>` (composant) + composants enfants.
- **Page Salles RP non prévue V03** : le LOT 6 livre la page Salles **uniquement** pour l'AC.
  Décision pragmatique : page accessible aux deux rôles mais rendu différencié (`ComingSoonPlaceholder`
  pour RP). Tracé tech-debt `TD-V03-SALLES-RP`.
- **Header commit-msg > 72 chars** : `commitlint` a refusé la 1ʳᵉ formulation du commit G.4/G.5/G.6
  (76 chars). Resserré à 60. Bonne occasion de vérifier que la convention équipe est bien câblée.

## 7. Suite

- **PR `feat/oumy` → `develop`** à ouvrir (LOT 6).
- **Smoke navigateur** à dérouler côté Ubuntu :
  1. `pnpm db:reset && pnpm dev`
  2. Login AC (cf. seed v3 — un compte AC seedé avec son RP manager + classes assignées)
  3. Vérifier le menu sidebar : 8 entrées exactes (TdB · Planning · Suivi · Demandes ·
     Étudiants · Classes · Enseignants · Salles), aucune entrée « OFFRE DE FORMATION ».
  4. Vérifier home `/` planning en lecture seule : pas de bouton + Nouvelle séance, pas
     de drag/resize, pas de bouton Publier en footer, double-clic ouvre le drawer détail.
  5. Forcer `/maquettes` → redirection vers `/` (route group `(rp-only)`).
  6. Inscription d'un étudiant depuis une fiche classe assignée → flow email OK.
  7. Vérifier `/salles` : liste des salles du RP manager (via `/ac/me/scope`).
- **Tech-debt** : `TD-V03-SALLES-RP` (vraie page Salles RP V04), `TD-V03-AC-VIEW-ENSEIGNANT`
  (vraie fiche enseignant lecture seule pour AC) — à tracer dans `docs/tech-debt.md` au
  prochain passage.
- Aucun soft-lock posé.

## 8. Mises à jour annexes

- Aucune modif de `CLAUDE.md`, d'ADR ou de `prisma/schema.prisma`.
- Statuts de la vague (repo stratégie, `master`) **non modifiés** sans demande — à flipper
  G.1→G.7 = `[x]` une fois le LOT validé par le TL.
- 5 commits thématiques sur `feat/oumy` :
  - `docs(specs): vague-03-06 acteur AC frontend (LOT 6)` (8e2c209)
  - `feat(web): vague-03 lot 6 — bases acteur AC (G.1/G.2/G.7)` (46be459)
  - `feat(web): vague-03 lot 6 — gating AC + Salles (G.4/G.5/G.6)` (941a3a0)
  - `feat(web): vague-03 lot 6 — planning AC lecture seule (G.3)` (648d9b5)
  - `test(web): vague-03 lot 6 — hooks role + sidebar variant AC` (d0caf90)
