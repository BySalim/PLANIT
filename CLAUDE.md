# PLANIT — Mémoire racine Claude Code

> **Charge ce fichier en PREMIER à chaque session.** Auto-suffisant : tout ce dont Claude a besoin est ici.

## Périmètre de lecture pour Claude

Tu **NE LIS PAS** les dossiers suivants (présents dans `../PLANIT-Strategie-VibeCode/`) — ils sont la propriété conceptuelle du tech lead :

- `strategies/` (méthodologie, réservée à Salim)
- `prompts/` (prompts opérationnels du tech lead)
- `doxcs/` (mémoire, mémoire de master, brouillons sources)
- `templates/` (modèles humains)

**Périmètre autorisé** : ce fichier, `.claude/agents/`, `.claude/commands/`, `../PLANIT-Strategie-VibeCode/vagues/vague-XX-*.md`, le code de ce repo (`apps/`, `packages/`, `infra/`, `docs/`).

Si une info te semble manquante, **demande à l'humain** — ne va pas explorer les dossiers ci-dessus.

---

## Identité projet

PLANIT — plateforme de gestion d'emploi du temps pour l'**ISM** (École d'Ingénieurs, Dakar). Équipe de 5 étudiants qui vibe-codent en autonomie. **Pas de date limite imposée** : `main` doit être démontrable à tout moment.

Stack : Next.js 15 + React 19 (web) · Expo (mobile) · NestJS (backend) · PostgreSQL 16 + Prisma · Redis 7 + Socket.IO · BullMQ · MinIO · Baileys WhatsApp · Orange SMS · Docker Compose · Hetzner CX22 · Turborepo + pnpm. **TypeScript strict partout.**

---

## Règles équipe — non-négociables

| Membre                        | Branche        | Spécialité                       |
| ----------------------------- | -------------- | -------------------------------- |
| Salim Ouedraogo (@BySalim)    | `feat/salim`   | Tech Lead — arbitrage, ADR, spec |
| Oumy (@oumy-code)             | `feat/oumy`    | Frontend Web                     |
| Libasse (@cheelee08)          | `feat/libasse` | Frontend Mobile + design         |
| Oumar (@papiuzumaki)          | `feat/oumar`   | Backend (NestJS, Prisma)         |
| Djibril (@pape-djibrilbousso) | `feat/djibril` | DevOps + intégrations            |

**À chaque démarrage de session, tu DOIS** :

1. Exécuter `git branch --show-current`
2. Identifier le membre selon le tableau
3. Annoncer : « Branche active : `feat/<X>` — session pour **Prénom**. »
4. **Refuser tout commit sur `main`, `develop`, ou sur la branche d'un autre membre.**

Si la branche n'est pas une `feat/<prénom>` connue → refuser d'écrire et demander confirmation.

---

## Stratégie de branches

```
main ← develop ← feat/*
```

- `main` : production stable, jamais touché directement — reçoit uniquement des merges depuis `develop`
- `develop` : intégration — toutes les PRs de features ciblent `develop`
- `feat/<prénom>` : branche de travail de chaque membre — PR → `develop`

---

## Mode autonome + décisions sensibles

Tu travailles en **autonomie** : tu exécutes les phases du workflow sans demander d'avis entre chaque batch.

Tu t'arrêtes UNIQUEMENT pour ces **décisions sensibles** :

| Cas                                                       | Raison                    |
| --------------------------------------------------------- | ------------------------- |
| Ajout/suppression d'une dépendance npm                    | Coût lock + sécurité      |
| Modification de `prisma/schema.prisma` au-delà du trivial | Impact migration          |
| Modification de `packages/contracts/`                     | Impact tous consommateurs |
| Suppression de code > 20 lignes                           | Risque perte              |
| Modification d'une convention dans ce CLAUDE.md           | Impact équipe             |
| Décision d'architecture non triviale                      | Nécessite ADR             |
| Changement d'API publique                                 | Compat clients            |
| Action sur `main` ou `develop`                            | Branches protégées        |

Tout le reste : tu décides, tu codes, tu commits, tu loggues.

---

## Workflow vibe code

```
PROBE → SPEC → PLAN → CODE → CHECK → JOURNAL
```

- **PROBE** (lecture seule) — lire spec/vague/ADR concernés, identifier ce qui existe
- **SPEC** — `docs/specs/VAGUE-XX-NN-<slug>.md` rédigée AVANT le code
- **PLAN** — en Plan Mode, tableau `# · Étape · Fichiers · Tests · Risque` (5-15 étapes)
- **CODE** — autonome sauf décisions sensibles, tests écrits EN MÊME TEMPS
- **CHECK** — feature testée navigateur, lint+typecheck+tests verts AVANT commit
- **JOURNAL** — entrée dans `docs/agent-journal/<membre>/`
- **COMMITS** — commits réguliers aux jalons logiques : un commit dès qu'une feature ou sous-tâche passe le CHECK au vert. Jamais un seul gros commit en fin de session ; jamais un commit par micro-édition.

Slash commands : `/feat-start`, `/feat-check`, `/vague-status`, `/adr`, `/journal`, `/onboard`, `/db-migrate`, `/security-audit`, `/tech-debt`.

Subagents (à invoquer **on-demand uniquement**, pas systématiquement — chaque cold-start coûte cher) : `spec-writer`, `frontend-builder`, `backend-builder`, `db-architect`, `reviewer`, `tester`.

---

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

---

## Conventions code

- TypeScript strict, **pas de `any`**, pas de `as`, pas d'export par défaut (sauf pages/layouts Next.js obligatoires)
- Composants `kebab-case.tsx`, types `PascalCase`, fonctions `camelCase`
- UI labels en **français**, code en **anglais**
- Tokens de `@planit/design-tokens` (pas de hex en dur)
- Validation Zod via `@planit/contracts`
- Tests : Vitest unit + integration, Playwright e2e
- Commits : Conventional Commits (`feat`, `fix`, `refactor`, etc.), en-tête < 72 chars

---

## Sécurité — règles dès jour 1

- Aucun secret en dur — `.env.example` documenté, `.env` gitignored, gitleaks actif
- Validation Zod systématique sur tout endpoint
- Logger redacter (jamais `password`/`token`/`mfaSecret` dans les logs)
- Pas de `eval`, pas de `dangerouslySetInnerHTML` sans justification commentée
- RBAC côté serveur sur chaque endpoint sensible (à partir de la Vague 02 où l'auth arrive)
- Schéma Prisma User prêt à l'auth (Vague 02)

---

## Soft-locks sur ressources partagées

Avant de toucher à `prisma/schema.prisma`, `packages/contracts/`, `packages/design-tokens/`, `docker-compose.dev.yml`, `Caddyfile` : lire `docs/shared-resources-lock.md`. **Poser un lock** au format `<membre> · <ressource> · <date> · <durée estimée>` ; le libérer en fin de session.

---

## Sync asynchrone (pas de réunion)

Pas de daily, kickoff, mid-sprint, démo, rétro. Tout se synchronise via :

- Fichier vague (`../PLANIT-Strategie-VibeCode/vagues/vague-XX-*.md`) avec statuts `[ ]` `[~]` `[x]`
- Pull Requests GitHub (PR → `develop`)
- `docs/agent-journal/<membre>/`
- `docs/shared-resources-lock.md`

---

## Format journal d'agent

À la fin de chaque feature, écrire `docs/agent-journal/<membre>/<YYYY-MM-DD>-<slug>.md`. Sections obligatoires (1 ligne minimum chacune) :

1. **Directives reçues** — ce que l'humain a demandé
2. **Décisions techniques** — prises en autonomie
3. **Décisions soumises à validation** — celles remontées à Salim
4. **Modifications** — fichiers créés/modifiés/supprimés + tests ajoutés
5. **Phase CHECK — résultats** — lint/typecheck/tests + smoke
6. **Surprises** — blocages, ambiguïtés, ce qui a divergé du plan
7. **Suite** — PR ouverte, prochaine tâche, soft-locks libérés
8. **Mises à jour annexes** — CLAUDE.md, ADR, tech-debt

Slash command : `/journal`.

---

## Structure repo

```
apps/         web · backend · mobile · whatsapp-bot
packages/     contracts · ui · design-tokens · config · utils
infra/        docker-compose.dev.yml · caddy/ · scripts/
docs/         specs/ · architecture/adr/ · runbooks/ · agent-journal/ · shared-resources-lock.md · tech-debt.md
.claude/      agents/ · commands/ · settings.json
```

---

## Pointeurs (les seuls que tu peux suivre)

- Vague active : `../PLANIT-Strategie-VibeCode/vagues/vague-01-index.md` puis `vague-01-lots.md` et `vague-01-scenarios.md` au besoin
- Subagents : `.claude/agents/`
- Slash commands : `.claude/commands/`
- Prototype design : `../PLANIT-IA/`
- ADR : `docs/architecture/adr/`
- Journal d'agent : `docs/agent-journal/<membre>/`
- Tech debt : `docs/tech-debt.md`
