# Runbook — Setup mobile (Expo SDK 53) dans le monorepo

> Pourquoi `apps/mobile/metro.config.js` existe et comment éviter les pièges
> classiques d'Expo + pnpm workspace.

---

## 1. Le problème d'origine

Sans config Metro explicite, Expo lance Metro avec `getDefaultConfig(__dirname)`
qui scanne **tout le workspace** à la recherche de modules. Dans un monorepo
pnpm, ça veut dire qu'il essaie de surveiller `apps/web/.next/`, `apps/backend/dist/`,
etc.

Conséquences observées :

- **Crash au premier `pnpm dev`** :

  ```
  Error: ENOENT: no such file or directory, watch 'apps/web/.next/server/app/(planit)/rp'
  ```

  Next.js compile la route `/rp` à la demande (Route Group `(planit)`). Au démarrage
  à froid, le dossier n'existe pas encore → `metro-file-map/FallbackWatcher` (le
  watcher fallback Windows, faute de Watchman) crashe sur `fs.watch` d'un path absent.

- **Spam en régime établi** :

  ```
  Error "ENOENT" reading contents of "apps/web/.next/server/app/(planit)", skipping.
  Error "ENOENT" reading contents of "apps/web/.next/server/app/icon.svg", skipping.
  ...
  ```

  Next.js HMR mute en permanence `.next/` (recompilation à chaque sauvegarde).
  Metro voit ces fichiers apparaître/disparaître et log un warning à chaque coup.

---

## 2. Ce que fait `apps/mobile/metro.config.js`

Quatre leviers, dans l'ordre du fichier :

1. **`watchFolders` restreint** — Metro ne surveille QUE `apps/mobile/` et
   `packages/`. Il ne voit jamais `apps/web/` ni `apps/backend/`. C'est le fix
   principal.

2. **`resolver.nodeModulesPaths`** — chemins explicites pour résoudre les
   modules : `apps/mobile/node_modules/` puis le hoisting racine. Évite que
   Metro remonte chercher des modules dans d'autres apps.

3. **`resolver.disableHierarchicalLookup = true`** — force la résolution à
   passer uniquement par `nodeModulesPaths`. Sans ça, Metro ferait une remontée
   `node_modules/` parent-by-parent qui peut tomber sur les dépendances de
   `apps/web/`.

4. **`resolver.blockList`** — ceinture en plus des bretelles : même si quelque
   chose forçait Metro à regarder vers `apps/web|backend|whatsapp-bot`, ces
   chemins sont explicitement rejetés.

Pattern recommandé par Expo pour les monorepos : https://docs.expo.dev/guides/monorepos/

---

## 3. Comment lancer le dev mobile

Depuis la racine du repo :

```bash
pnpm dev          # web + backend, PAS de mobile (silencieux par défaut)
pnpm dev:mobile   # Metro seul, dans un terminal dédié
pnpm dev:all      # tout en parallèle (équivalent ancien `pnpm dev`)
```

Workflow attendu pour quelqu'un qui touche mobile :

- Un terminal avec `pnpm dev` (backend pour les APIs).
- Un terminal avec `pnpm dev:mobile` (Metro + Expo).
- Scanner le QR code avec Expo Go ou lancer `i` / `a` pour ouvrir un simulateur.

---

## 4. Ajouter une dépendance interne au mobile

Si mobile commence à consommer un package du workspace (`@planit/contracts`,
`@planit/ui`, etc.) :

1. Ajout standard : `pnpm --filter @planit/mobile add @planit/contracts`.
2. **Rien à modifier dans `metro.config.js`** — `packages/` est déjà dans
   `watchFolders`, donc Metro voit toute mutation des packages internes.

---

## 5. Pitfalls connus

### 5.1. Ne PAS ajouter `workspaceRoot` à `watchFolders`

Tentation : `config.watchFolders = [workspaceRoot]` pour « tout voir ». C'est
exactement ce qui causait le bug initial. Si on a besoin d'un nouveau dossier
sous workspace, l'ajouter explicitement (jamais le root).

### 5.2. Warnings versions Expo — c'est normal

Au démarrage, Metro affiche :

```
The following packages should be updated for best compatibility with the installed expo version:
  react@19.2.6        - expected version: 19.0.0
  @types/react@19.2.14 - expected version: ~19.0.10
  typescript@5.9.3    - expected version: ~5.8.3
Your project may not work correctly until you install the expected versions of the packages.
```

**Ces warnings sont attendus et acceptés.** Les versions installées sont
celles hoistées par pnpm pour satisfaire aussi `apps/web` (Next.js 15, React
19.x) et l'ensemble du monorepo (TypeScript 5.9). Downgrade impossible sans
casser l'hoisting.

Pourquoi c'est OK en pratique :

- React 19.x est stable inter-patch (politique React 19 stricte sur les
  breaking changes).
- TypeScript est rétro-compatible : 5.9 compile sans souci tout ce que 5.8
  acceptait.
- `@types/react` suit React, donc même logique.

**Ne pas faire `expo install --fix` ni `expo install --check`** — ces
commandes downgraderaient ces packages dans tout le monorepo et casseraient
`apps/web`.

Si Expo introduit un jour une incompatibilité réelle (pas conservatrice), la
solution sera d'utiliser `pnpm.overrides` par workspace pour pinner
différemment côté mobile uniquement.

### 5.3. Watchman absent sur Windows

Pas de Watchman natif Windows → Metro retombe sur `FallbackWatcher`. C'est ce
qui rend le crash original « fatal » plutôt que « warning ». La config
`watchFolders` restreinte suffit à éviter le problème ; pas besoin d'installer
Watchman.

---

## 6. Quand bumper Expo SDK (53 → 54 → …)

Procédure recommandée :

1. Mettre à jour `expo` : `pnpm --filter @planit/mobile add expo@~XX.0.0`.
2. Vérifier le tableau de compat versions :

   ```bash
   pnpm list react react-native @types/react typescript -r --depth=0
   ```

3. Sur `react-native` (mobile-only), aligner sur la version exacte attendue
   par le nouveau SDK : `pnpm --filter @planit/mobile add react-native@<x.y.z>`.
4. Sur les autres (partagés avec web/root), vérifier la compatibilité ; ne
   bouger que si une régression réelle est constatée.
5. Tester avec `pnpm dev:mobile` qu'il n'y a plus de warning sur
   `react-native` (c'est l'indicateur que le pin SDK ↔ RN est correct).
