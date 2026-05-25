# PLANIT — Charte graphique logos

## Couleurs de marque

| Token                         | Hex       | Usage                                                     |
| ----------------------------- | --------- | --------------------------------------------------------- |
| `primary` / `--color-primary` | `#593114` | Marron PLANIT — corps calendrier, texte wordmark          |
| `accent` / `--color-accent`   | `#EE7023` | Orange PLANIT — accent cellule, tassel, triangle wordmark |

> **Source :** fichiers Illustrator de Libasse (exportés le 2026-05-21).
> **Sync :** `packages/design-tokens/src/colors.ts` + `apps/web/src/app/globals.css`
>
> - `packages/ui/src/icons/index.tsx` (constantes `BRAND_MARRON` / `BRAND_ORANGE`).

---

## Variantes disponibles

### Icônes (calendrier + toque académique)

| Fichier                                   | Usage                                           | Fond recommandé           | Couleurs SVG                     |
| ----------------------------------------- | ----------------------------------------------- | ------------------------- | -------------------------------- |
| `apps/web/public/brand/logo-color.svg`    | Header, documents, og:image, impression couleur | Blanc / clair             | `#593114` + `#EE7023`            |
| `apps/web/public/brand/logo-color-3d.svg` | Splash screen, landing page, visuels marketing  | Blanc / clair             | Dégradés Illustrator (référence) |
| `apps/web/public/brand/logo-mono.svg`     | Fond sombre, impression N&B, superposition      | Noir / sombre / `primary` | Blanc (#fff)                     |

### Typographie & identité

| Fichier                                   | Usage                                    | Fond recommandé | Couleurs SVG            |
| ----------------------------------------- | ---------------------------------------- | --------------- | ----------------------- |
| `apps/web/public/brand/logo-wordmark.svg` | Email, PDF, entêtes longs, documentation | Blanc / clair   | `#613616` + `#E9640B` ¹ |
| `apps/web/public/brand/icon.svg`          | Favicon (lettre PLANIT custom)           | —               | Blanc (#fff)            |
| `apps/web/src/app/icon.svg`               | Favicon auto Next.js App Router          | —               | Blanc (#fff)            |

> ¹ Le wordmark utilise `#613616` (marron) et `#E9640B` (orange), légèrement différents des tokens
> `#593114` / `#EE7023` — intentionnel pour la lisibilité du texte à taille réduite.
> Ne pas modifier ces valeurs dans le SVG sans valider avec Libasse.

---

## Composant React (topbar)

```tsx
import { PlanitLogo } from '@planit/ui';

// Topbar (taille standard)
<PlanitLogo size={34} />

// Petit (badge, notification)
<PlanitLogo size={20} />

// Grand (landing, og:image fallback)
<PlanitLogo size={80} />
```

`PlanitLogo` est un SVG inline — toujours net quelle que soit la résolution.
Ses couleurs utilisent les constantes `BRAND_MARRON`/`BRAND_ORANGE` de `packages/ui/src/icons/index.tsx`.

### Utiliser les fichiers SVG statiques

```tsx
// Icône couleur (img tag)
<img src="/brand/logo-color.svg" alt="PLANIT" width={48} height={48} />

// Wordmark
<img src="/brand/logo-wordmark.svg" alt="PLANIT" height={32} />

// Next.js Image (optimisé)
import Image from 'next/image';
<Image src="/brand/logo-color.svg" alt="PLANIT" width={48} height={48} />
```

---

## Règles d'usage

- **Ne jamais étirer** le logo — conserver les ratios natifs (voir viewBox).
- **Espace de protection** : laisser au minimum `taille / 4` px tout autour.
- **Variante couleur / 3D** : sur fond blanc ou clair uniquement.
- **Variante mono** (blanc) : sur fond `primary` (#593114), noir, ou image sombre.
- **Ne pas recolorer** les SVG manuellement — modifier les tokens si une mise à jour de marque est décidée, puis ré-exporter depuis Illustrator.

---

## Dimensions natives (viewBox)

| Fichier             | Ratio                | viewBox             |
| ------------------- | -------------------- | ------------------- |
| `logo-color.svg`    | 1.08:1 (quasi carré) | `0 0 274.27 252.92` |
| `logo-color-3d.svg` | 1.08:1               | `0 0 274.27 252.92` |
| `logo-mono.svg`     | 1.08:1               | `0 0 274.27 252.9`  |
| `logo-wordmark.svg` | 4.58:1 (horizontal)  | `0 0 380.67 83.07`  |
| `icon.svg`          | 1:1.5 (vertical)     | `0 0 67.81 102.03`  |

---

## Favicon

Next.js App Router détecte automatiquement `apps/web/src/app/icon.svg` et génère
les balises `<link rel="icon">` appropriées. Aucune configuration supplémentaire requise.

Pour un favicon `.ico` legacy (navigateurs très anciens) :

1. Convertir `logo-color.svg` en PNG 32×32
2. Placer en `apps/web/public/favicon.ico`

---

## Historique

| Date       | Action                                                                    | Auteur          |
| ---------- | ------------------------------------------------------------------------- | --------------- |
| 2026-05-21 | Couleurs `#593114` / `#EE7023` extraites d'Illustrator, tokens mis à jour | Salim           |
| 2026-05-21 | `PlanitLogo` SVG prototype câblé avec couleurs exactes                    | Salim           |
| 2026-05-21 | Export 5 variantes SVG → `public/brand/` + favicon `src/app/icon.svg`     | Libasse / Salim |
