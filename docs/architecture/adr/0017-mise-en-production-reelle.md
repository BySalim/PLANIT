---
id: ADR-0017
titre: Mise en production réelle — Hetzner + planit.sn, CD :main, go-live pilote ISM
statut: ACCEPTE
date: 2026-06-11
auteur: salim
vague: 04
---

# ADR-0017 — Mise en production réelle (Hetzner + `planit.sn`)

> **Statut** : Accepté · **Date** : 2026-06-11 · **Vague** : 04 (LOT 8) · **Auteur** : Salim (Tech Lead)
>
> Lève le différé **V4-D1** (« Cloud prod Hetzner = différé »). Raffine ADR-0013 (déploiement V04),
> ADR-0015 (beta tunnel) et ADR-0016 (staging = serveur de test). Le reste de ces ADR (images
> communes GHCR, Caddy, CD pull-based, backups age+GFS+off-box) reste en vigueur.

## Contexte

V04 a livré un socle de déploiement « prod-like » mais a **explicitement différé** la prod réelle
(V4-D1). Ce qui tourne aujourd'hui : une **VM VirtualBox sur un poste** (`planit.local`, CA interne)
servant de **staging** (tag `:staging`, ADR-0016) + une **beta** exposée par **Cloudflare Tunnel** pour
≤50 testeurs (ADR-0015). Aucun de ces deux n'est une prod : la VM n'est pas always-on, le domaine est
interne, la beta est un rideau de test.

Le TL décide d'un **go-live pilote** à l'ISM (vraies données, vrais utilisateurs) → il faut un hôte
always-on, un domaine public réel, TLS public, et un onboarding des données réelles. Contrainte
structurante : **ne pas réinventer**. Le socle V04 (Dockerfiles, `docker-compose.prod.yml`, Ansible,
`cd-pull.sh`/`planit-cd.timer`, backups) est conçu pour être rejouable sur un autre hôte.

## Décision

La **production** = **2ᵉ instance de la machinerie de la VM**, sur un hôte cloud, paramétrée
différemment. La **VM reste le staging** (`:staging`) ; la **prod suit `:main`**.

| Axe                        | Décision                                                                                                                                                                                                                                                                                                                                  |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hôte**                   | **Hetzner Cloud**, gabarit x86 **4 vCPU / 8 Go / 80 Go SSD**, région **eu-central** (= CX32). Une seule box (app + profil `observability` + backups). Images CI `linux/amd64` → hôte x86 obligatoire (ARM/CAX exclus sans build multi-arch).                                                                                              |
| **Domaine**                | **`planit.sn`** (domaine dédié, registrar **Netim**).                                                                                                                                                                                                                                                                                     |
| **Exposition / TLS**       | **Caddy direct + Let's Encrypt** (ACME, ports 80/443). Pas de tunnel en prod. `PLANIT_DOMAIN=planit.sn`, `CADDY_TLS=admin@planit.sn`.                                                                                                                                                                                                     |
| **CD**                     | **Pull-based auto sur `:main`** (`cd-pull.sh` + `planit-cd.timer`, `IMAGE_TAG=main`). Garde-fou amont = branch protection + code-owner sur `main` (toute image `:main` est déjà revue). Connexion **sortante seule** (pas de runner, V4-D16).                                                                                             |
| **Comptes initiaux**       | Script de **bootstrap one-off** (`src/scripts/bootstrap-prod.ts`) → **1 RP + 1 AC + 1 enseignant + 1 étudiant** réels (mots de passe forts lus de l'env, non commités, upsert par email). **Pas d'écran admin** pour l'instant (différé → `TD-V04-ADMIN-PROVISIONING`). Reset de mot de passe = CLI (`reset-password.ts`), faute d'email. |
| **Onboarding données**     | **100 % manuel (UI V03)** : référentiel (filières/formations/UE/maquettes/salles) **et** étudiants saisis via l'interface existante (étudiants par le flux d'inscription email-first). **Pas d'import de masse** (retiré, décision TL).                                                                                                   |
| **Emails transactionnels** | **Différés** (TD-003 reste ouvert). Pas de reset self-service au go-live.                                                                                                                                                                                                                                                                 |
| **Sauvegardes**            | **Deux cibles off-site** : objet cloud **S3-compatible** (Backblaze B2 / Cloudflare R2, via rclone) **et** TrueNAS (NFS). Dump chiffré age + GFS (existant). Restauration prouvée.                                                                                                                                                        |
| **Observabilité**          | Plancher : **Sentry** (DSN réel ; câblage déjà présent, dormant) + **Uptime Kuma** + alerte sur `/api/health/ready` & échec backup. Prometheus/Grafana déjà provisionnés (profil `observability`).                                                                                                                                        |
| **Bascule**                | **Pilote progressif** : 1 filière/promo réelle d'abord, rideau d'accès initial, élargissement ensuite.                                                                                                                                                                                                                                    |
| **Légal**                  | **Mentions légales + politique de confidentialité** (esprit RGPD + **CDP Sénégal**, loi 2008-12), rédigées avec **nuance sur la propriété** (la solution n'est pas présentée comme propriété de l'ISM ni le contraire).                                                                                                                   |

### Mise en œuvre

Détail des tâches dans `../../../PLANIT-Strategie-VibeCode/vagues/vague-04-lots.md` (LOT 8, 8.1→8.13).
La **config réelle** (création de la box, DNS Netim, secrets `.env.prod`, projet Sentry, bucket cloud,
installation systemd, saisie des données) est **opérée manuellement par le TL**. Le code/artefacts
(bootstrap, pages légales, extension backup cloud, runbooks, hôte Ansible `prod`)
sont livrés par le LOT.

## Conséquences

- **+** Une vraie prod always-on, domaine public, TLS public, sur la **même chaîne** que staging (un seul `docker-compose.prod` + une seule image par service).
- **+** Promotion `staging → main` = promotion VM → prod, déjà gardée (ADR-0016 + branch protection).
- **−** **Box unique = SPOF** (pas de HA — cohérent avec V04 qui exclut autoscaling/multi-nœud). Mitigé par backups off-site doubles + restauration prouvée + auto-rollback du CD.
- **−** **Latence** : Hetzner eu-central (Allemagne) → Dakar ≈ 150-200 ms (Hetzner n'a pas de région Afrique). Acceptable pour une app de planning (pas de temps réel critique).
- **−** **Pas de reset self-service** au go-live (emails différés) : un mot de passe oublié = reset manuel par CLI. Borné au pilote.
- **−** **Données personnelles réelles** en prod → impose les pages légales + le chiffrement des backups (age, déjà en place) avant le go-live.

## Alternatives écartées

- **Serveur on-prem ISM** : dépend de l'IT/électricité/réseau de l'école ; un cloud VPS est plus fiable et neutre vis-à-vis de la propriété du projet.
- **Promouvoir la VM VirtualBox** : pas always-on, fragile (poste de dev) — inadapté à de vrais utilisateurs.
- **Cloudflare Tunnel en prod** : ajoute une dépendance + un coude réseau ; en prod on assume une IP publique + Caddy/LE standard. Le tunnel reste pour la beta (staging).
- **CD prod sur tag de release `vX.Y.Z`** : plus contrôlé, mais `:main` est déjà gardé par branch protection + code-owner ; on garde la machinerie telle quelle (option ré-ouvrable si le rythme l'exige).
- **Écran admin de provisioning maintenant** : surface à sécuriser pour un besoin que le bootstrap one-off couvre au pilote. Différé (« après on verra »).
- **Import de masse des étudiants** : écarté (décision TL, 2026-06-11) — les étudiants sont saisis manuellement via le flux d'inscription existant (V03, email-first), suffisant au pilote. Évite une dépendance de parsing (CSV/XLSX).
