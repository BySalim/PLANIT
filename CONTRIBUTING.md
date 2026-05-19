# Contribuer à PLANIT

## Workflow obligatoire

```
PROBE → SPEC → PLAN → CODE → CHECK → JOURNAL
```

Détail : [01-VIBECODE-WORKFLOW.md](../PLANIT-Strategie-VibeCode/strategies/01-VIBECODE-WORKFLOW.md)

## Stratégie de branches

```
main ← develop ← feat/*
```

| Branche        | Rôle                                          | Cible PR                         |
| -------------- | --------------------------------------------- | -------------------------------- |
| `main`         | Production stable — démontrable à tout moment | ← `develop` uniquement (release) |
| `develop`      | Intégration — reçoit les features validées    | ← `feat/*`                       |
| `feat/salim`   | Salim — Tech Lead                             | → `develop`                      |
| `feat/oumy`    | Oumy — Frontend                               | → `develop`                      |
| `feat/libasse` | Libasse — Mobile + Design                     | → `develop`                      |
| `feat/oumar`   | Oumar — Backend                               | → `develop`                      |
| `feat/djibril` | Djibril — DevOps                              | → `develop`                      |

**Règles absolues** :

- Jamais de commit direct sur `main` ou `develop` — toujours via PR
- Les PRs de features ciblent `develop`, pas `main`
- `main` ne reçoit que des merges depuis `develop` (releases stables)
- On ne touche jamais la branche d'un autre membre

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

1. Cible toujours `develop` (jamais `main` directement)
2. Remplir le template PR (`.github/pull_request_template.md`)
3. Tous les checks CI doivent être verts
4. Au moins 1 review avant merge
5. Lier le journal d'agent correspondant

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
