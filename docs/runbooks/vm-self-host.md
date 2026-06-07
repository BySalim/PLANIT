# Runbook — VM self-host (Local/LAN, TLS interne) · V04 LOT 5.4

> Cible : **Ubuntu Server 24.04** sous VirtualBox, accès **Local/LAN**, **HTTPS via CA interne
> Caddy**, domaine local `planit.local`. Déploiement continu **pull-based** depuis GHCR.
> Pas d'exposition Internet (cf. SPEC `docs/specs/VAGUE-04-05-vm-self-host.md`).

## 0. Prérequis

- VM Ubuntu Server 24.04 (2 vCPU / 4 Go RAM / 20 Go conseillés).
- Les images sont publiées sur GHCR par le workflow **Build & push images** (`.github/workflows/build-images.yml`) — vérifie qu'un run est passé sur `main` (packages `planit-api`, `planit-web`, `planit-migrate` visibles, **publics**).

## 1. Réseau VirtualBox (rendre la VM joignable)

**Adaptateur bridged (recommandé pour Local/LAN)** : VM éteinte → \*Configuration → Réseau → Mode d'accès réseau = **Accès par pont (bridged)\*** → carte = ton Wi-Fi/Ethernet hôte. La VM obtient une IP du routeur (joignable depuis le PC hôte **et** les autres appareils).

Démarre la VM, récupère son IP :

```bash
ip -4 addr show | grep inet        # ex. 192.168.1.50
```

> Repli si bridged impossible (Wi-Fi capricieux) : **réseau host-only** (`Configuration → Réseau`), la VM aura une IP type `192.168.56.x` joignable depuis le PC hôte uniquement.

## 2. Provisioning (Docker + durcissement) via Ansible

```bash
sudo apt-get update && sudo apt-get install -y ansible git
sudo git clone <repo-url> /opt/planit/src
cd /opt/planit/src/infra/ansible
ansible-galaxy collection install -r requirements.yml
cp inventory.example.ini inventory.ini
sudo ansible-playbook site.yml --connection=local
```

Installe Docker + compose, l'utilisateur `deploy`, ufw (22/80/443), fail2ban, MAJ auto, et l'agent CD (timer). Détails : [infra/ansible/README.md](../../infra/ansible/README.md).

## 3. Secrets & configuration (`.env.prod`)

```bash
sudo cp /opt/planit/src/infra/prod/env/.env.prod.example /opt/planit/.env.prod
sudo nano /opt/planit/.env.prod
```

À remplir impérativement :

```ini
IMAGE_TAG=main
POSTGRES_PASSWORD=<openssl rand -hex 24>
DATABASE_URL=postgresql://planit:<MEME_MOT_DE_PASSE>@postgres:5432/planit
JWT_ACCESS_SECRET=<openssl rand -hex 32>
JWT_REFRESH_SECRET=<openssl rand -hex 32 DIFFÉRENT>
MINIO_ROOT_PASSWORD=<openssl rand -hex 24>
PLANIT_DOMAIN=planit.local
CADDY_TLS=internal
FRONTEND_URL=https://planit.local
```

`chmod 600 /opt/planit/.env.prod`. Crée aussi `/opt/planit/cd.env` (lu par l'agent CD) :

```ini
IMAGE_TAG=main
PLANIT_DOMAIN=planit.local
```

## 4. Premier déploiement (pull, pas de build)

```bash
cd /opt/planit/src/infra
docker compose --env-file /opt/planit/.env.prod -f docker-compose.prod.yml pull
docker compose --env-file /opt/planit/.env.prod -f docker-compose.prod.yml up -d
docker compose --env-file /opt/planit/.env.prod -f docker-compose.prod.yml ps
```

`migrate` doit sortir en `exit 0`, `backend`/`web` en `healthy`.

## 5. HTTPS : faire confiance à la CA interne de Caddy

Caddy génère sa propre autorité racine. Exporte-la et installe-la sur le **PC hôte** :

```bash
# sur la VM
docker compose -f docker-compose.prod.yml cp \
  caddy:/data/caddy/pki/authorities/local/root.crt /opt/planit/planit-root.crt
```

Récupère `planit-root.crt` sur l'hôte (dossier partagé VirtualBox ou `scp`) puis :

- **Windows** : `certutil -addstore -f ROOT planit-root.crt` (PowerShell admin) — ou `certmgr.msc` → _Autorités de certification racines de confiance → Importer_.
- **Firefox** (magasin propre) : _Paramètres → Certificats → Autorités → Importer_.

## 6. Résolution du domaine `planit.local`

Sur le **PC hôte**, ajoute l'IP de la VM (étape 1) au fichier hosts :

- **Windows** : `C:\Windows\System32\drivers\etc\hosts` (éditer en admin) →
  ```
  192.168.1.50   planit.local
  ```

Teste : ouvre **https://planit.local** → l'app PLANIT (login), **cadenas valide** (cert de confiance). Vérif API : `https://planit.local/api/health` → `{"status":"ok"}`.

## 7. Déploiement continu (déjà armé par Ansible)

Le timer `planit-cd.timer` lance `cd-pull.sh` toutes les 5 min : poll GHCR `:main` → si nouvelle image → `pull` + `migrate` + `up` + **smoke** → **rollback** au digest précédent si le smoke échoue. Connexion **sortante seule**.

```bash
systemctl status planit-cd.timer
journalctl -u planit-cd.service --no-pager | tail -30
tail -f /opt/planit/cd.log
```

→ pousse un commit sur `main` ; après le run `build-images.yml`, la VM se met à jour seule au prochain tick.

## 8. Backups + restauration

Backup manuel : `sudo -u deploy /opt/planit/src/infra/prod/scripts/backup.sh` → `/opt/planit/backups/`.
Planifier (cron deploy, 02h) :

```cron
0 2 * * * /opt/planit/src/infra/prod/scripts/backup.sh >> /opt/planit/backup.log 2>&1
```

**Restauration testée** (à faire au moins une fois) :

```bash
/opt/planit/src/infra/prod/scripts/restore.sh /opt/planit/backups/planit-<DATE>.sql.gz
```

Procédure de reprise complète : [incident-dr.md](incident-dr.md).

## 9. Rollback manuel

```bash
docker image ls ghcr.io/bysalim/planit-api          # repère un tag/digest antérieur
docker tag <ID_PRECEDENT> ghcr.io/bysalim/planit-api:main
docker compose --env-file /opt/planit/.env.prod -f docker-compose.prod.yml up -d
```

## 10. Limites connues (Local/LAN)

- **WebSocket realtime** : `NEXT_PUBLIC_WS_URL` est _build-time_ ; l'image GHCR générique le laisse vide → le temps réel (`session:published`) peut nécessiter un build web dédié VM (tracé `TD-V04-WS-BUILDARG`).
- Pas d'accès Internet/externe (choix Local/LAN). Pour des testeurs distants : session ultérieure (Cloudflare Tunnel ou Railway payant).
- Backups locaux uniquement (pas de TrueNAS) — copie off-box manuelle conseillée (dossier partagé VirtualBox).
