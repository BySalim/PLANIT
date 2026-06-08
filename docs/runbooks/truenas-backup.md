# Runbook — Backup off-box TrueNAS (NFS) · V04 LOT 5.4 / V4-D12

> Réintègre la cible **off-box** des backups (écartée à tort faute de matériel) : TrueNAS est
> **gratuit**, on le fait tourner en **2ᵉ VM VirtualBox** sur le même PC que la VM PLANIT. Le
> `backup.sh` recopie chaque dump Postgres vers un **partage NFS** TrueNAS ; TrueNAS protège ces
> dumps par des **snapshots ZFS** avec rétention. Couvre le cas « VM PLANIT détruite ».

## 0. Topologie

```
   PC hôte (VirtualBox)
   ├── VM PLANIT  (Ubuntu 24.04)         ──NFS──▶  /mnt/truenas/planit-backups
   │     backup.sh : dump local + copie off-box                 (mount)
   └── VM TrueNAS (TrueNAS SCALE)
         pool ZFS ▸ dataset planit-backups ▸ partage NFS + snapshots ZFS
```

Deux niveaux de sauvegarde (cf. [`backup.sh`](../../infra/prod/scripts/backup.sh)) :

1. **Local** : `pg_dump | gzip` → **chiffré `age`** → `/opt/planit/backups` (rotation **GFS**), + sidecar `.sha256`.
2. **Off-box** : copie du dump chiffré + sidecar vers `PLANIT_BACKUP_OFFBOX_DIR` (= le mount NFS TrueNAS) + même rotation GFS.
   Un échec off-box est **fatal** (le script `exit 1`) → l'absence de mount remonte dans `backup.log` **et** déclenche l'alerte push (§6).

> Pourquoi off-box : un dump qui vit **uniquement** sur le disque de la VM PLANIT disparaît avec
> elle (corruption disque, suppression de la VM). La copie NFS + les snapshots ZFS survivent.
>
> Pourquoi **chiffré** : l'off-box (et a fortiori un futur off-box **cloud**) est hors de ton contrôle
> direct. Un dump `age` est inutile à qui n'a pas la **clé privée** — laquelle ne vit **jamais sur la VM**.

---

## 1. Créer la VM TrueNAS SCALE (VirtualBox)

- Télécharger l'ISO **TrueNAS SCALE** (Community Edition).
- Nouvelle VM : type _Linux / Other Linux (64-bit)_, **8 Go RAM** mini (ZFS aime la RAM), **2 vCPU**.
- Disques : **un disque système** (~16 Go) **+ un disque data** dédié (≥ 20 Go) pour le pool ZFS
  (ne jamais mettre le pool sur le disque de boot).
- Réseau : **même mode que la VM PLANIT** — _Accès par pont (bridged)_ de préférence, pour que les
  deux VMs soient sur le même sous-réseau LAN et se voient. (Host-only possible si les deux y sont.)
- Booter sur l'ISO, installer sur le disque système, redémarrer. Noter l'**IP TrueNAS** affichée à
  la console (ex. `192.168.1.60`) → interface web `https://192.168.1.60`.

---

## 2. Pool + dataset

Dans l'UI TrueNAS :

1. **Storage → Create Pool** : sélectionner le disque data (stripe simple suffit pour un homelab à
   1 disque), nommer le pool ex. `tank`.
2. **Datasets → Add Dataset** sous `tank` : nom `planit-backups`, preset **Generic**.

> On garde un dataset dédié pour pouvoir lui appliquer une **politique de snapshots propre** (§5)
> indépendante du reste du pool.

---

## 3. Service NFS + partage

### 3.1 Aligner les UID (écriture par `deploy`)

Le `backup.sh` tourne en **`deploy`** sur la VM PLANIT. Pour qu'il écrive sur le NFS, le plus simple
est d'aligner la **propriété du dataset** sur l'UID/GID de `deploy`.

```bash
# Sur la VM PLANIT :
id -u deploy   # ex. 1000
id -g deploy   # ex. 1000
```

Sur TrueNAS (**Datasets → planit-backups → Edit Permissions**, ou via _System Settings → Shell_) :

```bash
# Remplacer 1000:1000 par les valeurs relevées ci-dessus.
chown -R 1000:1000 /mnt/tank/planit-backups
chmod 770 /mnt/tank/planit-backups
```

### 3.2 Activer NFS et créer le partage

1. **Shares → Unix (NFS) Shares → Add** :
   - **Path** : `/mnt/tank/planit-backups`
   - **Networks / Hosts** : restreindre à l'**IP de la VM PLANIT** (ex. `192.168.1.50/32`) — seule
     elle doit pouvoir monter.
   - **Mapall User/Group** : laisser **vide** (pass-through : l'UID `deploy` du client est conservé,
     et il correspond au propriétaire du dataset §3.1).
     - _Fallback_ si l'alignement d'UID est impossible : mettre **Mapall User = root** et restreindre
       strictement par IP (moins propre — tout est écrit en root).
2. À l'invite, **activer le service NFS** (et le mettre en démarrage auto : _System → Services → NFS_).

---

## 4. Monter le partage sur la VM PLANIT

```bash
# Sur la VM PLANIT
sudo apt-get install -y nfs-common
sudo mkdir -p /mnt/truenas/planit-backups

# Test manuel (remplacer l'IP TrueNAS) :
sudo mount -t nfs 192.168.1.60:/mnt/tank/planit-backups /mnt/truenas/planit-backups
sudo -u deploy touch /mnt/truenas/planit-backups/.write-test && echo "écriture deploy OK" \
  && sudo -u deploy rm /mnt/truenas/planit-backups/.write-test
```

Persister via **`/etc/fstab`** (options robustes pour un mount réseau optionnel) :

```fstab
192.168.1.60:/mnt/tank/planit-backups  /mnt/truenas/planit-backups  nfs  _netdev,nofail,bg,vers=4,soft,timeo=30,retrans=3  0  0
```

> `nofail` + `_netdev` : si TrueNAS est éteinte, la VM PLANIT **boote quand même** (le mount est
> juste absent — `backup.sh` le détectera et loggera l'erreur off-box). `soft`+`timeo` : un NFS
> injoignable ne fait pas freezer le script indéfiniment.

`sudo mount -a` pour valider sans reboot.

---

## 5. Snapshots ZFS + rétention (côté TrueNAS)

La copie NFS donne une 2ᵉ localisation ; les **snapshots ZFS** donnent l'**historique** (et une
protection contre un `rm` accidentel propagé par la rotation du script).

**Data Protection → Periodic Snapshot Tasks → Add** :

- **Dataset** : `tank/planit-backups`
- **Schedule** : quotidien, ex. **03h00** (après le backup PLANIT de 02h).
- **Snapshot Lifetime (rétention)** : ex. **6 mois** (couvre la granularité mensuelle GFS — voir §6).
- Naming schema par défaut.

> Les snapshots ZFS sont quasi-gratuits (copy-on-write) : seuls les blocs modifiés coûtent. Une
> rétention de 2 semaines de dumps gzip est négligeable.

---

## 6. Configurer `backup.sh` (chiffrement, GFS, off-box, alerte)

Tout se pilote par des variables dans **`/opt/planit/cd.env`** (déjà sourcé par le script). Bloc complet :

```ini
# Off-box : le mount NFS TrueNAS (§4). Un échec ici est fatal → alerte.
PLANIT_BACKUP_OFFBOX_DIR=/mnt/truenas/planit-backups

# Chiffrement au repos (clé PUBLIQUE age — sans danger ici ; la privée reste hors box).
PLANIT_BACKUP_AGE_RECIPIENT=age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Rétention GFS (défauts si absents : 7 / 4 / 6).
PLANIT_BACKUP_KEEP_DAILY=7
PLANIT_BACKUP_KEEP_WEEKLY=4
PLANIT_BACKUP_KEEP_MONTHLY=6

# Alerte/heartbeat — Uptime Kuma « push monitor » (status=up/down auto). Optionnel.
PLANIT_BACKUP_PUSH_URL=https://<uptime-kuma>/api/push/<token>
```

### 6.1 Générer la clé `age` (une seule fois)

> ⚠️ La **clé privée ne doit JAMAIS rester sur la VM** (sinon une VM compromise déchiffre toutes les
> sauvegardes). On la génère ailleurs, on ne dépose que la **clé publique** dans `cd.env`.

```bash
# Sur ton POSTE (pas la VM) :
age-keygen -o planit-backup.key
# → "Public key: age1xxxx…"  ⇒ c'est PLANIT_BACKUP_AGE_RECIPIENT (cd.env de la VM)
# → planit-backup.key contient la clé PRIVÉE : range-la dans ton gestionnaire de
#   mots de passe / coffre hors-ligne. NE PAS la committer, NE PAS la mettre sur la VM.
```

Au moment d'une **restauration**, tu fourniras cette clé privée à `restore.sh` via
`PLANIT_BACKUP_AGE_IDENTITY=/chemin/planit-backup.key` (cf. §7).

### 6.2 Test manuel

```bash
sudo -u deploy /opt/planit/src/infra/prod/scripts/backup.sh
# Attendu : "[backup] chiffré (age) …" → "[backup] local OK … Empreinte: …"
#           → "[backup] rotation GFS locale OK …" → "[backup] off-box OK. Dumps off-box : N"
```

Le cron 02h (posé par Ansible, cf. [vm-self-host.md §8](vm-self-host.md)) applique alors les 2 niveaux
chiffrés à chaque nuit dès que les variables sont présentes dans `cd.env`.

---

## 7. Restauration depuis l'off-box (cas « VM PLANIT détruite »)

1. Recréer la VM PLANIT (Ansible + secrets, cf. [incident-dr.md](incident-dr.md) « Reprise complète »).
2. Remonter le NFS TrueNAS (§4) — les dumps sont là, **survivants** à la destruction de l'ancienne VM.
3. Restaurer le dernier dump depuis le mount (fournir la **clé privée age**, gardée hors box, §6.1) :

   ```bash
   PLANIT_BACKUP_AGE_IDENTITY=/chemin/planit-backup.key \
     /opt/planit/src/infra/prod/scripts/restore.sh \
     /mnt/truenas/planit-backups/planit-<DATE>.sql.gz.age
   # restore.sh vérifie le .sha256 puis déchiffre (age) avant de réinjecter.
   curl -k --resolve planit.local:443:127.0.0.1 https://planit.local/api/health/ready
   ```

4. **Si le mount NFS courant a été corrompu** (ex. rotation ayant supprimé un fichier) : restaurer un
   **snapshot ZFS** côté TrueNAS (_Datasets → planit-backups → Snapshots → Clone/Rollback_) puis
   relire le dump voulu depuis le clone.

---

## 8. Vérification (Done off-box)

- [ ] `backup.sh` produit un dump **chiffré** `planit-<DATE>.sql.gz.age` + sidecar `.sha256` (`[backup] chiffré (age) …`).
- [ ] `backup.sh` écrit bien dans `/mnt/truenas/planit-backups` (`[backup] off-box OK`).
- [ ] La **rotation GFS** conserve quotidien/hebdo/mensuel (vérifier après plusieurs jours).
- [ ] Un **snapshot ZFS** du dataset apparaît côté TrueNAS après le run planifié.
- [ ] **Drill de restauration tracé** (§8.1) : restore depuis l'off-box → `…/api/health/ready` OK.
- [ ] **Alerte** : un échec simulé (mount démonté) déclenche `status=down` côté Uptime Kuma.
- [ ] TrueNAS éteinte → la VM PLANIT boote quand même (`nofail`) et `backup.sh` loggue l'erreur off-box
      sans perdre le dump local.

### 8.1 Drill de restauration (à exécuter au moins une fois, puis trimestriel)

Un backup non testé n'est pas un backup. Procédure reproductible (non destructive si jouée sur une VM jetable ; sinon prévenir l'équipe) :

```bash
# 1. Repérer le dernier dump off-box
ls -1t /mnt/truenas/planit-backups/planit-*.sql.gz.age | head -1

# 2. (optionnel) marqueur de preuve : créer puis « perdre » une donnée témoin
#    -> ici on se contente de restaurer et de vérifier le compte de lignes d'une table.

# 3. Restaurer en mode non-interactif (drill) avec la clé privée hors-box
PLANIT_RESTORE_ASSUME_YES=1 \
PLANIT_BACKUP_AGE_IDENTITY=/chemin/planit-backup.key \
  /opt/planit/src/infra/prod/scripts/restore.sh \
  /mnt/truenas/planit-backups/planit-<DATE>.sql.gz.age

# 4. Vérifier la santé applicative
curl -k --resolve planit.local:443:127.0.0.1 https://planit.local/api/health/ready
```

> **Tracer le résultat** (date, dump utilisé, durée, RTO observé, OK/KO) dans
> [`incident-dr.md`](incident-dr.md) (section reprise) — c'est la preuve que le RPO/RTO tient.

---

## 9. Liens

- Script : [`infra/prod/scripts/backup.sh`](../../infra/prod/scripts/backup.sh) ·
  [`restore.sh`](../../infra/prod/scripts/restore.sh)
- VM self-host : [`vm-self-host.md`](vm-self-host.md) · Incident/DR : [`incident-dr.md`](incident-dr.md)
- Spec : [`VAGUE-04-05-vm-self-host.md`](../specs/VAGUE-04-05-vm-self-host.md) · ADR-0013 §7
