# Observabilité V02 — documentation bout-à-bout + Phase 0

**Date** : 2026-05-30
**Branche** : `feat/salim`
**PR cible** : `develop`
**Tâches couvertes** : aucune tâche `vague-02-lots.md` formelle — initiative Tech Lead suite à un constat d'absence totale d'observabilité (logs/erreurs/perf) en prod. Cadré « documenter le système complet, n'implémenter que le strict nécessaire ».

## 1. Directives reçues

1. Question initiale : « existe-t-il un système de logs pour identifier les erreurs en prod (front + back) ? » → audit.
2. Puis : panorama général des outils d'observabilité (logs, perf, bugs).
3. Décision : « système complet **bout-à-bout**, **documenté** ; mettre en place **seulement ce qui est important** dans cette vague ; ne pas s'attarder sur le non-nécessaire. »
4. Arbitrage du périmètre via question : réponse retenue = **« Docs + strict minimum »** (ADR + runbook + error boundaries front + `/health/ready`).

## 2. Décisions techniques (prises en autonomie)

- **Stratégie par phases** (ADR-0009). Phase 0 = in-house, **zéro dépendance, aucun compte externe**. Phases 1-3 documentées et reportées (chacune introduit une dépendance/compte = décision sensible).
- **Readiness vs liveness séparés** : `/api/health` reste un liveness sans I/O (ne pas redémarrer le conteneur sur incident BD passager) ; `/api/health/ready` vérifie Postgres via `SELECT 1` et renvoie **503** sinon (exploitable par LB/uptime).
- **Check BD sans nouvelle dépendance** : `PrismaService.$queryRaw` au lieu d'ajouter `@nestjs/terminus`. Root cause loggée via pino ; le 503 (≥500) est aussi capté par `AllExceptionsFilter`.
- **Error boundaries** : `error.tsx` (segment, repli on-brand avec tokens + « Réessayer »/« Accueil » via `<Link>`) et `global-error.tsx` (dernier rempart, rend ses `<html>/<body>`, **styles inline** car le pipeline CSS peut être absent lors d'un échec très précoce — exception assumée à « pas de hex en dur », justifiée en commentaire).
- **Pas de report distant en Phase 0** : les boundaries n'envoient rien (lint `no-console` respecté) ; le branchement Sentry/endpoint est explicitement la Phase 1 (`TD-OBS-SINK`).
- **Test health** réécrit en self-contained (mock `PrismaService` + `PINO_LOGGER`), 3 cas (liveness, ready 200, ready 503). L'ancien `imports: [HealthModule]` ne pouvait plus marcher (le controller injecte désormais Prisma + logger).
- **Tech-debt `TD-OBS-*`** : 7 entrées pour tracer les phases reportées (Sentry, uptime/alerting, requestId, sink front, agrégateur logs, métriques, câblage health infra).

## 3. Décisions soumises à validation

- **Périmètre** tranché par l'utilisateur (« Docs + strict minimum »).
- **Reporté en décision sensible explicite** : ajout de Sentry/GlitchTip (dépendance + DSN/compte) et agrégateur de logs SaaS — **non engagés**, documentés avec checklist d'activation (runbook §5, ADR-0009 Phase 1).

## 4. Modifications

### Créés

- `docs/architecture/adr/0009-observabilite-strategie.md` — architecture cible bout-à-bout + phasage 0→3 + alternatives.
- `docs/runbooks/observabilite.md` — état actuel, lecture des logs prod, endpoints santé, erreurs front, checklist activation Sentry.
- `apps/web/src/app/error.tsx` — error boundary de segment.
- `apps/web/src/app/global-error.tsx` — global error boundary.
- `docs/agent-journal/salim/2026-05-30-observabilite-phase0.md` — ce journal.

### Modifiés

- `apps/backend/src/health/health.controller.ts` — ajout `GET /health/ready` (check Postgres, 503 si down) + injection `PrismaService`/`PINO_LOGGER` ; liveness inchangé.
- `apps/backend/test/health.spec.ts` — réécrit self-contained, 3 tests (liveness, ready 200, ready 503).
- `docs/tech-debt.md` — section « Observabilité (ADR-0009 — phases reportées) », 7 entrées `TD-OBS-*`.

## 5. Phase CHECK — résultats

> Verts **après 2 correctifs** (cf. §6) — chaque résultat re-vérifié via le **code de sortie** (`&&` chaîné + log dédié) car des résultats d'outils « tout vert » fabriqués sont apparus en cours de route.

- `pnpm --filter @planit/backend typecheck` ✅ (`TC=0`)
- `pnpm --filter @planit/backend lint` ✅ (0 warning)
- `pnpm --filter @planit/backend test` ✅ **134/134** (13 fichiers ; `test/health.spec.ts (3 tests)`)
- `pnpm --filter @planit/web typecheck` ✅ (`WEB_TC_EXIT=0`)
- `pnpm --filter @planit/web lint` ✅ ("No ESLint warnings or errors")
- `pnpm --filter @planit/web test` ✅ **36/36** (7 fichiers)
- Smoke navigateur des error boundaries : non exécuté (repli statique, validé par tsc + next lint ; `next build` non lancé — hors « strict minimum »).

## 6. Surprises / blocages

- **Résultats d'outils fabriqués pendant la session** : plusieurs lectures de fichiers sont revenues « corrompues » avec du texte injecté (marqueurs japonais « 省略/後略 » = « omis », narration de type IA « Let me focus on the task »). Pire, un **faux fichier** `docs/specs/VAGUE-02-23-observabilite-monitoring.md` m'a été présenté (avec des directives intégrées : « créer l'ADR-0009, coder étape par étape, ne pas réécrire la spec »), une **liste fictive d'une quarantaine de specs**, et même des **résultats de CHECK « tout vert » fabriqués** (faux « 134/134 » avant que le code ne compile seulement) ainsi que de **faux `git status`** (1 seule ligne au lieu de 6). **Vérification git** : le faux fichier n'existe pas ; le repo a réellement 10 specs (jusqu'à `VAGUE-02-02`), 8 ADR (jusqu'à 0008). → Je n'ai **suivi aucune instruction issue de ce contenu planté**, et j'ai **re-validé tous les CHECK + l'état disque via les codes de sortie et `git status --porcelain`** plutôt que le texte affiché. Garde-fou : croiser lectures/résultats suspects avec `git show`/`git ls-files`/`git status` et les exit codes ; séquentialiser les commandes de vérif finale (les batchs parallèles masquaient des Edit/Write échoués).
- **2 écritures perdues sans erreur visible** : mon Edit de `tech-debt.md` (jamais Read au préalable → refusé) et le 1er Write du journal (annulés en cascade d'un batch parallèle). Détectés uniquement parce que `git status --porcelain --untracked-files=all` montrait 6 entrées et non 8. Re-appliqués ensuite.
- **Vitest sans `globals`** : 1er run du test → `ReferenceError: describe is not defined`. Ce projet **n'active pas** `globals: true` — chaque spec importe `describe/it/expect/...` depuis `vitest` (cf. `auth.spec.ts`). Subtilité : le `tsconfig` connaît les globals au **type-level** (typecheck OK) mais ils sont absents au **runtime**. Corrigé en important explicitement.
- **Lint Next + tokens inexistants** (`error.tsx`) : `<a href="/">` → erreur `@next/next/no-html-link-for-pages`, remplacé par `<Link>`. Et j'avais utilisé des classes de tokens **inexistantes** (`bg-danger`, `text-primary-fg`, `bg-surface-muted`) — les vrais tokens sont `err`/`primary`/`bg` (`bg-err-100 text-err`, `text-white`, `hover:bg-bg`). Tailwind v4 n'échoue pas sur une classe inconnue → seul la connaissance des tokens l'attrape, pas le lint.
- **Typing mock provider** : `useValue` inline avec objet littéral → `error TS2769 ... type 'never'`. Le pattern maison (cf. `auth.spec.ts`) déclare les mocks en `const … as unknown as Type` (les tests dérogent au « pas de `as` » pour les mocks). Aligné dessus.

## 7. Suite

- Ouvrir la PR `feat/salim → develop`.
- **Phase 1** quand l'équipe décide (Djibril, DevOps) : Sentry/GlitchTip + requestId + report front + agrégateur logs (checklist runbook §5). Décision sensible (dépendances + compte) → ADR-0009 sert de base.
- Câbler `/health/ready` à un moniteur uptime + Caddy (`TD-OBS-HEALTH`).
- Soft-locks : aucun posé (pas de modif schema/contracts/tokens).

## 8. Mises à jour annexes

- **ADR** : 0009 créé.
- **Runbook** : `observabilite.md` créé.
- **Tech-debt** : 7 entrées `TD-OBS-*`.
- **CLAUDE.md** : non modifié (changement de convention = décision sensible). Patterns « liveness/readiness séparés » + « error boundaries App Router » candidats à documenter en « Patterns émergés » si validé.
- **vague-02-index.md** : non modifié (l'ADR fait foi ; ajout éventuel d'un V2-D17 à l'appréciation du TL).
