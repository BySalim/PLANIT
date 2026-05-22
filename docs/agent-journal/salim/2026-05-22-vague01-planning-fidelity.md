# Journal d'agent — Vague 01 · LOT 2 — itération B (Fidélité planning RP)

**Date :** 2026-05-22
**Membre :** Salim Ouedraogo (`feat/salim`)
**Slug :** `vague01-planning-fidelity`
**Durée :** 1 session Claude Code (Sonnet 4.6).
**Statut :** Code livré, lint/typecheck/build verts, vérifié visuellement
sur `http://localhost:3000/rp` (1440×900).

---

## Directives reçues

- Après l'itération A (shell), revue côte-à-côte du rendu `/rp` avec les screenshots
  `localhost:5500/rp/` du prototype PLANIT-IA (5 captures fournies par
  l'utilisateur).
- Identification de 8 écarts visuels et d'interaction :
  1. **Palette par module** (6 teintes au lieu de palette par type).
  2. **SessionCard** trop chargé (badge type top + catégorie bottom).
  3. **⌘K shortcut** absent du champ de recherche.
  4. **Toolbar incomplet** (manque undo/redo, sélecteur classe, exporter,
     bouton "+ Nouvelle séance" pas orange vif).
  5. **Toggle Semaine/Jour + compteur "X séances"** absent.
  6. **Footer** : pas de compteur "validées" ; bouton Publier pas en gradient.
  7. **Bandeau fériés** : couleurs trop "warn beige" au lieu du jaune chaud
     du proto.
  8. **Sidebar drag-resize** non implémenté.

---

## Décisions techniques

| Décision                                                                        | Justification                                                                                                                                                                                              |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `paletteForSession(moduleId, type)` retourne une palette `{bar,bg,border,text}` | Source de vérité : `PLANIT-IA/rp/shared/tokens-ext.js` window.PALETTES. red et purple sont réservés aux catégories evaluation/evenement (jamais à un module).                                              |
| Hash stable `colorForModule(moduleId)` parmi 4 couleurs assignables             | `ModuleRef` du contrat n'expose pas `color`. V1 hash → brown/blue/green/orange. TD-018 trace l'ajout du champ contrat. Avantage : aucune modif `packages/contracts` (zone sensible).                       |
| `<SessionCard>` minimal — pas de badge type top, pas de pill catégorie bottom   | Le proto utilise ces éléments uniquement dans le catalogue de modules (V2), pas dans la grille. La barre verticale colorée + le bg pâle communique le module + catégorie. Plus respirant.                  |
| `<PlanningToolbar>` composant unique au lieu de 4 composants séparés            | Toolbar dense (8+ éléments) sur une ligne avec gap fixe. Mieux dans un wrapper unique que dispersé dans `page.tsx`. Permet d'isoler `undo/redo` + `class-selector` + `export` en sous-composants internes. |
| `+ Nouvelle séance` couleur `#EA580C` (pas `--color-accent` `#E8620A`)          | Le proto utilise `ORANGE = '#EA580C'` (Tailwind orange-600) précisément pour le rendre **plus saturé** que les autres oranges du système. CTA principal donc plus vif.                                     |
| `<PublishButton>` gradient inline (pas via Tailwind)                            | Pas de class Tailwind native pour `linear-gradient(135deg, X, Y)`. Style inline plus simple qu'une plugin custom.                                                                                          |
| Compteur "validées" calculé client-side depuis `sessions.status`                | Le backend stats endpoint expose `total/published/pending` (pas `validated`). Pour la fidélité du footer, on filtre localement sur `status === 'VALIDE'`. Évite une migration de schéma contracts/backend. |
| Compteurs topbar (`3 conflits / 5 demandes / 3 notifs`) hardcodés en V1         | Démo only. TD-020 trace la migration vers hooks dédiés (Vague 02). Cohérent avec les valeurs `D.kpis` du proto.                                                                                            |
| Sidebar drag-resize avec `useRef + document.addEventListener`                   | Pattern direct du proto. Pas de lib externe (`react-resizable-panels` etc.). Listeners sur `document` permettent de continuer le drag même si la souris sort de la poignée. `useRef` évite les re-renders. |
| Mode réduit (width < 100px) : icônes seules + dots pour badges                  | Reproduction proto exacte. Quand collapsed, les sections sont visibles toutes ensemble (sans toggles), séparées par hr. Les badges deviennent des dots ronds en coin haut-droit de l'icône.                |

---

## Décisions soumises à validation (validées)

Aucune nouvelle dépendance npm. Aucune modif `prisma/schema.prisma`. Aucune
modif `packages/contracts/`. Pas besoin d'arbitrage utilisateur — toutes les
décisions tiennent dans la zone "autonomie" du workflow.

---

## Modifications effectuées

### Palette + SessionCard

- [apps/web/src/lib/module-palette.ts](../../../apps/web/src/lib/module-palette.ts) :
  **nouveau**. Définit `MODULE_PALETTES` (6 teintes), `colorForModule()`,
  `categoryForType()`, `paletteForSession()`.
- [apps/web/src/components/planning/session-card.tsx](../../../apps/web/src/components/planning/session-card.tsx) :
  **refonte**. Style inline pour palette dynamique. Plus de badge top, plus
  de pill catégorie bottom. Conserve "Non publiée" + indicateur conflit.

### Topbar

- [apps/web/src/components/layout/topbar.tsx](../../../apps/web/src/components/layout/topbar.tsx) :
  ajout `<kbd>⌘K</kbd>` à droite du champ recherche (hidden sur mobile).

### Toolbar

- [apps/web/src/components/planning/planning-toolbar.tsx](../../../apps/web/src/components/planning/planning-toolbar.tsx) :
  **nouveau**. Sous-composants internes `UndoRedoButton`, `ClassSelector`,
  `ExportButton`, `NewSessionButton`. CTA orange `#EA580C`.

### Toggle Semaine/Jour + compteur

- [apps/web/src/components/planning/view-scope-toggle.tsx](../../../apps/web/src/components/planning/view-scope-toggle.tsx) :
  **nouveau**. Tabs `Semaine` (actif) / `Jour` (disabled, TD-017) + compteur
  séances à droite.

### Footer + PublishButton

- [apps/web/src/components/planning/stats-bar.tsx](../../../apps/web/src/components/planning/stats-bar.tsx) :
  **réécriture**. 4 compteurs (total/publiées/validées/provisoires) avec
  couleurs sémantiques (vert/bleu/orange). 4 boutons (Historique/Exporter/
  Aperçu étudiant disabled + Publier).
- [apps/web/src/components/planning/publish-button.tsx](../../../apps/web/src/components/planning/publish-button.tsx) :
  **refonte**. Gradient marron→orange inline + shadow orange + emoji 📡.

### Bandeau fériés

- [apps/web/src/components/planning/holiday-banner.tsx](../../../apps/web/src/components/planning/holiday-banner.tsx) :
  ajustement couleurs (`#FEF3C7 / #FDE68A / #FCD34D / #78350F` ; texte avec
  suffixe "— jour férié").

### Sidebar drag-resize

- [apps/web/src/components/layout/sidebar.tsx](../../../apps/web/src/components/layout/sidebar.tsx) :
  **refonte complète**. State `width` (56→320), `<DragHandle>` poignée 4px
  droite + listeners document, `<FloatingToggle>` chevron `fixed` qui suit
  la sidebar, `<CollapsedNavGroup>` pour le mode icônes-seules.

### Page /rp

- [apps/web/src/app/(planit)/rp/page.tsx](<../../../apps/web/src/app/(planit)/rp/page.tsx>) :
  utilise `<PlanningToolbar>` + `<ViewScopeToggle>` + nouveau `<PlanningFooter>`
  (signature simplifiée). Passe les compteurs démo V1 à `<Shell>`.

### Specs / TD

- [docs/specs/VAGUE-01-01-b-planning-fidelity.md](../../specs/VAGUE-01-01-b-planning-fidelity.md) :
  nouvelle spec.
- [docs/tech-debt.md](../../tech-debt.md) : TD-017 à TD-020.

---

## Résultats CHECK

```bash
pnpm --filter @planit/web lint        # ✓ 0 erreurs
pnpm --filter @planit/web typecheck   # ✓ 0 erreurs
pnpm --filter @planit/web build       # ✓ Compiled in 26.0s
                                       # /rp size 48.2 kB, First Load 173 kB
```

**Vérification visuelle** (preview server `http://localhost:3000/rp`, viewport 1440×900) :

- ✅ Sidebar dark drag-resizable avec floating toggle chevron
- ✅ Logo dégradé brown→orange + "PLANIT" + "ÉCOLE D'INGÉNIEURS · ISM"
- ✅ 4 sections collapsibles, items actifs marqués
- ✅ Demandes (badge 5 orange) + Conflits (badge 3 rouge)
- ✅ Profil "Aïssatou Diallo · Responsable de programme" + Paramètres
- ✅ Topbar : breadcrumb + titre + recherche ⌘K + "3 conflits" + 2 icônes badge + avatar "AD"
- ✅ Toolbar : ↶ ↷ + "Cette semaine" + ← dates + S<n> → + Classe M1 IA ▾ + tabs view + Exporter ▾ + "+ Nouvelle séance" orange vif
- ✅ Bandeau fériés jaune (aucun férié en semaine S21 actuelle → bannière absente, comme attendu)
- ✅ Toggle Semaine (actif marron) / Jour (disabled) + compteur "6 séances"
- ✅ Sessions colorées par module (brown/blue/green/orange visibles)
- ✅ Cartes : module name bold + classe pill + heures + durée + prof + salle
- ✅ "Non publiée" badge pointillé sur certaines cartes
- ✅ Footer : compteurs + auto-publication + 3 boutons V2 + Publier la semaine (gradient)

Non testé : flux drag&drop (TD-009), modes Classe/Salle/Prof (TD-011),
vue Jour (TD-017).

---

## Surprises

1. **Le screenshot itération A** était trompeur : le shell paraissait OK mais la
   palette + le format card s'écartaient nettement du proto. La revue
   visuelle côte-à-côte avec les screenshots utilisateur a déclenché ce LOT.
2. **`#EA580C` ≠ `--color-accent` `#E8620A`** : 2 oranges très proches mais
   le proto utilise délibérément le plus saturé pour le CTA principal. Sans
   cette précision, le bouton "Nouvelle séance" se perdait dans le décor.
3. **Sidebar drag-resize en CSS pur** : pas besoin de lib. Le pattern proto
   tient en 30 lignes avec `useRef + document.addEventListener`. Bonus :
   pas de bundle externe.
4. **Mode réduit (collapsed)** : la transition CSS de width fait gagner du
   poids visuel énorme. Quand la souris approche du floating toggle, c'est
   très satisfaisant.

---

## Suite

- **Avant merge** : PR `feat(web): vague-01 LOT 2 — planning fidelity` (itération B)
  vers `develop`.
- **TD ouverts** : TD-017 (vue Jour), TD-018 (module.color contract),
  TD-019 (undo/redo/classe/export stubs), TD-020 (compteurs topbar hardcodés).
  Tous targetés Vague 02.
- **Reste sur la fidélité** : drag&drop séances (TD-009 déjà ouvert), vues
  Classe/Salle/Prof (TD-011), catalogue de modules avec drag depuis
  catalogue → grille, panneaux glissants (conflits / salles / détail séance
  drawer). Ces éléments sont gros et seront alignés progressivement avec
  l'auth et le workflow complet en Vague 02.

---

## Mises à jour annexes

- `PLANIT-Strategie-VibeCode/vagues/vague-01-mvp-planning.md` : à mettre à
  jour avec une ligne LOT 2 iter. B. **Non fait** dans cette
  session (fichier hors repo).
- ADR : pas de nouvel ADR — choix faits compatibles avec les ADR existants.
