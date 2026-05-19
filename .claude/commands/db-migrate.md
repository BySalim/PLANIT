---
description: Crée une migration Prisma de manière centralisée pour éviter les conflits. Argument = description courte (kebab-case) de la migration.
allowed-tools: Read, Edit, Bash, Glob
---

Démarre une migration Prisma : **$ARGUMENTS**.

## Avertissement coordination

Toute migration Prisma touche au schéma partagé. Avant de continuer :

1. `git pull --rebase origin main` — synchronise
2. `ls apps/backend/prisma/migrations/` — vérifie l'état des migrations existantes
3. Si une migration récente n'est pas mergée sur `main`, vérifie qu'elle ne touche pas la même table → si oui, attendre le merge ou coordonner avec l'auteur (Oumar par défaut).

## Étape 1 — Invoquer le subagent db-architect

Délègue au subagent **db-architect** avec :

- Description de la migration : `$ARGUMENTS`
- Contexte : la feature en cours (lit le sprint pour identifier)

## Étape 2 — Validation

Une fois la migration générée par db-architect :

1. Lis le SQL généré : `cat apps/backend/prisma/migrations/<dernier>/migration.sql`
2. Vérifie :
   - Aucun `DROP COLUMN` sur une colonne avec données existantes
   - Aucun NOT NULL ajouté sur colonne existante sans default
   - Tous les FK ont leur INDEX
3. Lance `pnpm db:reset` localement pour vérifier que la migration s'applique sur DB vierge

## Étape 3 — Mise à jour du seed

Si la migration ajoute des tables/colonnes utilisées en sprint actuel :

- Mets à jour `apps/backend/prisma/seed.ts`
- Re-test `pnpm db:reset` après mise à jour seed
- Vérifie que les données seed sont cohérentes avec ce qu'attend le sprint

## Étape 4 — Tests

Si la migration change un modèle utilisé :

- Lance les tests intégration : `pnpm test --filter @planit/backend`
- Mets à jour les tests cassés (sans changer leur intention)

## Étape 5 — Commit

Commit séparé du reste de la feature :

```
feat(db): migration <description> — <objet> + <effet>

Refs spec: docs/specs/SPRINT-XX-NN-<slug>.md
```

Ce commit doit pouvoir être reverté seul si la migration cause un problème.
