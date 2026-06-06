# Spike export client-side — décision (LOT 0.8, V3-D11)

> **Verdict : GO** sur `html-to-image` + `jspdf` (export image + PDF côté
> client, sans dépendance serveur). Décision sensible (ajout de 2 deps)
> **actée par le Tech Lead** au LOT 0. Détail et garde-fous ci-dessous.

## Contexte

V03 réintroduit un export de la **vue planning** (RP) et de la **maquette**
(LOT 7), en **image (PNG)** et **PDF** uniquement (iCal/Excel hors scope).
V3-D11 a choisi une pile **100 % client-side** pour éviter une dépendance
serveur lourde (puppeteer/Chromium headless) sur le CX22. Ce spike valide
la viabilité **avant** le LOT 7.

## Pile retenue

| Lib             | Version    | Rôle                                                                              |
| --------------- | ---------- | --------------------------------------------------------------------------------- |
| `html-to-image` | `^1.11.13` | Capture d'un nœud DOM → PNG / Blob / SVG (rendu fidèle tokens + fonts)            |
| `jspdf`         | `^4.2.1`   | Génération PDF (A4 paysage pour le planning), `addImage` pour intégrer la capture |

Toutes deux ajoutées comme dépendances de `apps/web` (aucune dépendance
serveur ajoutée — conforme V3-D11).

## Validation (spike)

Smoke test : [apps/web/src/lib/**tests**/export-spike.test.ts](../../apps/web/src/lib/__tests__/export-spike.test.ts).

- **jsPDF** tourne **headless** (Node/jsdom) : le test génère un PDF A4
  paysage, vérifie l'en-tête binaire `%PDF-` et la présence de `addImage` /
  `addPage`. ✅
- **html-to-image** dépend du `<canvas>` **réel** du navigateur (jsdom ne
  rend pas le canvas) : le spike valide l'**import** + la **signature** des
  fonctions (`toPng`, `toBlob`, `toSvg`) consommées au LOT 7. Le rendu
  visuel sera couvert par le smoke navigateur du LOT 7 (X.4). ✅

Exécuter : `pnpm --filter @planit/web exec vitest run src/lib/__tests__/export-spike.test.ts`.

## Couverture CI

- `pnpm install --frozen-lockfile` installe les 2 libs (lockfile mis à jour).
- Le job **quality** exécute la suite web → le spike test tourne à chaque PR.
- Aucun service supplémentaire requis (tout client-side).

## Garde-fous / plan B (LOT 7)

- **Fidélité insuffisante** (fonts, tokens, grille planning découpée) →
  fallback `window.print()` stylé `@media print` pour le PDF, image en
  best-effort. Tracé dans le risque « Fidélité des exports » de
  `vague-03-scenarios.md`.
- **Helper partagé** `exportNodeToImage(node)` + `exportNodeToPdf(node, meta)`
  (X.1) encapsulera la pile — un seul point de bascule si la lib change.

## Migration v3 en CI — note

La migration `20260602150758_vague_03_referentiel_academique` est appliquée
automatiquement par le step existant **`prisma migrate deploy`** des jobs
`quality` et `lighthouse` (deploy de toutes les migrations pendantes sur une
Postgres fraîche). Le **seed v3** est exercé par les tests d'intégration via
`resetDb` (`apps/backend/test/helpers/db.ts`). Aucun step CI dédié nécessaire.
