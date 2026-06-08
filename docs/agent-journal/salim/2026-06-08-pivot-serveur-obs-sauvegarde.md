# Journal — Pivot posture serveur : VM de référence + sauvegarde durcie + observabilité

> **Membre** : Salim (`feat/salim`) · **Date** : 2026-06-08 · **Cadre** : V04+ (ADR-0009, ADR-0013)

## 1. Directives reçues

« J'enlève le déploiement test (Railway/Vercel/Cloudflare cloud loué) — on a déjà une machine locale,
on la configure comme un vrai serveur, on basculera en ligne au moment voulu. Pour l'instant : config VM
locale + **stratégie de sauvegarde conforme et rejouable**, **observabilité**, et les points importants
que je n'ai pas faits. Modifie la stratégie, les docs et les configs qui ne sont plus valables. »

Précision en cours de session (Q&R) : **on garde** la beta Cloudflare Tunnel (sur la VM, **sans domaine**
= quick-tunnel) ; ce qu'on abandonne, ce sont les **hébergeurs PaaS loués**. Observabilité = les 4 briques,
« mises en place une seule fois, sans config lourde ». Sauvegarde = « les meilleures approches ».

## 2. Décisions techniques (autonomes)

- **Beta non démantelée** : la PR #81 (pivot → Cloudflare Tunnel) est le bon état ; on privilégie le
  **quick-tunnel sans domaine** (`*.trycloudflare.com` + `basic_auth` Caddy) pour l'instant.
- **Sauvegarde durcie** (`backup.sh`/`restore.sh`) : chiffrement au repos **`age`** (clé privée hors box),
  rotation **GFS** (7 quotidiens / 4 hebdo / 6 mensuels) au lieu d'un KEEP plat, **sidecar `.sha256`** +
  vérif au restore, **mode drill non-interactif**, **alerte/heartbeat push** (Uptime Kuma) si échec.
  Ansible installe `age`/`nfs-common`/`rsync` + pose le **cron 02h** (set up once). Logique GFS testée
  isolément (200 dumps → 13 survivants attendus).
- **Observabilité in-house d'abord** : `requestId` via `AsyncLocalStorage` injecté dans chaque log pino
  (mixin) + en-tête `X-Request-Id`, middleware Express branché en tout premier dans `main.ts`.
- **Stack self-host en profil compose opt-in `observability`** (même patron que `tunnel`) : **Dozzle**
  (logs web) + **Uptime Kuma** (uptime/alerting + réception de l'alerte backup), **bindés 127.0.0.1**
  (accès SSH local-forward, aucun port ufw ouvert).
- **Sentry = SaaS free tier** (le plus zéro-config) ; GlitchTip self-host noté comme swap.
- **Staging en increments** : metrics (prom-client + Prometheus + Grafana) et Sentry **reportés en
  increment 3** car ils ajoutent des deps npm (→ `pnpm install`) / un compte externe (DSN) → PR dédiée
  installable et vérifiable.

## 3. Décisions soumises à validation

- **Posture serveur** (VM = référence rejouable, PaaS loués abandonnés/pausés) — décision TL actée via Q&R.
- **Activation observabilité Phases 1-2** (ADR-0009) + **2 deps npm à venir** (`prom-client`, `@sentry/*`)
  — pré-validées par la sélection de Salim ; effectives en increment 3.
- **Sentry SaaS** comme error tracking — tranché, à confirmer au branchement (création du projet/DSN par Salim).

## 4. Modifications

**Stratégie/ADR** : `0009-observabilite-strategie.md` (Phases 1-2 ACCEPTÉES + outillage), `0013-strategie-deploiement-v04.md` (note de révision posture serveur), `docs/tech-debt.md` (obs + beta).

**Sauvegarde** : `infra/prod/scripts/backup.sh` (chiffrement+GFS+sha256+alerte), `restore.sh` (déchiffrement+intégrité+drill), `infra/ansible/site.yml` (age/nfs/rsync + cron), `docs/runbooks/truenas-backup.md` + `vm-self-host.md` (§8 + drill §8.1).

**Observabilité** : `apps/backend/src/common/request-context.ts` (+ `request-id.middleware.ts`) **[nouveaux]**, `logger.module.ts` (mixin), `main.ts` (app.use), `apps/backend/test/unit/request-context.spec.ts` **[nouveau, 6 cas]**, `infra/docker-compose.prod.yml` (profil `observability`), `.env.prod.example`, `docs/runbooks/observabilite.md`.

**Lock** : `docs/shared-resources-lock.md` (compose prod, posé puis libéré).

## 5. Phase CHECK — résultats

- **Backend** : `tsc --noEmit` **vert** ; `eslint --max-warnings 0` sur les fichiers touchés **vert**.
- **Scripts bash** : `bash -n` OK (backup/restore) ; logique GFS validée par test isolé (200→13).
- **Compose** : YAML parse OK (10 services, 6 volumes) ; services obs alignés sur les patterns validés.
- **Tests unit requestId** écrits (6 cas) — **non exécutables en local** (`global-setup` lance
  `prisma migrate deploy` → exige une BD). La CI (service Postgres) les exécute.

## 6. Surprises

- Quirk bash : `${#assoc[@]}` sur tableau associatif vide plante sous `set -u` → remplacé par des
  compteurs explicites dans `prune_gfs`.
- La demande initiale « enlever Cloudflare » se précise en « garder le tunnel, abandonner les PaaS
  loués » : pas de démantèlement beta, juste un recentrage.
- Le câblage requestId via `app.use` (fonction Express) plutôt que `NestMiddleware.forRoutes('*')`
  évite le piège du wildcard sous Express 5 et couvre 100 % des requêtes.

## 7. Suite

- **Increment 3** (PR dédiée) : `prom-client` + endpoint `/metrics` + Prometheus + Grafana
  (dashboards golden-signals) ; **Sentry** (back + web + source-maps CI) — nécessite que Salim crée le
  projet Sentry + DSN. Câblage Caddy : refuser `/api/metrics` au public (tunnel).
- **Beta** : PR #81 (Cloudflare Tunnel) reste à merger sur `develop` (verte, mergeable).
- Soft-lock `docker-compose.prod.yml` **libéré**.

## 8. Mises à jour annexes

- ADR-0009 (Phases 1-2 acceptées), ADR-0013 (note de révision posture). tech-debt : `TD-OBS-REQID`,
  `TD-OBS-UPTIME`, `TD-OBS-HEALTH` retirés (livrés) ; `TD-OBS-SENTRY/SINK/METRIC/LOGS` reformulés
  (increment 3) ; `TD-V04-BETA-EXTERNE` mis à jour (PaaS abandonnés, quick-tunnel privilégié).
