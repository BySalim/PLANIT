# Contribuer à PLANIT

## Workflow obligatoire

```
PROBE → SPEC → PLAN → CODE → CHECK → JOURNAL
```

Détail : [01-VIBECODE-WORKFLOW.md](../PLANIT-Strategie-VibeCode/strategies/01-VIBECODE-WORKFLOW.md)

## Branches

| Branche        | Propriétaire              |
| -------------- | ------------------------- |
| `main`         | Protégé — PR uniquement   |
| `feat/salim`   | Salim — Tech Lead         |
| `feat/oumy`    | Oumy — Frontend           |
| `feat/libasse` | Libasse — Mobile + Design |
| `feat/oumar`   | Oumar — Backend           |
| `feat/djibril` | Djibril — DevOps          |

**Règle absolue** : on ne commit jamais sur `main` ni sur la branche d'un autre.

## Commits

Format [Conventional Commits](https://www.conventionalcommits.org/) — en-tête < 72 chars :

```
feat(web): ajouter vue planning semaine
fix(backend): corriger validation conflit salle
docs(journal): bootstrap monorepo salim
chore(infra): update docker compose ports
```

Types autorisés : `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `perf`, `ci`, `revert`, `style`.

## Pull Requests

1. Remplir le template PR (`.github/pull_request_template.md`)
2. Tous les checks CI doivent être verts
3. Au moins 1 review avant merge
4. Lier le journal d'agent correspondant

## Quality gates (avant tout commit)

```bash
pnpm lint        # 0 erreurs
pnpm typecheck   # 0 erreurs
pnpm test        # 0 failing
```

## Conventions code

- TypeScript strict — pas de `any`, pas de `as`, pas d'export par défaut
- Composants `kebab-case.tsx`, types `PascalCase`, fonctions `camelCase`
- Labels UI en **français**, code en **anglais**
- Tokens de `@planit/design-tokens` — pas de hex en dur
- Validation Zod via `@planit/contracts`
- Fuseau **Africa/Dakar** via `@planit/utils/date` — jamais `new Date()` direct

Détail : [05-CONVENTIONS-CODE.md](../PLANIT-Strategie-VibeCode/strategies/05-CONVENTIONS-CODE.md)
