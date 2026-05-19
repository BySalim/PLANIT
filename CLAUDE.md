# PLANIT — Mémoire racine Claude Code

> **Charge ce fichier en PREMIER à chaque session.** Tout le projet en repose dessus.

## Identité projet

PLANIT — plateforme de gestion d'emploi du temps pour l'**ISM** (École d'Ingénieurs, Dakar). Équipe de 5 étudiants qui vibe-codent en **autonomie**. **Pas de date limite imposée** : `main` doit être **démontrable à tout moment**.

## Règles équipe — non-négociables

| Membre                        | Branche        | Spécialité                       |
| ----------------------------- | -------------- | -------------------------------- |
| Salim Ouedraogo (@BySalim)    | `feat/salim`   | Tech Lead — arbitrage, ADR, spec |
| Oumy (@oumy-code)             | `feat/oumy`    | Frontend Web                     |
| Libasse (@cheelee08)          | `feat/libasse` | Frontend Mobile + design         |
| Oumar (@papiuzumaki)          | `feat/oumar`   | Backend (NestJS, Prisma)         |
| Djibril (@pape-djibrilbousso) | `feat/djibril` | DevOps + intégrations            |

**Au démarrage de chaque session, tu DOIS** :

1. Exécuter `git branch --show-current`
2. Identifier le membre selon le tableau
3. Annoncer : « Branche active : `feat/<X>` — session pour **Prénom**. »
4. **Refuser tout commit sur `main`, `develop`, ou sur la branche d'un autre membre.**

Si la branche n'est pas une `feat/<prénom>` connue → refuser d'écrire et demander confirmation.

## Stratégie de branches

```
main ← develop ← feat/*
```

- `main` : production stable, jamais touché directement — reçoit uniquement des merges depuis `develop`
- `develop` : intégration — toutes les PRs de features ciblent `develop`
- `feat/<prénom>` : branche de travail de chaque membre — PR → `develop`

## Mode autonome (impératif)

Tu travailles en **autonomie** : tu exécutes les phases du workflow sans demander mon avis entre chaque batch.

Tu m'arrêtes UNIQUEMENT pour les **décisions sensibles** :

- Ajout/suppression de dépendance npm
- Modification de `prisma/schema.prisma` (au-delà du trivial)
- Modification de `packages/contracts/`
- Suppression de code > 20 lignes
- Modification d'une convention dans `CLAUDE.md` ou `strategies/`
- Décision d'architecture non triviale
- Changement d'API publique
- Action sur `main` ou `develop`

Tout le reste : tu décides, tu codes, tu commits, tu loggues.

## Traçabilité obligatoire (journal d'agent)

À la fin de chaque feature, tu écris `docs/agent-journal/<membre>/<YYYY-MM-DD>-<slug>.md` selon le format de `../PLANIT-Strategie-VibeCode/strategies/11-TRACABILITE-AUTONOME.md`. Sections obligatoires : directives reçues · décisions techniques · décisions soumises à validation · modifications · résultats CHECK · surprises · suite · mises à jour annexes.

Slash command : `/journal`.

## Workflow vibe code — non-négociable

```
PROBE → SPEC → PLAN → CODE → CHECK → JOURNAL
```

- **SPEC** : `docs/specs/VAGUE-XX-NN-<slug>.md` rédigée AVANT le code
- **PLAN** : en Plan Mode AVANT d'écrire
- **CHECK** : feature testée dans navigateur, lint+typecheck+tests verts AVANT commit
- **JOURNAL** : entrée écrite dans `docs/agent-journal/<membre>/`

Slash commands : `/feat-start`, `/feat-check`, `/vague-status`, `/adr`, `/journal`, `/onboard`.

## Stack technique (résumé)

Web Next.js 15 + React 19 · Mobile Expo · Backend NestJS · PostgreSQL 16 + Prisma · Redis 7 + Socket.IO · BullMQ · MinIO · Baileys WhatsApp · Orange SMS · Docker Compose · Hetzner CX22 · Turborepo + pnpm. **TypeScript strict partout**.

## Vocabulaire métier impératif

| Code BD                 | Label UI                                           |
| ----------------------- | -------------------------------------------------- |
| `RESPONSABLE_PROGRAMME` | « RP »                                             |
| `ASSISTANT_PROGRAMME`   | **« AC »** (Attaché de Classe — **jamais « AP »**) |
| `ENSEIGNANT`            | « Enseignant »                                     |
| `ETUDIANT`              | « Étudiant »                                       |
| `RESPONSABLE_CLASSE`    | « Délégué »                                        |

**Statuts séance** : `PROVISOIRE` (orange) · `VALIDE` (bleu) · `PUBLIE` (vert)
**Types séance** : `CM`, `TD`, `TP`, `EXAM`, `RATTRAP`, `DEVOIR`, `EVENT`
**Fuseau horaire** : **toujours `Africa/Dakar`** via `@planit/utils/date`, jamais `new Date()` direct.

## Soft-locks sur ressources partagées

Avant de toucher à `prisma/schema.prisma`, `packages/contracts/`, `packages/design-tokens/`, `docker-compose.dev.yml`, `Caddyfile` : lire `docs/shared-resources-lock.md`. Poser un lock si nécessaire. Le libérer en fin de session.

## Conventions code (résumé)

- TypeScript strict, pas de `any`, pas de `as`, pas d'export par défaut (sauf pages/layouts Next.js obligatoires)
- Composants `kebab-case.tsx`, types `PascalCase`, fonctions `camelCase`
- UI labels en **français**, code en **anglais**
- Tokens de `@planit/design-tokens` (pas de hex en dur)
- Validation Zod via `@planit/contracts`
- Tests : Vitest unit + integration, Playwright e2e
- Commits : Conventional Commits (`feat`, `fix`, `refactor`, etc.), en-tête < 72 chars

## Sécurité — règles dès jour 1

- Aucun secret en dur — `.env.example` documenté, `.env` gitignored, gitleaks actif
- Schéma Prisma User prêt à l'auth (Vague 02)
- Validation Zod systématique
- Logger redacter (jamais password/token/mfaSecret dans les logs)
- Pas de `eval`, `dangerouslySetInnerHTML` sans justification

## Structure repo

```
apps/         web · backend · mobile · whatsapp-bot
packages/     contracts · ui · design-tokens · config · utils
infra/        docker-compose.dev.yml · caddy/ · scripts/
docs/         specs/ · architecture/adr/ · runbooks/ · agent-journal/ · shared-resources-lock.md · tech-debt.md
.claude/      agents/ · commands/ · settings.json
```

## Pointeurs vers la doc

| Sujet                | Fichier                                                              |
| -------------------- | -------------------------------------------------------------------- |
| Stratégies méthodo   | `../PLANIT-Strategie-VibeCode/strategies/`                           |
| Traçabilité autonome | `../PLANIT-Strategie-VibeCode/strategies/11-TRACABILITE-AUTONOME.md` |
| Vague en cours       | `../PLANIT-Strategie-VibeCode/vagues/vague-01-mvp-planning.md`       |
| Prototype design     | `../PLANIT-IA/`                                                      |
| ADR                  | `docs/architecture/adr/`                                             |
| Journal d'agent      | `docs/agent-journal/<membre>/`                                       |
| Tech Debt            | `docs/tech-debt.md`                                                  |
