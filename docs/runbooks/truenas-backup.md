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

1. **Local** : `pg_dump | gzip` → `/opt/planit/backups` (rotation `PLANIT_BACKUP_KEEP`).
2. **Off-box** : copie vers `PLANIT_BACKUP_OFFBOX_DIR` (= le mount NFS TrueNAS) + même rotation.
   Un échec off-box est **fatal** (le script `exit 1`) → l'absence de mount remonte dans `backup.log`.

> Pourquoi off-box : un dump qui vit **uniquement** sur le disque de la VM PLANIT disparaît avec
> elle (corruption disque, suppression de la VM). La copie NFS + les snapshots ZFS survivent.

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
- **Snapshot Lifetime (rétention)** : ex. **2 semaines** (aligné sur `PLANIT_BACKUP_KEEP=14`).
- Naming schema par défaut.

> Les snapshots ZFS sont quasi-gratuits (copy-on-write) : seuls les blocs modifiés coûtent. Une
> rétention de 2 semaines de dumps gzip est négligeable.

---

## 6. Brancher `backup.sh` sur l'off-box

Définir `PLANIT_BACKUP_OFFBOX_DIR` pour que `backup.sh` recopie vers le mount. Le plus simple :
l'ajouter à **`/opt/planit/cd.env`** (déjà sourcé par le script) :

```ini
PLANIT_BACKUP_OFFBOX_DIR=/mnt/truenas/planit-backups
```

(ou l'exporter dans la ligne cron). Test :

```bash
sudo -u deploy PLANIT_BACKUP_OFFBOX_DIR=/mnt/truenas/planit-backups \
  /opt/planit/src/infra/prod/scripts/backup.sh
# Attendu : "[backup] local OK …" puis "[backup] off-box OK. Dumps off-box : N"
```

Le cron 02h existant (cf. [vm-self-host.md §8](vm-self-host.md)) bascule alors automatiquement en
2 niveaux dès que la variable est présente dans `cd.env`.

---

## 7. Restauration depuis l'off-box (cas « VM PLANIT détruite »)

1. Recréer la VM PLANIT (Ansible + secrets, cf. [incident-dr.md](incident-dr.md) « Reprise complète »).
2. Remonter le NFS TrueNAS (§4) — les dumps sont là, **survivants** à la destruction de l'ancienne VM.
3. Restaurer le dernier dump depuis le mount :

   ```bash
   /opt/planit/src/infra/prod/scripts/restore.sh /mnt/truenas/planit-backups/planit-<DATE>.sql.gz
   curl -k --resolve planit.local:443:127.0.0.1 https://planit.local/api/health/ready
   ```

4. **Si le mount NFS courant a été corrompu** (ex. rotation ayant supprimé un fichier) : restaurer un
   **snapshot ZFS** côté TrueNAS (_Datasets → planit-backups → Snapshots → Clone/Rollback_) puis
   relire le dump voulu depuis le clone.

---

## 8. Vérification (Done off-box)

- [ ] `backup.sh` écrit bien dans `/mnt/truenas/planit-backups` (`[backup] off-box OK`).
- [ ] Un **snapshot ZFS** du dataset apparaît côté TrueNAS après le run planifié.
- [ ] **Restore depuis l'off-box** : drop d'une table → `restore.sh` depuis le mount → données revenues,
      `…/api/health/ready` OK.
- [ ] TrueNAS éteinte → la VM PLANIT boote quand même (`nofail`) et `backup.sh` loggue l'erreur off-box
      sans perdre le dump local.

---

## 9. Liens

- Script : [`infra/prod/scripts/backup.sh`](../../infra/prod/scripts/backup.sh) ·
  [`restore.sh`](../../infra/prod/scripts/restore.sh)
- VM self-host : [`vm-self-host.md`](vm-self-host.md) · Incident/DR : [`incident-dr.md`](incident-dr.md)
- Spec : [`VAGUE-04-05-vm-self-host.md`](../specs/VAGUE-04-05-vm-self-host.md) · ADR-0013 §7
