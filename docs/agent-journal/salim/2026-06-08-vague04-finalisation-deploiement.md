# Journal — Vague 04 : finalisation déploiement (correctifs + reste LOT 5 + TrueNAS + beta cloud)

> **Membre** : Salim (`feat/salim`) · **Date** : 2026-06-08 · **LOT** : Vague 04 — LOT 5 (clôture) + ADR-0015

## 1. Directives reçues

Continuer la finalisation V04 sur la base d'un plan en **4 PRs séquentielles** : (1) correctifs issus de la
run réelle VM, (2) reste du LOT 5 (5.5/5.9/5.12), (3) backup off-box TrueNAS réintégré, (4) hébergeur beta
cloud en remplacement de Railway. La cible **VM self-host est déjà livrée et prouvée** sur une vraie VM.

## 2. Décisions techniques (autonomes)

- **Redis hors runtime** (PROBE) : `grep ioredis|bullmq|createClient` → rien hors `env.validation`. Le beta
  n'a donc besoin **que** de Postgres → **pas d'Upstash** (Redis inerte), **pas de MinIO** (exports client-side).
- **Beta = Neon + Koyeb + Vercel** (remplace Railway, trial expiré) : Neon (PG managé), Koyeb (backend Docker
  depuis GHCR), Vercel (web Next). Rewrite `/api` côté Vercel → cookies d'auth **first-party** (même pattern
  que le proxy dev). Tracé **ADR-0015**.
- **basic-auth beta hand-rolled** dans `middleware.ts` (env `BETA_BASIC_AUTH`, off en dev, couvre `/api`) →
  **0 dépendance npm**.
- **seed password env-overridable** : `SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'Test1234!'` (défaut dev,
  fort non commité en beta — V4-D16). Accès via bracket-notation (`noPropertyAccessFromIndexSignature`).
- **CSP `connect-src`** : inclut l'origine WS prod quand `NEXT_PUBLIC_WS_URL` est définie (handshake http +
  upgrade ws de socket.io).
- **TrueNAS SCALE = 2ᵉ VM VirtualBox** (NFS) sur le même PC : copie off-box optionnelle dans `backup.sh`
  (`PLANIT_BACKUP_OFFBOX_DIR`), échec off-box fatal (un mount tombé doit remonter dans `backup.log`), dump
  local conservé. Snapshots ZFS + rétention côté TrueNAS.
- **release-please** : action **épinglée au SHA** (`v4.4.1` → `5c625bf…`), manifest baseline **0.3.0** (dernier
  tag), n'agit qu'au LOT 7 (pas de push `main` avant).
- **Correctifs run réelle** : seulement les **vrais écarts repo** (export CA `--env-file`, `chown deploy` sur
  `.env.prod`/`cd.env`, bit `+x` sur les scripts prod via `git update-index --chmod=+x`, notes scp/Windows
  `curl.exe --ssl-no-revoke`). Les autres « erreurs » du log = oublis utilisateur / spécificités Windows.

## 3. Décisions soumises à validation

- **ADR-0015** (déviation hébergeur beta Railway → Neon+Koyeb+Vercel) — décision d'archi → ADR écrit.
- **0 dépendance npm ajoutée** (basic-auth hand-rolled, release-please = action GitHub).
- **`packages/contracts/` et `prisma/schema.prisma` non touchés.** Soft-lock posé/libéré sur `seed-data.ts`
  et `middleware.ts` (fichiers partagés).
- **5.9 branch protection** : toggle = **action admin GitHub (TL)** — livrable = checklist, pas de toggle agent.

## 4. Modifications

**PR 1 — correctifs run réelle** (commit `36f5cc9`) :

- `docs/runbooks/vm-self-host.md` (§3 chown env, §5 export CA `--env-file` + cert scp, §6 note Windows).
- bit `+x` sur `infra/prod/scripts/{cd-pull,backup,restore}.sh` (mode 100755).

**PR 2 — reste LOT 5** (commit `492b6cd`) :

- `docs/runbooks/local-setup-faq.md` (per-dev finalisé : migrate+seed, comptes seed, fix refs turbo/API_URL).
- `docs/runbooks/branch-protection.md` (neuf : noms exacts des status checks `ci.yml`/`security.yml`).
- `.github/workflows/release-please.yml`, `release-please-config.json`, `.release-please-manifest.json`.

**PR 3 — TrueNAS off-box** (commit `a06f22b`) :

- `infra/prod/scripts/backup.sh` (copie off-box optionnelle + rotation).
- `docs/runbooks/truenas-backup.md` (neuf), `incident-dr.md`, `vm-self-host.md`, spec `VAGUE-04-05` (§2/§3).

**PR 4 — beta cloud** (commit `c6dae5f`) :

- `docs/architecture/adr/0015-beta-cloud-neon-koyeb-vercel.md` (neuf).
- `apps/web/src/middleware.ts` (gate basic-auth beta), `apps/web/next.config.ts` (CSP WS prod).
- `apps/backend/prisma/seed-data.ts` (SEED_PASSWORD env).
- `.github/workflows/deploy-beta.yml` (neuf : migrate Neon → redeploy Koyeb → smoke, Environment beta).
- `docs/runbooks/beta-cloud.md` (neuf), `deploy.md` (cible 3), `docs/tech-debt.md` (TD-V04-BETA-EXTERNE résolu).

**Tests** : pas de nouveau test unitaire (basic-auth/CSP = beta-gated, non exercés en dev ni jsdom ;
seed = fallback 1 ligne défaut préservé, couvert par les tests d'intégration backend en CI).

## 5. Phase CHECK — résultats

- **Web** : `typecheck` ✓ · `lint` ✓ · `test` ✓ **92 passés** (warning `act()` pré-existant, non lié).
- **Backend** : `typecheck` ✓ (après fix bracket-notation env) · `lint` ✓. Tests d'intégration = CI (Postgres).
- Workflows : `deploy-beta.yml` + `release-please.yml` parse YAML ✓ · `release-please-config.json` JSON ✓.
- Scripts prod : `bash -n` ✓ · modes `100755` confirmés (`git ls-files -s`).
- Hooks commit (lint-staged prettier + commitlint) verts sur les 4 commits.
- ⚠️ Non validable ici (= côté Salim) : run réel beta Neon+Koyeb+Vercel, backup/snapshot/restore TrueNAS sur
  la 2ᵉ VM, toggle branch protection.

## 6. Surprises

- **Redis non utilisé au runtime** → simplifie nettement le beta (Postgres seul).
- **Risque Set-Cookie via rewrite Vercel** : à tester tôt (login bout-en-bout) — le passage des cookies d'auth
  à travers le rewrite Vercel → Koyeb n'est pas garanti sans vérification réelle.
- `COMMIT_PR4.txt` perdu entre sessions → message PR4 recréé à l'identique avant commit.

## 7. Suite (côté Salim)

1. **Beta cloud** : créer projets Neon / Koyeb / Vercel, wirer secrets (`NEON_DATABASE_URL`, token Koyeb),
   GitHub **Environment `beta`** + approbation, **tester le login bout-en-bout** (risque Set-Cookie).
2. **TrueNAS** : 2ᵉ VM SCALE, export NFS + mount `/etc/fstab`, `PLANIT_BACKUP_OFFBOX_DIR`, prouver
   backup off-box + snapshot ZFS + restore (VM PLANIT détruite).
3. **5.9** : toggler la branch protection `develop` + `main` selon `docs/runbooks/branch-protection.md`.
4. **Commit des statuts** `vagues/vague-04-lots.md` (repo stratégie, `master`) — laissé non commité par l'agent.
5. PRs `feat/salim` → `develop` ; **bascule `main` = LOT 7** (clôture), hors de ces PRs.

- Soft-locks libérés (`seed-data.ts`, `middleware.ts`).

## 8. Mises à jour annexes

- `docs/tech-debt.md` : `TD-V04-BETA-EXTERNE` **résolu** (Neon+Koyeb+Vercel).
- `vagues/vague-04-lots.md` (repo stratégie) : 5.3/5.4/5.5/5.6/5.7/5.8/5.10/5.12 `[x]` · 5.1/5.2/5.9/5.11 `[~]`
  · 5.1/5.2/5.11 re-scopés Railway → Neon+Koyeb+Vercel. **Non commité** (master).
- `docs/architecture/adr/` : **ADR-0015** ajouté (déviation hébergeur beta).
- CLAUDE.md (patterns déploiement/CI émergés) : reporté au **LOT 7.4** (clôture vague).
