# Journal — Vague 04 LOT 8 « Déploiement réel (production ISM) »

> **Membre** : Salim (`feat/salim`) · **Date** : 2026-06-11 · **Cadre** : création + réalisation du LOT 8 (V4-D17 / ADR-0017)

## 1. Directives reçues

Créer un nouveau LOT dans V04 pour le **déploiement réel** de la solution. Le TL fait ses choix dans le chat (10 points + 3 clarifications), puis « rédige le nouveau lot ». Ensuite : « réalise tout le nouveau lot, je m'occuperai de la configuration manuelle ». En cours de route, deux révisions du TL : **pas d'écran admin** (bootstrap de 4 comptes cœur seulement) et **retrait de l'import étudiants** (saisie manuelle via l'UI existante).

## 2. Décisions techniques (autonomes)

- **Prod = 2ᵉ instance de la machinerie VM** (réutilise `compose.prod` + Ansible + `cd-pull.sh`/timer), paramétrée par `cd.env`/`.env.prod` (IMAGE_TAG=main, planit.sn, CADDY_TLS=LE). VM reste staging (`:staging`).
- **Scripts ops dans `src/scripts/`** (pas `prisma/`) → compilés en `dist/scripts/`, exécutables dans l'image runtime (devDeps élaguées), pattern `revoke-all-sessions`. `bootstrap-prod` + `reset-password` (argon2id, idempotent upsert par email, fail-fast, mdp ≥ 12).
- **Pages légales** = groupe `(legal)` **hors** `(planit)` + allowlist `PUBLIC_PATHS` du middleware (deny-by-default). Server components statiques.
- **Backup cloud** ajouté comme **3ᵉ niveau** dans `backup.sh` (rclone B2/R2), dans le scope du `trap ERR` (fatal + alerte).

## 3. Décisions soumises à validation (TL, dans le chat)

- Les 10 arbitrages (Hetzner CX32 eu-central, planit.sn/Netim, Caddy+LE, CD `:main`, bootstrap minimal, onboarding manuel, emails différés, backups doubles, obs plancher, pilote, légal nuancé) → **V4-D17**.
- **Retrait import** (8.6/8.7) + **pas d'admin** → répercutés partout. Le retrait de l'import a **annulé le seul vrai code neuf restant** : tout l'implémentable était déjà livré.
- Sensible : **CLAUDE.md** (section patterns LOT 8), **vague-04-\*.md** (repo stratégie). Pas de modif `contracts`/`schema.prisma` (import retiré).

## 4. Modifications

**Repo PLANIT** : `docs/architecture/adr/0017-mise-en-production-reelle.md` (créé) · `apps/backend/src/scripts/bootstrap-prod.ts` + `reset-password.ts` (créés) · `apps/backend/package.json` (scripts `bootstrap:prod`/`reset:password`) · `justfile` (`deploy-prod`/`bootstrap-prod`/`reset-password`) · `infra/prod/scripts/backup.sh` (cible cloud) · `infra/prod/scripts/cd.env.example` (créé) · `infra/ansible/inventory.example.ini` (hôte prod) · `infra/prod/env/.env.prod.example` (notes prod) · `apps/web/src/middleware.ts` (allowlist) · `apps/web/src/app/(legal)/{layout,mentions-legales/page,politique-confidentialite/page}.tsx` (créés) · `apps/web/src/app/login/page.tsx` (liens légaux) · `docs/runbooks/go-live-prod.md` (créé) + `deploy.md`/`incident-dr.md` (cible 4) · `docs/tech-debt.md` (`TD-V04-ADMIN-PROVISIONING`) · `CLAUDE.md` (patterns LOT 8).

**Repo Stratégie** : `vagues/vague-04-{lots,index,scenarios}.md` (LOT 8 + V4-D17 + cible 4 + amendements, import marqué retiré).

Tests ajoutés : aucun (scripts ops sans test, comme `revoke-all-sessions` ; pages légales statiques vérifiées navigateur).

## 5. Phase CHECK — résultats

- Backend : **typecheck vert**, **lint vert** (scripts `no-console`-compatibles). Tests d'intégration non relancés (DB-dépendants ; aucun code existant touché → scripts ops autonomes).
- Web : **typecheck vert**, **lint vert**, **97 tests verts**.
- **Vérification navigateur** (preview) : `/mentions-legales` + `/politique-confidentialite` rendent correctement, **non redirigées vers /login** (allowlist OK), 0 erreur console.

## 6. Surprises

- Énormément d'« essentiels prod » étaient **déjà bâtis mais dormants** (TLS domaine réel, Sentry, Uptime Kuma/Prometheus/Grafana, backups age+GFS+off-box) → le LOT relève surtout de l'**activation/config** (manuelle, TL), pas du dev.
- « CX23/CX33 » n'existe pas chez Hetzner → résolu en **CX32** (x86 80 Go eu-central) via les specs données.
- Le retrait de l'import a réduit le code neuf à **pages légales + bootstrap** ; le reste du LOT = ops/config manuelle.

## 7. Suite

- **Rien commité** (en attente décision TL). Pas de PR ouverte.
- **Config manuelle (TL)** : créer la box Hetzner, DNS Netim, `.env.prod`/`cd.env`, projet Sentry, bucket B2/R2, install systemd, saisie des données du pilote.
- Tâches LOT 8 restantes = `[ ]` (provisionnement/CD/obs/backups activation/pilote) — exécution ops, pas code.
- Soft-locks : aucun posé (édité seulement les fichiers vague + docs + scripts isolés, pas `schema.prisma`/`contracts`/`compose`/`Caddyfile`).

## 8. Mises à jour annexes

- **CLAUDE.md** : nouvelle section « Patterns émergés Vague 04 — LOT 8 ».
- **ADR-0017** créé (lève V4-D1). **tech-debt** : `TD-V04-ADMIN-PROVISIONING`.
- **Runbooks** : `go-live-prod.md` créé ; `deploy.md`/`incident-dr.md` étendus à la cible 4.
