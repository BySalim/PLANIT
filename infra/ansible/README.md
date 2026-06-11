# Ansible — provisioning VM self-host (V04 LOT 5.7)

Provisionne et durcit une **Ubuntu Server 24.04** pour héberger la stack PLANIT :
Docker CE + compose, utilisateur `deploy`, pare-feu (ufw), fail2ban, MAJ auto, et
l'agent CD pull-based (systemd timer). **Idempotent.**

## Exécution (sur la VM elle-même, recommandé)

```bash
sudo apt-get update && sudo apt-get install -y ansible git
sudo git clone <repo-url> /opt/planit/src
cd /opt/planit/src/infra/ansible
ansible-galaxy collection install -r requirements.yml
cp inventory.example.ini inventory.ini
sudo ansible-playbook site.yml --connection=local      # ajouter --check pour un essai à blanc
```

## Variables utiles (`-e`)

| Variable                      | Défaut        | Rôle                                                             |
| ----------------------------- | ------------- | ---------------------------------------------------------------- |
| `deploy_user`                 | `deploy`      | Utilisateur applicatif (groupe docker)                           |
| `app_dir`                     | `/opt/planit` | Racine appli + backups                                           |
| `harden_ssh_disable_password` | `false`       | Passe à `true` **après** avoir validé ta clé SSH (sinon lockout) |

## Ce que le playbook NE fait pas (volontaire)

- Copier `.env.prod` (secrets) → manuel, cf. [runbook VM](../../docs/runbooks/vm-self-host.md).
- Configurer le réseau VirtualBox (bridged/host-only) → manuel, cf. runbook.
- TrueNAS → absent du périmètre TL (backups locaux, cf. `backup.sh`).
