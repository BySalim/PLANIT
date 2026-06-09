# Journal — Correctifs config V04 + déco flottante + CLI déco globale + stratégie git staging

> **Membre** : Salim (`feat/salim`) · **Date** : 2026-06-09 · **Cadre** : V04+ (ADR-0009, ADR-0013, ADR-0015, ADR-0016)

## 1. Directives reçues

À partir des 4 suivis locaux de config (`*-suivi.log`, gitignored) : (1) repérer les **erreurs de config
du projet** (pas les erreurs de poste) qu'on a dû corriger sur la VM mais pas encore dans le repo ;
(2) vérifier la recommandation Sentry de l'écran (passer les DSN aux conteneurs + CSP) ; (3) implémenter
un **bouton flottant de déconnexion** (prod) et une **commande admin** qui déconnecte tous les utilisateurs ;
(4) mettre en place la **stratégie git `staging`** (VM = serveur de test, flux `feat/*→develop→staging→main`,
`hotfix/*→main`). Analyse fine des fichiers touchés + plan.

## 2. Décisions techniques (autonomes)

- **Config** : `CLOUDFLARE_TUNNEL_TOKEN` / `GRAFANA_ADMIN_PASSWORD` passés de `${VAR:?}` (requis-dur) à
  `${VAR:-}` — Compose interpole tout le fichier au parse, ces secrets de profils inactifs cassaient
  la stack de base (log vm-self-host §616). URL readiness Uptime Kuma corrigée (`backend:3001` direct, pas
  `caddy` → TLS interne).
- **Sentry** : la reco de l'écran est **correcte mais incomplète** pour la VM (pull GHCR). `SENTRY_DSN`
  (backend + Next SSR) = runtime → OK via `.env.prod`. `NEXT_PUBLIC_SENTRY_DSN` = **build-time** inliné →
  doit être injecté en **build arg CI** (`build-images.yml`, var repo), pas sur la VM. CSP `connect-src`
  dérive automatiquement l'origine d'ingestion du DSN (`new URL(dsn).origin`). Bonus : même mécanisme
  appliqué à `NEXT_PUBLIC_WS_URL` → résout `TD-V04-WS-BUILDARG`.
- **Bouton déco** : `<LogoutFloater>` prod, gated `state.status==='authenticated'`, drag+persist (mécanique
  reprise du `DevToolsFloater` dev-only), clic→mini-confirm→`logout()`. Monté dans `(planit)/layout.tsx`.
- **Déco globale** : `AuthService.revokeAllSessions()` (updateMany sur refresh non révoqués) + CLI
  `src/scripts/revoke-all-sessions.ts` via `NestFactory.createApplicationContext` (aucun serveur HTTP/WS).
  Re-login forcé ; access JWT expirent ≤ `JWT_ACCESS_TTL` (15 min). Pas d'epoch par requête (préserve
  « zéro hit BD par requête »).
- **Git staging** : guards `require-source-staging` (PR→staging ← develop/hotfix) et `require-source-main`
  (PR→main ← staging/hotfix, **renommé** depuis `require-develop`). `cd-pull.sh` défaut `IMAGE_TAG=staging`.
  `security.yml` étendu à `staging` (sinon ses checks ne reporteraient pas sur les PR staging).

## 3. Décisions soumises à validation (tranchées par Q&R en amont du plan)

- Git : **repo + branch protection via `gh`** ; flux **`hotfix→main`** (gitflow std) ; Sentry **bake DSN
  en build CI** ; déco globale **= révoquer tous les refresh**. Toutes confirmées par Salim avant code.

## 4. Modifications

**Config/obs** : `infra/docker-compose.prod.yml` (profils `:-`, Sentry env+build-arg, comment readiness),
`apps/web/Dockerfile` (ARG NEXT_PUBLIC_SENTRY_DSN), `apps/web/next.config.ts` (connect-src dérivé du DSN),
`.github/workflows/build-images.yml` (build-args web), `infra/prod/env/.env.prod.example`,
`docs/runbooks/observabilite.md`, `docs/tech-debt.md` (TD-OBS-SENTRY + TD-V04-WS-BUILDARG).

**Web** : `apps/web/src/components/layout/logout-floater.tsx` **[+]** + test **[+]**, `(planit)/layout.tsx`.

**Backend** : `apps/backend/src/auth/auth.service.ts` (`revokeAllSessions`), `src/scripts/revoke-all-sessions.ts`
**[+]**, `package.json` (script), `test/unit/auth.revoke-all.spec.ts` **[+]**, `docs/runbooks/vm-self-host.md`
(§9ter), `docs/voeux.md` (VOEU-002 → partiel livré) **[+ versionné]**.

**Git** : `.github/workflows/{build-images,ci,security,protect-main}.yml`, `protect-staging.yml` **[+]**,
`infra/prod/scripts/cd-pull.sh`, `CLAUDE.md` (stratégie branches), `docs/runbooks/branch-protection.md`,
`docs/architecture/adr/0016-branche-staging-serveur-test.md` **[+]**.

**GitHub (gh api, live)** : branche `staging` créée depuis `develop` + protégée (miroir develop, sans
`branch-owner`, + `require-source-staging`) ; sur `main`, swap `require-develop`→`require-source-main`
(code-owner + `enforce_admins` **préservés**, opération chirurgicale via sous-endpoint contexts).

## 5. Phase CHECK — résultats

- **Web** : `typecheck` vert, `lint` (next lint --max-warnings 0) vert, **97 tests verts** (dont 5 nouveaux
  `logout-floater`). CSP : dérivation d'origine Sentry confirmée (node).
- **Backend** : `build` (prisma generate + nest build) vert → `dist/scripts/revoke-all-sessions.js` émis ;
  `lint` vert. Tests unit (revoke-all) **exécutés par la CI** (globalSetup exige Postgres ; Docker non lancé
  en local — pattern habituel).
- **Compose/Workflows** : YAML parse OK (12 services ; 4 workflows). `docker compose config` non rejoué
  (daemon Docker non démarré) — le fix `:?`→`:-` est validé par raisonnement + YAML.

## 6. Surprises

- `commitlint` : header > 72 chars (Part 1) et `subject-case` upper-case sur « CLI » (Part 3) → reformulés.
- `main` avait bien `require-develop` en required check → swap obligatoire (sinon PR→main bloquée).
- develop a `branch-owner` en required context (push-only) : volontairement **exclu** de staging (sinon
  une PR develop→staging resterait « Expected » indéfiniment).

## 7. Suite

- **Actions manuelles Salim** (hors repo) :
  1. VM : `/opt/planit/cd.env` → `IMAGE_TAG=staging` (au lieu de `develop`), puis pull/restart.
  2. GitHub → Settings → Variables (Actions) : créer `NEXT_PUBLIC_SENTRY_DSN` + `NEXT_PUBLIC_WS_URL`
     (publics), puis rebuild l'image web (push staging / workflow_dispatch).
  3. `/opt/planit/.env.prod` : poser `SENTRY_DSN` (backend) ; tester la capture.
- **Effet des workflows** : prend effet une fois `feat/salim → develop` mergé (les guards/build staging
  vivent dans les fichiers de ce commit). Les protections GitHub sont **déjà live**.
- PR `feat/salim → develop` à ouvrir (non poussée automatiquement).

## 8. Mises à jour annexes

- **CLAUDE.md** : section « Stratégie de branches » réécrite (+ staging/hotfix), refus commit direct sur `staging`.
- **ADR-0016** créé (staging = serveur de test). **tech-debt.md** : TD-OBS-SENTRY + TD-V04-WS-BUILDARG mis à jour.
- **voeux.md** : VOEU-002 → « En cours / partiel livré ».
