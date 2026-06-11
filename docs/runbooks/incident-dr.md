# Runbook — Incident & Disaster Recovery · V04 LOT 5.10

> Reprise sur incident des cibles serveur **VM staging** et **prod réelle** (Hetzner, ADR-0017).
> Backups (`backup.sh`) : dump local + **off-box NFS TrueNAS** (snapshots ZFS) + **off-site cloud
> B2/R2** en prod (LOT 8.9), cf. [truenas-backup.md](truenas-backup.md). Voir aussi
> [vm-self-host.md](vm-self-host.md) et [go-live-prod.md](go-live-prod.md).

## Objectifs de reprise

| Indicateur                           | Cible  | Justification                                                                                                                              |
| ------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **RPO** (perte de données max)       | ≤ 24 h | Backup `pg_dump` quotidien (cron 02h) **copié off-box (NFS TrueNAS)** → survit à la perte de la VM. Réductible en augmentant la fréquence. |
| **RTO** (temps de remise en service) | ≤ 1 h  | Re-provisioning Ansible (~15 min) + restore dump (~5 min) + vérif.                                                                         |

## Arbre de décision

| Symptôme                        | Action                                                                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Un déploiement casse le service | L'agent CD a normalement **rollback** auto (smoke KO). Sinon → [rollback manuel](vm-self-host.md#9-rollback-manuel). |
| Backend `unhealthy` mais BD OK  | `docker compose logs backend` ; `restart backend` ; vérifier `.env.prod`.                                            |
| BD corrompue / données perdues  | **Restore** depuis le dernier dump (ci-dessous).                                                                     |
| VM détruite / disque perdu      | **Reprise complète** (ci-dessous).                                                                                   |
| Disque plein                    | Purger images : `docker image prune -af` ; vérifier rotation backups (`PLANIT_BACKUP_KEEP`).                         |

## Restauration BD (données perdues, VM intacte)

```bash
/opt/planit/src/infra/prod/scripts/restore.sh /opt/planit/backups/planit-<DATE>.sql.gz
curl -k --resolve planit.local:443:127.0.0.1 https://planit.local/api/health/ready
```

## Reprise complète (VM détruite)

1. Nouvelle VM Ubuntu 24.04 (cf. [vm-self-host.md §1-2](vm-self-host.md)) + Ansible.
2. Restaurer `.env.prod` (mêmes secrets — les garder hors-VM, ex. gestionnaire de mots de passe) et `cd.env`.
3. `docker compose ... up -d` (pull images GHCR + migrate).
4. Restaurer le dernier dump (`restore.sh`) — **récupéré de l'off-box NFS TrueNAS** (remonter le
   partage, cf. [truenas-backup.md §7](truenas-backup.md)). Si le mount courant est corrompu,
   restaurer un **snapshot ZFS** côté TrueNAS puis relire le dump depuis le clone.
5. Re-trust de la CA Caddy + hosts (cf. §5-6) ; vérifier `https://planit.local`.

> ⚠️ Le RPO dépend de la copie **off-box** des dumps. Avec TrueNAS (NFS + snapshots ZFS), elle est
> automatique à chaque `backup.sh` ; vérifier périodiquement que `backup.log` ne montre pas d'erreur
> off-box (mount tombé).

> **Prod réelle (box Hetzner détruite)** : même logique, mais (a) reprovision d'une **nouvelle box
> Hetzner** (Ansible, hôte `planit_prod`) ; (b) `.env.prod` avec `PLANIT_DOMAIN=planit.sn` +
> `CADDY_TLS=admin@planit.sn` → Caddy ré-émet le certificat Let's Encrypt automatiquement une fois le
> DNS re-pointé sur la nouvelle IP (Netim) ; (c) le dump se restaure depuis l'**off-site cloud**
> (`rclone copy <remote> .`) si le TrueNAS on-prem est injoignable. RTO un peu plus long (création de la box puis propagation DNS). Cf. [go-live-prod.md §11](go-live-prod.md).

## Modèle de postmortem (sans blâme)

```md
## Incident YYYY-MM-DD — <titre>

- Impact : <qui/quoi, durée>
- Détection : <comment / quand>
- Cause racine : <5 pourquoi>
- Résolution : <actions>
- Chronologie : <hh:mm …>
- Actions de suivi : <correctifs + tech-debt>
```
