# VAGUE-04-05 — CD & VM self-host (LOT 5, chemin on-prem)

> **Statut** : **En cours**. **Demandeur** : Salim (TL). **Branche** : `feat/salim` (base `develop`).
> **Cadre** : ADR-0013 (déploiement). **Pivot** : l'essai Railway a expiré (plan payant) → on réalise
> d'abord la **cible VM self-host** (gratuite), qui est aussi l'objectif réel du TL : « accéder au site
> hébergé sur ma machine, en HTTPS, depuis le LAN ».

## 1. Problème

Après LOT 1 (images + `docker-compose.prod.yml` + `Caddyfile.prod`), la stack tourne en smoke local mais
il n'existe **aucune chaîne de livraison** : pas de workflow qui publie les images, pas de procédure VM,
pas de déploiement continu, pas de backups/restore prouvés, pas de runbook incident.

## 2. Décision (cadrée par ADR-0013)

### Cible & accès

- **VM Ubuntu 24.04** sous VirtualBox, **accès Local/LAN uniquement**, **TLS via CA interne Caddy**
  (`CADDY_TLS=internal`, déjà supporté LOT 1). Domaine local `planit.local`. **Pas** d'exposition Internet.
- Réseau VirtualBox : **adaptateur bridged** recommandé (la VM obtient une IP LAN joignable depuis le PC
  hôte et les autres appareils du réseau) ; host-only en repli.

### Images & CD pull-based (V4-D13/D16)

- **`build-images.yml`** : la CI build + push `ghcr.io/bysalim/planit-{api,web}` (tags `:<branch>`, `:<sha>`,
  `:latest` sur main) sur push `develop`/`main` + `workflow_dispatch`. Images **publiques** (repo public).
- **Agent CD pull-based sur la VM** (`infra/prod/scripts/cd-pull.sh` + systemd `timer`) : connexion
  **sortante seule** → interroge GHCR, si nouveau digest `:main` → `compose pull` → `migrate deploy`
  (service one-shot LOT 1) → **smoke** `/api/health` → **auto-rollback** au digest précédent si échec.
  **Pas de runner self-hosted** (repo public → V4-D16).

### Provisioning (5.7)

- **Ansible** (`infra/ansible/`) exécutable **en `--connection=local` sur la VM** (pas besoin d'un control
  node séparé) : Docker CE + plugin compose, utilisateur `deploy`, **durcissement OS** (ufw 22/80/443,
  fail2ban, unattended-upgrades, SSH par clé), arbo `/opt/planit`, installe l'unité systemd du CD.

### Backups / DR (5.4/5.10)

- Backups Postgres `pg_dump` planifiés (cron/systemd) à **2 niveaux** : dump local `/opt/planit/backups`
  (rotation) **+ copie off-box NFS TrueNAS** (V4-D12) — TrueNAS SCALE en **2ᵉ VM VirtualBox**, dataset
  ZFS + partage NFS + **snapshots ZFS** avec rétention (cf. `docs/runbooks/truenas-backup.md`).
  **Restauration testée** documentée (local **et** off-box). Runbook **incident + DR** (RTO/RPO, restore, postmortem).

## 3. Non-objectifs (déférés)

- **Beta externe** (5.1, 5.3, 5.11, 5.12) → **réintégrée** via **Neon + Koyeb + Vercel** (ADR-0015,
  remplace Railway/essai expiré). Code/workflow/runbook livrés ; config dashboards = Salim.
- **TrueNAS off-box** (5.4 ZFS) → **réintégré en scope** (V4-D12) : TrueNAS est gratuit → monté en
  **2ᵉ VM VirtualBox** (NFS). Cf. §2 + `docs/runbooks/truenas-backup.md`. _(Initialement déféré faute
  de matériel — décision revue.)_
- **Branch protection bloquante** (5.9) → action **admin GitHub = TL** (recommandation fournie, pas appliquée par l'agent).
- Exposition Internet / domaine réel / Let's Encrypt → non retenu (choix Local/LAN).

## 4. Critères d'acceptation (Done partiel LOT 5, chemin VM)

1. `build-images.yml` publie les 2 images sur GHCR (vérifiable au 1ᵉʳ push).
2. Playbook Ansible installe Docker + durcissement sur une Ubuntu 24.04 fraîche (idempotent, `--check` propre).
3. Runbook VM : de la VM nue → `https://planit.local` joignable depuis le PC hôte, cert CA interne **fait confiance**.
4. Agent CD : un nouveau push `main` → la VM déploie automatiquement (poll) → smoke OK ; échec → rollback digest précédent.
5. Backup `pg_dump` planifié **et restauration prouvée** (procédure exécutée au moins une fois).
6. `deploy.md` réécrit (3 cibles, beta marqué différé) + runbook incident/DR.

## 5. Plan de tests

- **GHCR** : pousser la branche → vérifier les packages `planit-api`/`planit-web` dans GHCR.
- **Caddy interne** : `PLANIT_DOMAIN=planit.local CADDY_TLS=internal` → `curl --resolve planit.local:443:<IP> https://planit.local/api/health` 200 (cert interne).
- **CD agent** : simuler nouveau digest → `cd-pull.sh` pull+migrate+smoke ; forcer un smoke KO → vérifier rollback.
- **Backup/restore** : `backup.sh` → drop d'une table → `restore.sh` → données revenues.
