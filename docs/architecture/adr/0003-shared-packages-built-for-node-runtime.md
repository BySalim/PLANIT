---
id: ADR-0003
titre: Les packages partagés consommés par un runtime Node sont buildés
statut: VALIDE
date: 2026-05-21
auteur: salim
---

# ADR-0003 — Build des packages partagés pour le runtime Node

## Contexte

Le bootstrap (LOT 0) a configuré les packages partagés (`@planit/contracts`,
`@planit/utils`, `@planit/design-tokens`, `@planit/ui`) en **source TypeScript
brute** : leur champ `exports` pointe directement sur `src/*.ts`, sans étape de
build.

Ce choix fonctionne pour les consommateurs qui **bundlent** eux-mêmes le code :

- `apps/web` (Next.js) via `transpilePackages`
- `apps/mobile` (Expo / Metro)

Mais `apps/backend` est compilé par `tsc` puis exécuté par `node dist/main.js`.
Un process `node` **n'exécute pas de `.ts`**. Tant qu'aucune app Node ne
consommait un package workspace, le problème restait invisible. LOT 1 (backend
planning) est la première à importer `@planit/contracts` côté serveur, ce qui a
révélé deux échecs :

1. **Typecheck** : `tsc` du backend (`moduleResolution: node`) ne lit pas le
   champ `exports` et ne résout pas le module.
2. **Runtime** : `require('@planit/contracts')` chargerait du `.ts` non
   exécutable par Node.

## Décision

**Tout package partagé consommé par un runtime Node doit être buildé en JS.**

Concrètement, pour `@planit/contracts` :

- Scripts `build` (`tsc`), `dev` (`tsc --watch`), `typecheck` (`tsc --noEmit`).
- `tsconfig.json` : sortie `CommonJS` dans `dist/`.
- `package.json` :
  - `main` → `./dist/index.js` (runtime)
  - `types` → `./src/index.ts` (typecheck sans build préalable)
  - `exports` : `types` → `src`, `default` → `dist/index.js`

Le double pointage (top-level `main`/`types` **et** `exports`) couvre les trois
modes de résolution : `tsc` classique du backend (lit `main`/`types`), bundlers
web/mobile (lisent `exports`), runtime Node (lit `exports`).

L'ordre de build est géré par Turborepo : les tâches `build` et `test` déclarent
`dependsOn: ["^build"]`, donc `@planit/contracts` est buildé avant `apps/backend`.

## Conséquences

- ✅ Le backend peut importer `@planit/contracts` (typecheck + runtime).
- ✅ Le typecheck reste sans build préalable (`types` → source).
- ✅ Web / mobile inchangés (les bundlers consomment du JS aussi bien que du TS) ;
  `transpilePackages` devient redondant pour `contracts` mais reste inoffensif.
- ⚠️ `pnpm dev` : `@planit/contracts` doit tourner en `tsc --watch` (script `dev`,
  lancé en parallèle par Turbo). Sur un clone neuf, exécuter `pnpm build` une fois
  avant le premier `pnpm dev` évite un démarrage à froid raté.
- ⚠️ `@planit/utils` devra recevoir le même traitement dès qu'un runtime Node
  l'importera (helpers de date Dakar côté backend, workers, cron…).
- `@planit/design-tokens` et `@planit/ui` sont web/mobile-only : ils peuvent
  rester source-only tant qu'aucun runtime Node ne les consomme.

## Règle pour l'équipe

> Avant d'importer un package `@planit/*` depuis `apps/backend` (ou toute future
> app Node), vérifier qu'il a un script `build` et un `main` pointant vers `dist/`.
> Si ce n'est pas le cas, l'ajouter en suivant le modèle de `@planit/contracts`
> et mentionner cet ADR dans la PR.

## Alternatives rejetées

| Alternative                                                  | Raison du rejet                                                                                                        |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `nest build --webpack` (bundler le TS dans `dist/main.js`)   | Config webpack spécifique au backend, à refaire pour chaque future app Node. Reporte le problème au lieu de le régler. |
| Garder source-only, exécuter le backend avec `tsx`/`ts-node` | Non standard pour NestJS en production, perfs et fiabilité dégradées.                                                  |
| Redéfinir les schémas Zod dans le backend                    | Détruit la source unique de vérité — le but même de `@planit/contracts`.                                               |
