---
id: ADR-0013
titre: Strategie de deploiement V04
statut: ACCEPTE
date: 2026-06-06
auteur: salim
vague: 04
---

# ADR-0013 — Strategie de deploiement V04

> **Statut** : Accepte · **Date** : 2026-06-06 · **Vague** : 04 (LOT 0.2) · **Auteur** : Salim (Tech Lead)
>
> **Revision 2026-06-08** — voir la note ci-dessous : les hebergeurs PaaS loues sont abandonnes ; la **VM self-host devient le serveur de reference rejouable** ; la beta reste la VM exposee via Cloudflare Tunnel ([ADR-0015](0015-beta-cloudflare-tunnel-vm.md)).

## Mise a jour 2026-06-08 — posture serveur : VM de reference, abandon des PaaS loues

Apres les difficultes repetees avec les **hebergeurs PaaS loues** (Railway expire ; Neon+Koyeb+Vercel jamais deploye, Koyeb passe payant), le Tech Lead arrete la **roulette des free tiers**. Decision :

- **La VM self-host (cible 3 d'origine) devient la cible serveur unique et de reference** : on la traite comme un **vrai serveur**, **rejouable a l'identique** sur un futur VPS en ligne (meme `docker-compose.prod.yml`, meme provisioning Ansible, memes scripts de backup). « Au moment voulu on bascule sur un serveur en ligne » = re-jouer Ansible sur la cible distante, sans rien reconcevoir.
- **Les choix de prod cloud (VPS Hetzner, etc.) sont mis en PAUSE** jusqu'a ce que la VM soit complete et stable. Aucun host loue n'est provisionne entre-temps.
- **La beta publique reste la VM exposee via Cloudflare Tunnel** ([ADR-0015](0015-beta-cloudflare-tunnel-vm.md)) — gratuite, sans port entrant. **Sans domaine pour l'instant** : on privilegie le **quick-tunnel** (`*.trycloudflare.com`, URL ephemere) protege par `basic_auth` Caddy ; le named tunnel + domaine reste disponible quand une URL stable sera voulue.
- **Consequence concrete sur cet ADR** : §1 (table « 3 cibles ») et §5 (« CD beta Railway ») **caducs pour la partie Railway** — deja remplaces par ADR-0015 (tunnel). La cible « beta = host loue » disparait. Les §2 (images communes), §3 (compose prod), §4 (Caddy), §6 (CD VM pull-based), §7 (backups TrueNAS) **restent en vigueur** et sont meme renforces : **observabilite** (P1-2, [ADR-0009](0009-observabilite-strategie.md)) et **sauvegarde durcie** (chiffrement + GFS + restore teste + alerte) sont desormais livres sur la VM, pour qu'elle soit reellement « prod-like » et rejouable.

> Le reste de l'ADR ci-dessous est conserve **tel quel** comme trace historique du raisonnement V04 ; lire a la lumiere de cette mise a jour.

## Contexte

PLANIT est demonstrable en local, mais n'a pas encore de chaine de deploiement complete. La Vague 04 doit rendre l'application deployable et controlable sans changer le perimetre produit : web Next.js + backend NestJS + packages runtime (`contracts`, `utils`) uniquement.

Les briques existantes sont :

- `infra/docker-compose.dev.yml` pour Postgres, Redis et MinIO en dev.
- Caddy dev placeholder.
- CI lint/typecheck/test/build + Lighthouse.
- Health backend (`/api/health`) et readiness (`/api/health/ready`).
- Gitflow `feat/* -> develop -> main`.

La vague doit couvrir 3 usages : poste de dev, beta externe, VM self-host prod-like. Le cloud Hetzner de production finale et l'audit securite complet restent differes.

## Decision

### 1. Trois cibles de deploiement

| Cible                  | Role                                                                | Source    |
| ---------------------- | ------------------------------------------------------------------- | --------- |
| Per-dev local          | Developpement quotidien : `docker-compose.dev` + `pnpm dev`         | poste dev |
| Railway beta           | Beta publique controlee pour testeurs externes                      | `develop` |
| VM self-host prod-like | Environnement on-prem proche prod, Docker Compose + Caddy + backups | `main`    |

Les apps `mobile` et `whatsapp-bot` sont hors V04.

### 2. Images Docker uniques pour web et backend

Les images `planit-web` et `planit-api` sont produites en CI puis reutilisees par Railway et par la VM. Elles suivent ces conventions :

- Docker multi-stage Alpine.
- Process non-root.
- Dev dependencies elaguees.
- Logs stdout/stderr.
- Healthcheck backend sur `/api/health`.
- Next.js en `output: 'standalone'` pour obtenir un serveur autonome.
- Tags GHCR :
  - `ghcr.io/bysalim/planit-web:<sha>`
  - `ghcr.io/bysalim/planit-api:<sha>`
  - tags d'environnement (`:develop`, `:main`) seulement comme pointeurs pratiques.

### 3. Docker Compose prod pour la VM

La VM self-host utilise `infra/docker-compose.prod.yml` avec :

- `web`
- `backend`
- `postgres`
- `redis`
- `minio`
- `caddy`

Le compose prod applique les migrations (`prisma migrate deploy`) mais ne lance aucun seed demo automatiquement. Le seed reste reserve au dev et a la beta controlee.

### 4. Caddy comme reverse proxy unique

Caddy reste le reverse proxy des environnements serveur :

- TLS automatique si domaine reel.
- CA interne possible pour la VM on-prem.
- `/api/*` et docs backend vers le backend.
- reste du trafic vers le web.

### 5. CD beta Railway depuis `develop`

Le workflow `deploy-beta.yml` construit/pousse les images, deploie Railway, lance un smoke post-deploiement puis rollback automatiquement si le smoke echoue. La beta est protegee par basic-auth et les comptes beta ne doivent pas utiliser de mot de passe par defaut committe.

### 6. CD VM pull-based depuis `main`

La VM ne recoit pas de runner GitHub auto-heberge. Elle execute un agent/cron sortant qui :

1. Verifie GHCR.
2. Detecte un nouveau digest `:main`.
3. Execute `docker compose pull`.
4. Applique `migrate deploy`.
5. Redemarre.
6. Lance un smoke.
7. Rollback automatiquement si le smoke echoue.

Ce choix evite d'executer du code de PR ou de fork sur la VM d'un repo public.

### 7. Backups hors-box vers TrueNAS

La VM pousse les dumps Postgres et donnees persistantes vers TrueNAS via NFS/SMB. La restauration doit etre testee et documentee dans V04 avant de considerer la cible VM comme validee.

### 8. Secrets et environnements

- `.env.prod` et inventaires reels restent ignores.
- `.env.prod.example` documente les variables attendues.
- GitHub Secrets porte les secrets CI/CD.
- Secrets Ansible via `ansible-vault`.
- Validation d'environnement fail-fast au boot pour les variables requises.

## Alternatives considerees

### Vercel + backend separe

Rejete pour V04 : bon pour Next.js, mais ne couvre pas simplement NestJS persistant + Redis + Postgres + images communes VM/Railway.

### Self-hosted runner GitHub sur la VM

Rejete : repo public + risque d'execution de code non approuve sur la machine. Le mode pull-based donne le meme resultat de CD pour `main`, avec une surface d'attaque plus faible.

### Jenkins

Rejete : serveur a maintenir, redondant avec GitHub Actions pour ce projet.

### Kubernetes

Rejete : surdimensionne pour une equipe de 5 et une stack compose unique.

## Consequences

### Positives

- Une seule chaine d'images pour beta et VM.
- Gitflow aligne avec les environnements : `develop` beta, `main` VM.
- Deploiement VM compatible NAT et repo public.
- Caddy et Docker Compose restent comprehensibles par toute l'equipe.

### Negatives

- Railway et VM auront des mecanismes CD differents.
- Le mode pull-based demande un petit agent/cron documente.
- La VM self-host ne fournit pas de haute disponibilite.

## Plan de mise en oeuvre

| Etape | Livrable                                           | Lot     |
| ----- | -------------------------------------------------- | ------- |
| A     | Dockerfiles web/backend + `.dockerignore`          | LOT 1   |
| B     | `infra/docker-compose.prod.yml` + `Caddyfile.prod` | LOT 1   |
| C     | `.env.prod.example` + validation env               | LOT 1   |
| D     | Workflow build/push images GHCR                    | LOT 1/5 |
| E     | Deploy Railway beta                                | LOT 5   |
| F     | Runbook VM self-host + backups TrueNAS             | LOT 5   |
| G     | Agent CD VM pull-based                             | LOT 5   |
| H     | Smoke 3 cibles + tag `v0.4.0`                      | LOT 7   |

## Decision revisable quand

- Une vraie prod cloud remplace la VM self-host.
- L'app mobile/WhatsApp entre dans le perimetre deploiement.
- Le besoin HA ou multi-tenant operationnel impose une orchestration plus lourde.

## References

- Vague 04 : `../PLANIT-Strategie-VibeCode/vagues/vague-04-index.md`
- Etat des lieux : `docs/runbooks/v04-etat-des-lieux.md`
- Conventions : `docs/runbooks/v04-conventions-qualite-infra.md`
- Observabilite : ADR-0009
