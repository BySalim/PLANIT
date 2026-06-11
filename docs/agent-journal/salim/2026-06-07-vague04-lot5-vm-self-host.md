# Journal — Vague 04 LOT 5 : CD & VM self-host (chemin on-prem)

> **Membre** : Salim (`feat/salim`) · **Date** : 2026-06-07 · **LOT** : Vague 04 — LOT 5 (chemin VM)

## 1. Directives reçues

« Réalisons ensemble le LOT 5 », focus **beta Railway** d'abord. En cours de route, **l'essai Railway
a expiré** (capture : « Trial Ended ») → pivot acté vers la cible **VM self-host** (gratuite, = objectif
réel du TL : site sur sa machine, HTTPS, accessible en LAN). Choix réseau : **Local/LAN, certif interne**.

## 2. Décisions techniques (autonomes)

- **Pivot Railway → VM self-host** : essai expiré (plan payant). Beta externe différé (écart ADR-0013 §7 tracé).
- **Caddy déjà paramétré** depuis LOT 1 (`{$PLANIT_DOMAIN}` + `tls {$CADDY_TLS:internal}`) → pour la VM
  il suffit de `PLANIT_DOMAIN=planit.local`. Aucune modif Caddyfile nécessaire.
- **Image `planit-migrate` publiée sur GHCR** : le service `migrate` n'avait qu'un `build:` (non pullable).
  Sur une VM pull-only il faudrait builder localement (lourd) → ajout d'une image GHCR (stage `build`) +
  `image:` au service. Optimisation slim tracée `TD-V04-IMG-SIZE`.
- **CD pull-based** (`cd-pull.sh` + systemd timer) : poll GHCR, compare les digests d'images, déploie si
  changement, smoke (`backend healthy` + `curl /api/health` via Caddy), **rollback déterministe** en
  re-taguant le digest précédent (toujours présent localement). Connexion **sortante seule** (V4-D16).
- **Ansible en `--connection=local`** sur la VM (pas de control node séparé — friction réduite pour 1 VM).
- **Backups locaux** (`pg_dump` + rotation) : TrueNAS absent chez le TL → dossier `/opt/planit/backups`
  (+ copie off-box manuelle recommandée). Restore destructif documenté + testable.
- **build-images.yml** : tags `:branch`/`:sha`/`:latest`, images **publiques** (repo public → pas d'auth
  registre côté VM, pas de plan Pro requis).

## 3. Décisions soumises à validation

- **Pivot vers VM self-host** (au lieu de Railway) — validé par le TL.
- **Aucune dépendance npm ajoutée.** Outils externes (Ansible, Caddy, Docker) hors package.json.
- **5.9 (branch protection bloquante)** = action admin GitHub → laissée au TL (recommandation fournie).

## 4. Modifications

**Créés** :

- `docs/specs/VAGUE-04-05-vm-self-host.md` (SPEC)
- `.github/workflows/build-images.yml` (build + push GHCR : api/web/migrate)
- `infra/ansible/` : `site.yml`, `inventory.example.ini`, `ansible.cfg`, `requirements.yml`, `README.md`
- `infra/prod/scripts/` : `cd-pull.sh`, `planit-cd.service`, `planit-cd.timer`, `backup.sh`, `restore.sh`
- `docs/runbooks/vm-self-host.md`, `docs/runbooks/incident-dr.md`

**Modifiés** :

- `infra/docker-compose.prod.yml` (service `migrate` : ajout `image: …/planit-migrate`)
- `docs/runbooks/deploy.md` (réécrit : 3 cibles, beta différé)
- `justfile` (recettes `deploy-vm`/`backup`/`restore`/`deploy-beta` → pointeurs runbook)
- `docs/shared-resources-lock.md` (lock posé puis libéré)

## 5. Phase CHECK — résultats

- `docker compose config -q` ✓ (service migrate avec image valide)
- `bash -n` ✓ sur `cd-pull.sh`, `backup.sh`, `restore.sh`
- YAML parse ✓ `build-images.yml`, `site.yml`
- **Smoke TLS local** (PLANIT_DOMAIN=planit.local, CA interne) : `https://planit.local/api/health` → **200**,
  `/` → 307 (auth), **HTTP→HTTPS 308**. → le mécanisme HTTPS + domaine local est prouvé.
- ⚠️ Non validé ici (= côté Salim sur la VM) : run Ansible sur Ubuntu réelle, cycle CD pull-based complet,
  backup/restore réel. Procédures écrites + testables via les runbooks.

## 6. Surprises

- Essai Railway expiré en plein milieu → pivot.
- Service `migrate` non pullable (build-only) → image GHCR dédiée.
- ECONNRESET réseau a fait échouer un `build migrate` isolé, mais `up` a quand même démarré la stack
  (image présente / rebuild au up) → backend Healthy. Flakiness réseau connue ([[docker-build-env-constraints]]).

## 7. Suite (côté Salim, sur la VM)

1. Pousser `feat/salim` → laisser tourner `build-images.yml` (images sur GHCR).
2. Suivre `docs/runbooks/vm-self-host.md` : réseau bridged → Ansible → `.env.prod` → `up` → trust CA → hosts.
3. Vérifier le CD pull-based + faire un backup/restore réel.

- Déférés : beta externe (`TD-V04-BETA-EXTERNE`), WS build-arg (`TD-V04-WS-BUILDARG`), branch protection (5.9, admin).
- Soft-locks libérés.

## 8. Mises à jour annexes

- `docs/tech-debt.md` : `TD-V04-BETA-EXTERNE`, `TD-V04-WS-BUILDARG` (+ migrate alimente `TD-V04-IMG-SIZE`).
- Statuts `vague-04-lots.md` : 5.6/5.10 `[x]`, 5.4/5.7/5.8 `[~]` (écrits, validation VM = Salim).
- CLAUDE.md (patterns CD/VM) : reporté au LOT 7.4.
