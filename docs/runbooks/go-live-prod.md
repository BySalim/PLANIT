# Runbook — Go-live PRODUCTION réelle (Hetzner · planit.sn)

> **Cible 4** du déploiement (V04 LOT 8, **ADR-0017**). Production réelle pour un **go-live pilote**
> ISM. La prod = **2ᵉ instance de la machinerie VM** sur une box cloud, suivant `:main`. La VM
> on-prem reste le **staging** (`:staging`, ADR-0016).
>
> Ce runbook est la **checklist de mise en prod**. Procédures de base réutilisées :
> [vm-self-host.md](vm-self-host.md) (provision/CD), [deploy.md](deploy.md) (aiguillage),
> [incident-dr.md](incident-dr.md) (DR), [truenas-backup.md](truenas-backup.md) (backups).

## 0. Pré-requis (config manuelle — TL)

- Compte **Hetzner Cloud** + box **x86, 4 vCPU / 8 Go / 80 Go SSD, région eu-central** (gabarit CX32). Ubuntu Server 24.04 LTS. Clé SSH ajoutée.
- Domaine **`planit.sn`** acheté chez **Netim**, accès au panneau DNS.
- Accès GHCR en lecture (PAT `read:packages`) pour `docker login ghcr.io` (images privées).
- Outils sur la box (installés par Ansible / apt) : Docker + compose, `age`, `rclone`, `rsync`.

## 1. Provisionner la box (Ansible)

```
# inventaire : décommenter [planit_prod] dans infra/ansible/inventory.ini (IP réelle)
ansible-playbook -i infra/ansible/inventory.ini infra/ansible/site.yml -l planit_prod
```

Installe Docker + **durcissement OS** (firewall 22/80/443, SSH par clé, fail2ban, MAJ auto) + l'agent CD (`planit-cd.timer`). Cf. [vm-self-host.md](vm-self-host.md).

## 2. DNS (Netim)

- Enregistrement **A** `planit.sn` → IP publique de la box. (Optionnel : **A** `www` → même IP, ou redirection.)
- Vérifier la propagation : `dig +short planit.sn` doit retourner l'IP.
- ⚠️ Ports **80 et 443 ouverts** sur la box (firewall Ansible) — requis pour le challenge ACME Let's Encrypt.

## 3. Configuration prod (sur la box, hors repo)

`/opt/planit/.env.prod` (gabarit : [.env.prod.example](../../infra/prod/env/.env.prod.example)) :

```
IMAGE_TAG=main
PLANIT_DOMAIN=planit.sn
CADDY_TLS=admin@planit.sn          # → Let's Encrypt automatique
FRONTEND_URL=https://planit.sn
POSTGRES_PASSWORD / DATABASE_URL / JWT_ACCESS_SECRET / JWT_REFRESH_SECRET / MINIO_* …  # openssl rand -hex 32
```

`/opt/planit/cd.env` (gabarit : [cd.env.example](../../infra/prod/scripts/cd.env.example)) : `IMAGE_TAG=main` + variables de backup (§6).

## 4. Premier déploiement (CD pull-based sur `:main`)

1. `docker login ghcr.io -u <user> --password-stdin` (PAT `read:packages`).
2. Promotion `staging → main` (PR) → `build-images.yml` publie `:main` sur GHCR.
3. L'agent CD (`planit-cd.timer`) **poll `:main`** → `compose pull` → service `migrate` (`migrate deploy`, **prod sans seed**) → (re)démarre backend/web/caddy → **smoke** `https://planit.sn/api/health` → **auto-rollback** si KO. (Manuel : `sudo /opt/planit/src/infra/prod/scripts/cd-pull.sh`.)
4. **Vérifier le certificat TLS** : `curl -I https://planit.sn` → 200 + chaîne Let's Encrypt valide (pas de `-k`).

## 5. Bootstrap des comptes initiaux

Base prod **vide** → créer les 4 comptes cœur (1 RP + 1 AC + 1 enseignant + 1 étudiant). Identifiants dans un fichier **non commité** `/opt/planit/bootstrap.env` (mots de passe **forts**, ≥ 12 car., pas de valeur par défaut) :

```
BOOTSTRAP_RP_EMAIL=…   BOOTSTRAP_RP_NAME="…"   BOOTSTRAP_RP_PASSWORD=…
BOOTSTRAP_AC_EMAIL=…   BOOTSTRAP_AC_NAME="…"   BOOTSTRAP_AC_PASSWORD=…
BOOTSTRAP_ENS_EMAIL=…  BOOTSTRAP_ENS_NAME="…"  BOOTSTRAP_ENS_PASSWORD=…  BOOTSTRAP_ENS_SPECIALITE="…"
BOOTSTRAP_ETU_EMAIL=…  BOOTSTRAP_ETU_NAME="…"  BOOTSTRAP_ETU_PASSWORD=…  BOOTSTRAP_ETU_MATRICULE="…"
```

```
docker compose --env-file /opt/planit/.env.prod -f infra/docker-compose.prod.yml \
  run --rm --env-file /opt/planit/bootstrap.env backend node dist/scripts/bootstrap-prod.js
rm -f /opt/planit/bootstrap.env       # ← supprimer après usage
```

Idempotent (upsert par email). **Reset** d'un mot de passe oublié (pas d'email au pilote, TD-003) :

```
docker compose --env-file /opt/planit/.env.prod -f infra/docker-compose.prod.yml \
  run --rm -e RESET_EMAIL='…' -e RESET_PASSWORD='…' backend node dist/scripts/reset-password.js
```

## 6. Onboarding des données réelles (hybride)

Connecté en **RP** sur `https://planit.sn` :

1. Créer l'**année académique EN_COURS** (invariant : une seule EN_COURS).
2. Saisir le **référentiel** (faible volume, manuel) : filières → formations (année courante) → UE & modules → maquettes versionnées → salles.
3. Créer les **classes** (formation + capacité) et assigner les classes à l'AC.
4. **Inscrire les étudiants** via le flux existant (lookup email `GET /etudiants/lookup` + création mode « nouveau »), classe par classe → inscriptions année courante (gère double-diplôme). Pas d'import de masse (saisie manuelle, comme aujourd'hui).

## 7. Sauvegardes (2 cibles off-site)

Dans `/opt/planit/cd.env` : `PLANIT_BACKUP_AGE_RECIPIENT` (chiffrement), `PLANIT_BACKUP_OFFBOX_DIR` (TrueNAS NFS), **`PLANIT_BACKUP_CLOUD_REMOTE`** (rclone B2/R2), `PLANIT_BACKUP_PUSH_URL` (Uptime Kuma). Activer le timer de backup, puis **prouver une restauration** :

```
sudo /opt/planit/src/infra/prod/scripts/backup.sh                       # dump → age → off-box + cloud
sudo /opt/planit/src/infra/prod/scripts/restore.sh <dump.sql.gz[.age]>  # restauration testée
```

Cf. [truenas-backup.md](truenas-backup.md) + [incident-dr.md](incident-dr.md).

## 8. Observabilité (plancher go-live)

```
docker compose --env-file /opt/planit/.env.prod -f infra/docker-compose.prod.yml --profile observability up -d
```

- **Sentry** : créer le projet, poser `SENTRY_DSN` dans `.env.prod` (backend + Next SSR) **et** la variable repo GitHub `NEXT_PUBLIC_SENTRY_DSN` (build arg → rebuild image web). Tester une capture.
- **Uptime Kuma** (`127.0.0.1:3011` via `ssh -L`) : moniteur HTTP sur `http://backend:3001/api/health/ready` + un push monitor relié à `PLANIT_BACKUP_PUSH_URL` ; configurer un **canal d'alerte réel** (email/Telegram/WhatsApp).
- Prometheus + Grafana (golden-signals) déjà provisionnés (même profil).

## 9. Smoke go-live (à valider AVANT d'ouvrir au pilote)

- [ ] `https://planit.sn` en TLS valide (cert Let's Encrypt, pas de `-k`).
- [ ] Login des **4 rôles** (RP/AC/enseignant/étudiant) → vue nominale.
- [ ] `migrate deploy` appliqué, **aucune donnée de démo**.
- [ ] Référentiel pilote saisi + inscriptions étudiants OK (1 EN_COURS, double-diplôme) via l'UI existante.
- [ ] **Pages légales** accessibles (`/mentions-legales`, `/politique-confidentialite`) sans login.
- [ ] Backup → restore prouvé ; auto-rollback vérifié (forcer un smoke KO).
- [ ] Sentry reçoit un événement ; Uptime Kuma alerte sur `/api/health/ready`.

## 10. Pilote + rideau d'accès

- Périmètre = **1 filière/promo** réelle (accès = **compte provisionné**, pas d'inscription ouverte).
- Rideau supplémentaire optionnel le temps du pilote : `basic_auth` Caddy ou allowlist (cf. [beta-tunnel.md](beta-tunnel.md) pour le pattern basic-auth).
- **Critères de succès** (à figer avec le TL) : ex. publication d'un planning réel consulté par les étudiants, 0 incident bloquant sur N jours, retours utilisateurs collectés.
- **Élargissement** progressif aux autres promos une fois les critères atteints.

## 11. Rollback / continuité

- **Déploiement KO** : auto-rollback du CD (smoke échoué → digest précédent). Manuel : cf. [vm-self-host.md §9](vm-self-host.md).
- **Box détruite** : reprovision Ansible + `restore.sh` depuis TrueNAS **ou** cloud (B2/R2). RTO/RPO : [incident-dr.md](incident-dr.md).
- **Code** : `main` protégée → PR de revert (jamais de push direct), le CD redéploie le `:main` revenu en arrière.
