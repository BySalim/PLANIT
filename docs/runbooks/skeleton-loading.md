# Runbook — Chargement « skeleton » (lazy load pro)

> Comment afficher les états de chargement dans PLANIT web : le **chrome de la
> page d'abord**, les **données floutées** ensuite (placeholder shimmer), jamais
> une phrase « Chargement… » ni un spinner centré qui bloque l'écran.

## Principe

Quand une page attend ses données, on ne montre **pas** un message ou un spinner
plein écran. On rend immédiatement la **structure stable** (sidebar, en-tête,
toolbar, en-têtes de table) et on remplace **uniquement la zone de données** par
un squelette qui **mime la forme finale** : mêmes colonnes, mêmes hauteurs de
ligne, mêmes pastilles. Chaque bloc est balayé par un reflet animé (« shimmer »).

Bénéfices :

- **Perçu plus rapide** : l'utilisateur voit la page tout de suite, pas un écran
  vide qui « réfléchit ».
- **Zéro saut de layout (CLS)** : le squelette occupe exactement la place des
  vraies données → pas de reflow à l'arrivée du fetch.
- **Cohérent** : un seul langage visuel de chargement sur toutes les pages.

## Brique de base — `<Skeleton>`

[`components/ui/skeleton.tsx`](../../apps/web/src/components/ui/skeleton.tsx) — un
bloc neutre animé. Dimensions / arrondi via classes Tailwind.

```tsx
import { Skeleton } from '@/components/ui/skeleton';

<Skeleton className="h-9 w-9 rounded-full" /> // avatar
<Skeleton className="h-4 w-40" />             // ligne de texte
<Skeleton className="h-5 w-20 rounded-md" />  // pastille / badge
```

L'animation est l'utilitaire CSS `.skeleton` défini dans
[`globals.css`](../../apps/web/src/app/globals.css) (Tailwind v4 `@utility` +
keyframe `planitShimmer`) :

- fond = `--color-border-soft` (token, pas de hex en dur) ;
- reflet = dégradé translucide construit sur `--color-surface` via `color-mix` ;
- **figé automatiquement** sous `prefers-reduced-motion: reduce` (a11y).

## Construire le squelette d'une page

Règle d'or : **un squelette par structure réelle**, co-localisé avec la page.
On copie la grille/table/accordéon de la vue chargée et on remplace les contenus
par des `<Skeleton>`. On garde les **mêmes classes de layout** (paddings,
`grid-cols-…`, hauteurs) pour un calque pixel-perfect.

Exemples livrés (à imiter pour toute nouvelle page) :

| Page / zone               | Squelette                                                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Table Enseignants         | [`enseignants-table-skeleton.tsx`](../../apps/web/src/components/rp/enseignants/enseignants-table-skeleton.tsx)                                |
| Liste Filières            | [`filieres-list-skeleton.tsx`](../../apps/web/src/components/rp/filieres/filieres-list-skeleton.tsx)                                           |
| Accordéon UE & Modules    | [`ue-modules-skeleton.tsx`](../../apps/web/src/components/rp/ue-modules/ue-modules-skeleton.tsx) (`UeModulesSkeleton` + `ModulesListSkeleton`) |
| Drawer détail séance      | [`session-detail-skeleton.tsx`](../../apps/web/src/components/planning/session-detail-skeleton.tsx)                                            |
| Grille planning           | [`planning-grid-skeleton.tsx`](../../apps/web/src/components/planning/planning-grid-skeleton.tsx)                                              |
| Hero « prochaine séance » | [`hero-skeleton.tsx`](../../apps/web/src/components/enseignant/hero-skeleton.tsx)                                                              |

Câblage dans la page (le chrome reste **hors** de la branche `isLoading`) :

```tsx
{
  isLoading ? <EnseignantsTableSkeleton /> : isError ? <ErrorState /> : <RealTable items={items} />;
}
```

## Quand afficher un squelette

- **Cold load (premier fetch, aucune donnée en cache)** → squelette. C'est le
  seul cas où l'utilisateur n'a rien à regarder.
- **Refetch / changement de filtre / pagination avec données déjà à l'écran** →
  **pas** de squelette (ce serait un flash régressif). On laisse la donnée
  précédente et on s'appuie sur `placeholderData` / `isFetching` pour un
  indicateur discret si besoin. Les pages branchent donc le squelette sur
  `isLoading` (TanStack v5 = `isPending && isFetching`, vrai uniquement sans
  donnée), **pas** sur `isFetching`.

## Accessibilité

- Le **conteneur** du squelette porte `role="status"` + `aria-busy="true"` + un
  `aria-label` unique (« Chargement des enseignants ») → un seul message pour le
  lecteur d'écran.
- Les **blocs** `<Skeleton>` sont `aria-hidden` (bruit visuel uniquement).
- L'animation respecte `prefers-reduced-motion` (gérée dans le CSS, rien à faire
  côté composant).

## Vérifier en local

Les données seed se chargent vite : pour **voir** un squelette, ralentir le
fetch. En `next dev`, dans la console du navigateur :

```js
const orig = window.fetch;
window.fetch = (i, init) =>
  /\/api\/enseignants/.test(typeof i === 'string' ? i : i.url)
    ? new Promise((r) => setTimeout(() => r(orig(i, init)), 4000))
    : orig(i, init);
```

puis déclencher une query froide (changer un filtre, ouvrir une page jamais
visitée). Restaurer avec `window.fetch = orig`.

> Astuce capture d'écran : les outils de screenshot attendent parfois l'arrêt
> des animations → injecter `.skeleton::after { animation: none !important }`
> avant la capture pour ne pas bloquer sur le shimmer infini.

## Décisions

- **Shimmer plutôt que `animate-pulse`** : un reflet directionnel lit mieux comme
  « contenu à venir » qu'un simple clignotement d'opacité. Les squelettes
  historiques (`planning-grid-skeleton`, `hero-skeleton`) restent en place ; à
  migrer vers `<Skeleton>` au fil des retouches pour l'uniformité.
- **Pas de librairie externe** : un utilitaire CSS + un composant de ~5 lignes
  suffisent ; on évite une dépendance pour un effet trivial.
