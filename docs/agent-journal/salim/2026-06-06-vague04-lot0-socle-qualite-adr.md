# Journal — Vague 04 LOT 0 : Socle qualite & ADR

> **Membre** : Salim (`feat/salim`) · **Date** : 2026-06-06 · **LOT** : Vague 04 — LOT 0 (0.1 -> 0.5)

## 1. Directives recues

Realiser tout le LOT 0 de la Vague 04, avec rapport personnel maintenu hors repo dans `C:\Users\ouedr\PLANIT-JBA\rapport-vague-04.md`.

## 2. Decisions techniques

- Choix d'un `justfile` plutot qu'un Makefile : plus lisible comme task runner ops, compatible Windows via shell PowerShell dans ce repo.
- Separation des livrables : etat des lieux (`v04-etat-des-lieux.md`), ADR deploiement (ADR-0013), ADR tests/qualite (ADR-0014), conventions pratiques (`v04-conventions-qualite-infra.md`).
- Creation de squelettes `tests/perf/` et `infra/prod/` pour rendre les conventions visibles dans le repo sans anticiper les LOTs 1/3/5.

## 3. Decisions soumises a validation

Aucune nouvelle dependance npm ajoutee. Les choix d'outils structurants reprennent la Vague 04 source : GitHub Actions, Docker multi-stage, GHCR, Railway beta, VM pull-based, k6, Gitleaks, OSV, Trivy, Semgrep, Caddy.

## 4. Modifications

- Cree `docs/runbooks/v04-etat-des-lieux.md`.
- Cree `docs/architecture/adr/0013-strategie-deploiement-v04.md`.
- Cree `docs/architecture/adr/0014-strategie-tests-qualite-v04.md`.
- Cree `docs/runbooks/v04-conventions-qualite-infra.md`.
- Cree `tests/perf/README.md`.
- Cree `infra/prod/README.md`.
- Cree `justfile`.
- Mis a jour le fichier source de vague hors repo pour marquer le LOT 0 en cours.
- Rapport personnel hors repo mis a jour.

## 5. Phase CHECK — resultats

- `prettier --check` cible sur les nouveaux Markdown : OK.
- `git status --short --untracked-files=all` : changements attendus uniquement pour LOT 0.
- `just --list` non execute : binaire `just` absent de l'environnement local Codex. Le `justfile` est un livrable de convention ; son execution sera verifiee quand l'outil sera installe sur un poste dev/CI.
- Pas de `pnpm lint/typecheck/test` complet lance : aucun code applicatif modifie, uniquement docs/config/squelettes.

## 6. Surprises

- `AGENTS.md` est local et ignore par Git, mais reste utile pour Codex.
- `e2e/smoke.spec.ts` cible encore un flux ancien (`/rp`) alors que V03 a introduit les routes role-aware ; a reprendre en LOT 2.
- Les commandes de recherche larges doivent exclure `node_modules`, sinon elles time out vite sous Windows.
- `pnpm` n'est pas disponible directement dans le PATH de ce shell ; `corepack pnpm` a tente de telecharger `pnpm@10.33.4` mais a echoue sur timeout reseau. Prettier a ete execute via `node_modules/.bin/prettier.CMD`.

## 7. Suite

- LOT 1 pourra demarrer sur Dockerfiles + compose prod.
- LOT 2 pourra activer coverage + e2e CI a partir des seuils ADR-0014.
- Liberer/mettre a jour les statuts de vague apres validation finale du LOT 0.

## 8. Mises a jour annexes

- ADR-0013 et ADR-0014 ajoutent les decisions structurantes V04.
- Le rapport personnel `rapport-vague-04.md` est maintenu hors repo equipe.
