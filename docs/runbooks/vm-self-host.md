# Runbook — VM self-host (Local/LAN, TLS interne) · V04 LOT 5.4

> Cible : **Ubuntu Server 24.04** sous VirtualBox, accès **Local/LAN**, **HTTPS via CA interne
> Caddy**, domaine local `planit.local`. Déploiement continu **pull-based** depuis GHCR.
> Pas d'exposition Internet (cf. SPEC `docs/specs/VAGUE-04-05-vm-self-host.md`).

## 0. Prérequis

- VM Ubuntu Server 24.04 (2 vCPU / 4 Go RAM / 20 Go conseillés).
- Les images sont publiées sur GHCR par le workflow **Build & push images** (`.github/workflows/build-images.yml`) — un run doit être passé sur `develop` (packages `planit-api`, `planit-web`, `planit-migrate` présents). **Packages privés** : prévois un **fine-grained PAT GitHub à scope `read:packages` uniquement** (cf. §3bis) pour que la VM puisse les tirer.

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
IMAGE_TAG=develop
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
IMAGE_TAG=develop
PLANIT_DOMAIN=planit.local
```

> ⚠️ **Propriété des fichiers** : ces deux fichiers sont créés par `root` (sudo) alors que l'agent CD
> tourne en **`User=deploy`** (`planit-cd.service`). S'ils restent `root:root`, le CD ne peut pas les
> lire → déploiement continu KO. Donne-les à `deploy` (en gardant `600`) **après** les avoir édités :
>
> ```bash
> sudo chown deploy:deploy /opt/planit/.env.prod /opt/planit/cd.env
> sudo chmod 600 /opt/planit/.env.prod /opt/planit/cd.env
> ```

> 🔀 La VM suit **`develop`** pendant le développement de la Vague 04. La bascule sur **`main`** (release `develop → main` puis `IMAGE_TAG=develop` → `main` dans **`.env.prod` ET `cd.env`**, V4-D9 : `main` → VM) se fera **à la clôture de la vague (LOT 7)**.

## 3bis. Authentification GHCR (images privées)

Les packages GHCR sont **privés** → la VM doit s'authentifier pour les tirer (à faire **avant** le §4).

1. Crée un **fine-grained PAT** GitHub (_Settings → Developer settings → Personal access tokens → Fine-grained_) avec le **seul** scope **`read:packages`** (lecture seule). Note-le.
2. Login Docker **en tant qu'utilisateur `deploy`** (celui qui exécute le CD) — sinon l'agent ne verra pas le credential :

```bash
echo "<TON_PAT>" | sudo -u deploy docker login ghcr.io -u BySalim --password-stdin
```

Docker stocke le credential dans `/home/deploy/.docker/config.json` (**persistant**, survit aux reboots). `docker compose pull` et l'agent `cd-pull.sh` le réutilisent automatiquement — **aucune autre étape**.

> 🔁 **Rotation** : un fine-grained PAT expire (max 1 an). À l'expiration, le pull échoue et `cd-pull.sh` loggue un message explicite (« ÉCHEC AUTH GHCR … relancer docker login »). Relance simplement la commande ci-dessus avec un nouveau token.

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
# sur la VM — `--env-file` requis, sinon `docker compose cp` échoue sur les variables
# non résolues du compose (ex. « MINIO_ROOT_USER is missing a value »)
docker compose --env-file /opt/planit/.env.prod -f docker-compose.prod.yml cp \
  caddy:/data/caddy/pki/authorities/local/root.crt /opt/planit/planit-root.crt
```

> 📂 Le fichier exporté appartient à `root:root`. Pour le récupérer par `scp` (qui se connecte en
> `deploy`), copie-le d'abord dans le home de `deploy` et donne-lui la propriété :
>
> ```bash
> sudo cp /opt/planit/planit-root.crt /home/deploy/ \
>   && sudo chown deploy:deploy /home/deploy/planit-root.crt
> ```

Récupère `planit-root.crt` sur l'hôte (dossier partagé VirtualBox, ou
`scp deploy@<IP_VM>:/home/deploy/planit-root.crt .`) puis :

- **Windows** : `certutil -addstore -f ROOT planit-root.crt` (PowerShell admin) — ou `certmgr.msc` → _Autorités de certification racines de confiance → Importer_.
- **Firefox** (magasin propre) : _Paramètres → Certificats → Autorités → Importer_.

## 6. Résolution du domaine `planit.local`

Sur le **PC hôte**, ajoute l'IP de la VM (étape 1) au fichier hosts :

- **Windows** : `C:\Windows\System32\drivers\etc\hosts` (éditer en admin) →
  ```
  192.168.1.50   planit.local
  ```

Teste : ouvre **https://planit.local** → l'app PLANIT (login), **cadenas valide** (cert de confiance). Vérif API : `https://planit.local/api/health` → `{"status":"ok"}`.

> 🪟 **Vérif en ligne de commande Windows** : `curl.exe` passe par **Schannel**, qui tente une
> vérification de révocation (CRL/OCSP) que la CA interne Caddy n'expose pas → l'appel échoue même
> avec le certificat installé. Ajoute `--ssl-no-revoke` :
>
> ```powershell
> curl.exe --ssl-no-revoke https://planit.local/api/health
> ```

## 7. Déploiement continu (déjà armé par Ansible)

Le timer `planit-cd.timer` lance `cd-pull.sh` toutes les 5 min : poll GHCR sur le tag de `cd.env` (`:develop` ici, `:main` après bascule) → si nouvelle image → `pull` + `migrate` + `up` + **smoke** → **rollback** au digest précédent si le smoke échoue. Connexion **sortante seule** ; réutilise le `docker login` du §3bis.

```bash
systemctl status planit-cd.timer
journalctl -u planit-cd.service --no-pager | tail -30
tail -f /opt/planit/cd.log
```

→ pousse sur `develop` (ou `main` après bascule) ; après le run `build-images.yml`, la VM se met à jour seule au prochain tick.

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

**Copie off-box (recommandé)** : définir `PLANIT_BACKUP_OFFBOX_DIR` (mount NFS TrueNAS) pour que
`backup.sh` recopie chaque dump **hors de la VM** + snapshots ZFS — protège du cas « VM détruite ».
Mise en place : [truenas-backup.md](truenas-backup.md).

## 9. Rollback manuel

```bash
docker image ls ghcr.io/bysalim/planit-api          # repère un tag/digest antérieur
docker tag <ID_PRECEDENT> ghcr.io/bysalim/planit-api:main
docker compose --env-file /opt/planit/.env.prod -f docker-compose.prod.yml up -d
```

## 10. Limites connues (Local/LAN)

- **WebSocket realtime** : `NEXT_PUBLIC_WS_URL` est _build-time_ ; l'image GHCR générique le laisse vide → le temps réel (`session:published`) peut nécessiter un build web dédié VM (tracé `TD-V04-WS-BUILDARG`).
- Pas d'accès Internet/externe (choix Local/LAN). Pour des testeurs distants : session ultérieure (Cloudflare Tunnel ou Railway payant).
- _(Backups : résolu — 2 niveaux local + off-box NFS TrueNAS, cf. §8 et [truenas-backup.md](truenas-backup.md).)_
