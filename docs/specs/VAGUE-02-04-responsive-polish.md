# VAGUE-02-04 — Polish responsive Enseignant / Étudiant

> Référence vague 02, tâches **D'.2 → D'.5** (LOT 7.1 — Oumar).
> Audit en entrée : `docs/responsive-audit-v02.md`. LOT 7 livré 2026-05-28 (journal `docs/agent-journal/oumar/2026-05-28-vague02-lot7.md`).

## 1. User Story

En tant qu'**Enseignant** ou **Étudiant** consultant PLANIT depuis un téléphone, une tablette **ou un grand écran**, je veux que la typographie, les largeurs et les éléments d'interface (notamment l'icône notifications) restent **lisibles, proportionnés et visibles** aux 3 breakpoints standards (375 / 768 / 1280), afin que la plateforme paraisse prTest1234o sur n'importe quel device.

## 2. Critères d'acceptation

- [ ] L'icône **notifications (BellIcon)** est visible sur les 3 viewports (375 / 768 / 1280), sur les 3 pages (home/planning/détail) × 2 acteurs (enseignant/étudiant) — y compris quand `unread = 0`.
- [ ] Sur ≥1024px, le titre `Greeting` (« Bonjour, … 👋 ») est lisible (≥ 28 px) ; sur 375px il reste ≤ 24 px sans débordement.
- [ ] `WeekStrip` (home) : les cellules jour grandissent en `md/lg` (largeur fluide) au lieu de rester `w-[60px]/w-[72px]` fixe.
- [ ] `WeekTimeline` (planning vue Semaine) : largeur colonne `COL_W` adaptative à partir de `md` — pas de scroll-X forcé quand l'écran peut tout contenir.
- [ ] `SessionDetailView` : titre module (`h2`) en `text-xl sm:text-2xl lg:text-3xl`, conteneur cardé `max-w-2xl lg:max-w-3xl` centré sur desktop (pas étiré pleine largeur).
- [ ] Les textes sont tronqués ou cassés (`overflow`/`truncate` volontairement) si seulement nécessaire. Par exemple si la vue est assez grande on peut afficher encore plus largemenement et si la vue est réduite on propose un simple pro UI.
- [ ] Lighthouse mobile : **Accessibility ≥ 90 · Performance ≥ 85** maintenus.
- [ ] `docs/responsive-audit-v02.md` mis à jour avec une section « v2 — après polish » (tableau 6 pages × 3 viewports).
- [ ] `docs/lighthouse-v02.md` mis à jour avec scores post-fix.

## 3. Écrans de référence

- PLANIT-IA : prototypes Enseignant + Étudiant (réutiliser le rendu Mobile validé V01). Pas de nouvelle maquette — polish des écrans existants.
- Captures actuelles (avant) : journal LOT 7 Oumar (2026-05-28).

## 4. Données d'entrée / sortie

### Inputs

- Aucun DTO ni endpoint nouveau. Pure refonte CSS/Tailwind sur les composants existants.

### Outputs

- Composants visuels mis à jour (pas de changement d'API).
- Aucune migration. Aucun event WS.

## 5. Règles métier — corrections à appliquer

### Défaut 1 — Bell notifications invisible ≥ md (CRITIQUE)

Fichiers : `apps/web/src/components/enseignant/mobile-shell.tsx` **et** `apps/web/src/components/etudiant/mobile-shell.tsx` (structure identique).

- **Problème** : la `BellIcon` vit uniquement dans `MobileHeader` (ligne ~236) qui est `md:hidden` (ligne 73 / 217). Sur ≥768px, plus aucune cloche affichée — la `DesktopSidebar` n'en a pas. Régression UX.
- **Correction** : ajouter un bouton notifications dans `DesktopSidebar` (entre le `<nav>` ligne 159 et la section utilisateur ligne 162), avec **même `BellIcon`, même `aria-label`, même badge `unread`**, classes alignées sur les autres liens sidebar (`rounded-lg px-3 py-2.5 text-[13.5px] font-semibold`). Bouton non fonctionnel (pas de `onClick`) — `title="Notifications bientôt disponibles"`. Ajouter la même chose dans la variante étudiant.
- **Vérifier** : l'icône reste visible sur `<375px` (header mobile) ET sur `≥768px` (sidebar desktop).

### Défaut 2 — Typo fixe non fluide

| Fichier                                          | Ligne                                      | Changement                                                                                                                                                                                   |
| ------------------------------------------------ | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/enseignant/greeting.tsx`             | 20                                         | `text-2xl font-semibold tracking-tight text-text sm:text-[26px]` ➝ `text-2xl sm:text-[26px] lg:text-3xl xl:text-[34px]`                                                                      |
| `components/enseignant/hero-current-session.tsx` | 76                                         | `font-display text-lg font-semibold` ➝ `text-lg md:text-xl lg:text-2xl`                                                                                                                      |
| `components/enseignant/hero-current-session.tsx` | 125                                        | `text-xl ... sm:text-[22px]` ➝ `text-xl sm:text-[22px] lg:text-[26px]`                                                                                                                       |
| `components/enseignant/hero-current-session.tsx` | 138                                        | `text-[13px]` ➝ `text-[13px] lg:text-sm`                                                                                                                                                     |
| `components/enseignant/sessions-today-list.tsx`  | 76, 119, 122, 125, 129, 136, 147, 157, 178 | les `text-[Xpx]` arbitraires : ajouter palier `lg:` (+1px chacun) — ex. `text-[13px]` ➝ `text-[13px] lg:text-sm` ; `text-[14px]` ➝ `text-[14px] lg:text-[15px]`. **Garder mobile inchangé.** |
| `components/enseignant/session-detail-view.tsx`  | 60, 98, 102, 107, 112                      | titre h2 ligne 102 : `text-xl sm:text-2xl` ➝ `text-xl sm:text-2xl lg:text-3xl`. Labels InfoItem ligne 60 : `text-sm` ➝ `text-sm lg:text-base`.                                               |
| `components/enseignant/week-strip.tsx`           | 80, 89, 95, 99                             | Cellules : ajouter palier `md:` (initial `text-[9px] md:text-[10px]`, num `text-[21px] md:text-[24px] lg:text-[28px]` actif idem +4).                                                        |

**Règle générale** : pour toute `text-[Xpx]` arbitraire actuelle, ajouter un palier `lg:` qui augmente de 1-3 px (lisibilité grand écran). Mobile inchangé. **Ne pas** introduire `clamp()` dans les composants — rester sur les utilities Tailwind (cohérence équipe, lisibilité du diff).

### Défaut 3 — Largeurs fixes non adaptatives

| Fichier                                                   | Ligne     | Changement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/{enseignant,etudiant}/mobile-shell.tsx`       | 109       | sidebar `w-64` ➝ `w-64 lg:w-72` (un poil plus large sur ≥1024 pour aérer).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `components/{enseignant,etudiant}/mobile-shell.tsx`       | 71        | Contenu desktop : ajouter wrapper `lg:max-w-6xl lg:mx-auto lg:w-full` dans le `<main>` ou autour de `{children}` — évite la ligne de texte qui s'étire sur 1500px. **Important** : ne pas casser le mobile (`max-md:max-w-md`). Application : passer un wrapper interne sur les pages, **pas** sur le `<main>` global (sinon planning week timeline qui scroll-X serait contraint). Solution recommandée : ajouter sur le `<div>` racine de chaque `page.tsx` (enseignant + étudiant home/seance) la classe `mx-auto w-full lg:max-w-5xl`. **Ne pas l'ajouter sur planning** — la grille a son propre scroll-X. |
| `components/enseignant/week-strip.tsx`                    | 70-71     | `h-[100px] w-[72px]` / `h-[92px] w-[60px]` ➝ `h-[100px] w-[72px] md:h-[112px] md:w-[88px] lg:h-[120px] lg:w-[96px]` (actif) et idem +12px partout en md/lg pour la version inactive.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `components/enseignant/week-timeline.tsx`                 | 17        | `const COL_W = 168` reste 168 (drag/grid math). Pour profiter du desktop sans casser la math : ajouter un media-query CSS via `style` conditionnel **OU** plus simple : laisser tel quel mais retirer le scroll forcé en md+ via `md:overflow-x-visible` ligne 445 si `7 * COL_W < viewport`. **Décision : ne pas refactorer la grille pixel-perfect en LOT 8'** — limiter à un commentaire `// TD-RESP-WEEK` et laisser le scroll-X (acceptable comme le note l'audit).                                                                                                                                        |
| `components/enseignant/session-detail-view.tsx`           | 87        | `<article className="flex flex-col gap-4">` ➝ `<article className="mx-auto flex w-full max-w-2xl flex-col gap-4 lg:max-w-3xl">` — évite la carte qui s'étire à 1500px.                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `app/(planit)/{enseignant,etudiant}/page.tsx`             | 61 (home) | `<div className="flex flex-col gap-4 px-4 py-4">` ➝ `<div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4 lg:max-w-5xl">`                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `app/(planit)/{enseignant,etudiant}/seance/[id]/page.tsx` | 24        | Idem ➝ `mx-auto ... max-w-3xl`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `app/(planit)/{enseignant,etudiant}/planning/page.tsx`    | 103       | NE PAS toucher (grille planning = pleine largeur volontaire).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

### Défaut 4 — Toolbar planning trop dense en desktop

Fichiers : `app/(planit)/{enseignant,etudiant}/planning/page.tsx` ligne 106.

- Sur ≥md, la toolbar reste compacte (text 11-12px). Ajouter `md:text-[13px] md:py-2.5 md:px-4` sur la `<div>` toolbar (`px-3 py-2` ➝ `px-3 py-2 md:px-4 md:py-2.5`) et sur les boutons enfants palier md +1px.

## 6. Plan de tests

- **Manuel (D'.4)** : ouvrir Chrome DevTools, tester les 6 pages aux viewports 375 / 768 / 1280. Vérifier visuellement : Bell présente, titres lisibles, pas de débordement, pas de truncation involontaire. Captures avant/après ajoutées au journal.
- **Lighthouse (D'.5)** : audit mobile sur les 6 pages — Accessibility ≥ 90, Performance ≥ 85. Pas de régression vs `docs/lighthouse-v02.md` existant.
- **Lint + typecheck** : `pnpm --filter web typecheck && pnpm --filter web lint` doivent rester verts (changements purement Tailwind/utility classes).
- **Test unitaire existant** : `pnpm --filter web test` — `hero-current-session.test.tsx` doit rester vert (pas de changement de prop public).

## 7. Hors-périmètre

- **RP planning** : reste desktop-first, hors-scope responsive (V03/V04).
- **Refonte de `WeekTimeline` / `DayTimeline` en grille fluide** : conservé pour V03 (tech-debt `TD-RESP-WEEK` à créer). Pixel-math actuelle préservée.
- **Brancher la Bell sur un vrai feed notifications** : V03+. Ici, l'icône reste visuelle.
- **Introduction de `clamp()` ou tokens de typo fluide dans `@planit/design-tokens`** : pas dans ce LOT. À discuter en ADR V03.
- **`Greeting` côté étudiant** : déjà partagé (composant `enseignant/greeting.tsx` importé par étudiant) — le fix profite aux deux acteurs.

## 8. Risques / questions ouvertes

- **Risque régression mobile** : tous les paliers ajoutés sont des `md:`/`lg:` purs — le rendu < 768px reste **strictement identique** à LOT 7. À vérifier visuellement (D'.4).
- **Risque conflit avec PR LOT 7 d'Oumar** si pas encore mergée sur develop : commencer LOT 8' **après** merge LOT 7.
- **WeekTimeline COL_W=168 sur grand écran (1920px+)** : laisse une bande vide à droite. Acceptable V02 — tracé en tech-debt.
- **Sidebar `lg:w-72`** : valider visuellement que ça ne pousse pas le contenu sous une largeur inconfortable sur 1280px (256 → 288 = +32px, contenu passe de 1024 à 992 → OK).
- **Élément similaire à Bell qui disparaîtrait** : grep `md:hidden` sur l'arborescence enseignant/étudiant pour vérifier. À ce stade, identifié uniquement sur header mobile (logo + Bell + avatar profil) — le logo est dupliqué en sidebar, l'avatar est dupliqué en bas de sidebar, **seule la Bell n'a pas son équivalent** desktop. C'est le seul élément à reconduire.
