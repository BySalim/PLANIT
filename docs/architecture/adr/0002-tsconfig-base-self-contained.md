---
id: ADR-0002
titre: tsconfig base.json auto-contenu (pas d'extends relatif)
statut: VALIDE
date: 2026-05-21
auteur: salim
---

# ADR-0002 — `packages/config/typescript/base.json` auto-contenu

## Contexte

Le fichier `packages/config/typescript/base.json` est le tsconfig de base partagé
par tous les packages du monorepo. À l'origine, il commençait par :

```json
{
  "extends": "../../../tsconfig.base.json"
}
```

Cette extension relative fonctionnait correctement quand tsc résolvait le fichier
depuis son emplacement réel (`packages/config/typescript/`). Mais ts-node,
utilisé pour exécuter `prisma/seed.ts` et d'autres scripts, le résout via le
symlink pnpm :

```
apps/backend/node_modules/@planit/config/typescript/base.json
                ↑ symlink vers packages/config/typescript/base.json
```

Depuis ce chemin, `../../../` remonte jusqu'à `apps/backend/node_modules/`
au lieu de la racine du repo, causant l'erreur :

```
error TS5083: Cannot read file
  '.../apps/backend/node_modules/tsconfig.base.json'.
```

## Décision

**`packages/config/typescript/base.json` est rendu entièrement auto-contenu.**
Toutes les options du `tsconfig.base.json` racine sont inlinées directement dans
ce fichier. Plus aucun `extends` relatif fragile.

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    ...
  }
}
```

## Conséquences

- ✅ ts-node, tsx, et tout autre runner de scripts TS peuvent résoudre le fichier
  via n'importe quel chemin (symlink ou chemin réel).
- ✅ Aucun risque de régression lors de l'ajout de nouveaux packages ou scripts.
- ⚠️ Si les options du tsconfig racine (`tsconfig.base.json`) sont modifiées à
  l'avenir, il faut aussi mettre à jour `packages/config/typescript/base.json`.
  Les deux doivent rester synchronisés.

## Règle pour l'équipe

> **Ne pas rajouter de `"extends"` avec un chemin relatif `../` dans ce fichier.**
> Si tu veux changer une option TypeScript globale, modifie les deux fichiers
> en même temps et ouvre une PR en mentionnant cet ADR.

## Alternatives rejetées

| Alternative                                               | Raison du rejet                                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Configurer ts-node avec `paths` / `moduleResolutionCache` | Complexe, fragile, dépendant de la version de ts-node                                      |
| Utiliser `tsx` au lieu de `ts-node`                       | Résout le problème mais change le runner — décision d'impact plus large, remise à Vague 02 |
| Patcher le symlink pnpm                                   | Impossible proprement — pnpm régénère les symlinks à chaque install                        |
