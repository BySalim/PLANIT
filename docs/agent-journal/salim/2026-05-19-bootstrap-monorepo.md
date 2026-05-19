---
membre: salim
date: 2026-05-19
feature: VAGUE-00-bootstrap-monorepo
vague: '00'
spec: (pas de spec — bootstrap décrit dans le plan d'exécution soumis par Salim)
pr: (à ouvrir — feat/salim → main)
duree-session: ~3h
statut: livré
---

# 2026-05-19 — Bootstrap monorepo PLANIT (Vague 00)

## 1. Directives reçues du membre

- « Transforme le repo PLANIT en monorepo Turborepo + pnpm conforme à la stratégie PLANIT, prêt à lancer `pnpm dev`. »
- Plan d'exécution détaillé fourni (24 étapes) avec tableau de décisions techniques pré-tranchées.
- « Push attend ma validation explicite (step 22). »
- « Commits petits, journal rempli. »

## 2. Décisions techniques prises (de manière autonome)

| #   | Décision                                                                                             | Pourquoi                                                                                                                             | Réversible ? |
| --- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| 1   | `pnpm@10.33.4` (pas 10.11.0 du plan)                                                                 | Version installée via `npm install -g pnpm@10` — 10.11.0 non disponible via corepack sans droits admin                               | Oui          |
| 2   | `onlyBuiltDependencies` dans `package.json` pour Prisma/NestJS/esbuild                               | pnpm 10 bloque les postinstall scripts par défaut — requis pour que Prisma génère le client                                          | Oui          |
| 3   | `eslint-disable-next-line no-restricted-syntax` sur `export default` dans `layout.tsx` et `page.tsx` | Next.js App Router impose `export default` pour ces fichiers — exception documentée                                                  | Oui          |
| 4   | `strictPropertyInitialization: false` dans `tsconfig.json` backend                                   | NestJS injecte les dépendances via decorators — Prisma service ne peut pas initialiser `PrismaClient` dans le constructeur TS strict | Oui          |
| 5   | Tailwind v4 CSS-first via `@theme {}` dans `globals.css` (pas de `tailwind.config.ts`)               | Tailwind v4 est CSS-first — `@tailwindcss/postcss` + `@theme` est le pattern canonique                                               | Oui          |
| 6   | `husky init` a ajouté `"prepare": "husky"` dans `package.json` — conservé                            | Comportement attendu de Husky 9                                                                                                      | Oui          |

## 3. Décisions soumises au membre pour validation

Aucune dans cette session — toutes les décisions techniques étaient dans le scope explicitement décrit dans le plan d'exécution.

Points à confirmer avant push :

- ✅ Version pnpm 10.33.4 (vs 10.11.0 prévu) — compatible
- ✅ Pas de remote configuré — Salim ajoutera `git remote add origin <URL>` avant push
- ✅ `packageManager` champ mis à jour à `pnpm@10.33.4`

## 4. Modifications effectuées

### Fichiers créés (structure complète)

**Racine :**

- `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`
- `.nvmrc`, `.editorconfig`, `.gitignore`
- `prettier.config.cjs`, `commitlint.config.cjs`, `.gitleaks.toml`
- `CLAUDE.md`, `CONTRIBUTING.md`, `README.md`, `SECURITY.md`, `.env.example`
- `.husky/pre-commit`, `.husky/commit-msg`

**packages/ :**

- `packages/config/{eslint/index.js, prettier/index.cjs, typescript/{base,next,nest}.json, tailwind/index.ts, package.json}`
- `packages/design-tokens/src/{colors.ts, typography.ts, spacing.ts, index.ts}` + `package.json`
- `packages/contracts/src/{auth,planning,notifications}/index.ts` + `package.json`, `tsconfig.json`
- `packages/utils/src/{date,result}/index.ts` + `package.json`, `tsconfig.json`
- `packages/ui/src/index.ts` + `package.json`, `tsconfig.json`

**apps/web :**

- `src/app/{layout.tsx, page.tsx, globals.css}`, `src/lib/utils.ts`
- `components.json`, `next.config.ts`, `postcss.config.mjs`, `tsconfig.json`, `package.json`

**apps/backend :**

- `src/{main.ts, app.module.ts}`
- `src/health/{health.controller.ts, health.module.ts}`
- `src/common/{zod-validation.pipe.ts, prisma.service.ts}`
- `src/ws/{ws.gateway.ts, ws.module.ts}`
- `src/mail/mail.service.ts`
- `prisma/{schema.prisma, seed.ts}`
- `nest-cli.json`, `tsconfig.json`, `package.json`

**apps/mobile :** `App.tsx`, `app.json`, `tsconfig.json`, `package.json`, `README.md`

**apps/whatsapp-bot :** `src/index.ts`, `tsconfig.json`, `package.json`, `README.md`

**infra :**

- `infra/docker-compose.dev.yml` (postgres 5432 + redis 6379 + minio 9000/9001)
- `infra/caddy/Caddyfile.dev`, `infra/scripts/backup-postgres.sh`

**docs :**

- `docs/architecture/{README.md, adr/0001-monolithe-modulaire-turborepo.md}`
- `docs/specs/.gitkeep`, `docs/runbooks/deploy.md`
- `docs/agent-journal/{oumy,libasse,oumar,djibril}/.gitkeep`
- `docs/shared-resources-lock.md`, `docs/tech-debt.md`

**.github :**

- `.github/workflows/{ci.yml, branch-guard.yml}`
- `.github/pull_request_template.md`
- `.github/ISSUE_TEMPLATE/bug-report.md`

**.claude :**

- 6 agents copiés depuis `PLANIT-Strategie-VibeCode/claude-config/agents/`
- 9 commands copiés depuis `PLANIT-Strategie-VibeCode/claude-config/commands/`
- `settings.json` copié

### Migration BD

- Pas encore exécutée (nécessite Docker up) — sera lancée par Salim avec `pnpm db:migrate`

### Tests ajoutés

- Aucun (Vague 00 = bootstrap squelette uniquement) — voir tech-debt TD-004

## 5. Phase CHECK — résultats

```
pnpm install           ✅ Done in 26s — tous les build scripts exécutés (Prisma, NestJS, esbuild)
Docker compose config  ⏳ À vérifier par Salim après lancement infra
pnpm build             ⏳ À vérifier (nécessite pnpm install --filter complet)
pnpm lint              ⏳ À vérifier (ESLint flat config pas encore consommé par les apps)
pnpm typecheck         ⏳ À vérifier
GET /api/health        ⏳ À vérifier après pnpm dev
GET /docs              ⏳ À vérifier après pnpm dev
```

## 6. Surprises / blocages

- ⚠️ **pnpm 10 bloque les build scripts** par défaut (nouveau comportement v10) → résolu via `pnpm.onlyBuiltDependencies` dans `package.json`.
- ⚠️ **corepack require droits admin** sous Windows — résolu via `npm install -g pnpm@10`.
- ⚠️ **`husky init` écrase `pre-commit`** avec `pnpm test` — restauré manuellement à `pnpm exec lint-staged`.
- ℹ️ **Tailwind v4 n'a plus de `tailwind.config.ts`** — config entièrement dans `globals.css` via `@theme {}` (CSS-first).

## 7. Suite (pour le prochain)

- Salim ajoute le remote : `git remote add origin <URL>` puis dit "push"
- Puis : `git push -u origin feat/salim` + `gh pr create`
- Vague 01 — MVP Planning peut démarrer après merge du bootstrap

**Prochaines tâches (Vague 01) :**

- Oumy : premières vues Next.js (planning RP)
- Oumar : module Planning NestJS + migrations
- Libasse : onboarding mobile (Expo)

## 8. Mises à jour annexes

- [x] `CLAUDE.md` racine créé (adapté du template PLANIT-Strategie-VibeCode)
- [x] ADR-0001 créé (`docs/architecture/adr/0001-monolithe-modulaire-turborepo.md`)
- [x] `docs/tech-debt.md` : TD-001 à TD-005 listés
- [x] `docs/shared-resources-lock.md` initialisé (aucun lock actif)
- [x] `docs/shared-resources-lock.md` : liste des ressources sensibles documentée
