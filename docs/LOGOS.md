# PLANIT — Charte graphique logos

## Couleurs de marque

| Token                         | Hex       | Usage                                                     |
| ----------------------------- | --------- | --------------------------------------------------------- |
| `primary` / `--color-primary` | `#593114` | Marron PLANIT — corps calendrier, texte wordmark          |
| `accent` / `--color-accent`   | `#EE7023` | Orange PLANIT — accent cellule, tassel, triangle wordmark |

> **Source :** fichiers Illustrator de Libasse.
> **Sync :** `packages/design-tokens/src/colors.ts` + `apps/web/src/app/globals.css` + `packages/ui/src/icons/index.tsx` (constantes `BRAND_MARRON` / `BRAND_ORANGE`).

---

## Variantes

| Fichier                                   | Usage                             | Fond recommandé |
| ----------------------------------------- | --------------------------------- | --------------- |
| `apps/web/public/brand/logo-color.svg`    | Header, documents, og:image       | Blanc / clair   |
| `apps/web/public/brand/logo-mono.svg`     | Fond sombre, impression N&B       | Noir / sombre   |
| `apps/web/public/brand/logo-wordmark.svg` | Email, PDF, entêtes longs         | Blanc / clair   |
| `apps/web/src/app/icon.svg`               | Favicon App Router (Next.js auto) | Transparent     |

---

## Composant React

```tsx
import { PlanitLogo } from '@planit/ui';

// Topbar (taille standard)
<PlanitLogo size={34} />

// Petit (favicon fallback, splash)
<PlanitLogo size={20} />

// Grand (landing, og:image)
<PlanitLogo size={80} />
```

`PlanitLogo` est un SVG inline — toujours net quelle que soit la résolution.
Ses couleurs sont synchronisées avec les tokens via les constantes `BRAND_*` dans `packages/ui/src/icons/index.tsx`.

---

## Règles d'usage

- **Ne jamais étirer** le logo — conserver le ratio 1:1 (carré).
- **Espace de protection** : laisser au minimum `size / 4` px tout autour.
- **Variante couleur** sur fond blanc/clair uniquement.
- **Variante mono** (blanc) sur fond `primary` ou fond noir.
- **Ne pas changer les couleurs** manuellement — modifier les tokens `primary`/`accent` si une mise à jour de marque est décidée.

---

## Ajout du favicon

Next.js App Router détecte automatiquement `apps/web/src/app/icon.svg`.
Pour le favicon `.ico` legacy, utiliser `apps/web/public/favicon.ico` (PNG 32×32 converti).

---

## Historique

| Date        | Action                                                                    | Auteur          |
| ----------- | ------------------------------------------------------------------------- | --------------- |
| 2026-05-21  | Couleurs `#593114` / `#EE7023` extraites d'Illustrator, tokens mis à jour | Salim           |
| 2026-05-21  | `PlanitLogo` SVG prototype câblé en attendant les exports finaux          | Salim           |
| À compléter | Export SVG 3 variantes → `public/brand/`                                  | Libasse / Salim |
