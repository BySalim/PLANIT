# Runbook — Beta publique via Cloudflare Tunnel · V04 LOT 5.1/5.3/5.11

> Expose la **VM self-host** (déjà livrée, cf. [vm-self-host.md](vm-self-host.md)) sur Internet **sans
> ouvrir de port**, via **Cloudflare Tunnel** (ADR-0015). Pas de Neon/Koyeb/Vercel : tout vient de la
> VM. Rideau d'accès = **Cloudflare Access**.

## 0. Topologie

```
Navigateur ──https──▶ Cloudflare edge (Access : email autorisé)
                        │   tunnel (sortant — cloudflared sur la VM)
                        ▼
                      Caddy:443  (Host = PLANIT_DOMAIN, No-TLS-Verify)
                        ├── /api/* ─▶ backend:3001 ─▶ postgres
                        └── reste ──▶ web:3000
```

- `cloudflared` n'ouvre que des connexions **sortantes** → aucun port entrant (box/routeur inchangés).
- Tout est servi sous le **même hostname public** → cookies first-party, CSP `'self'`, **aucune modif
  applicative**.

## Prérequis

- VM self-host opérationnelle (cf. [deploy.md](deploy.md) cible 2) : `docker compose … up -d` OK,
  `https://planit.local/api/health` → 200.
- Compte **Cloudflare** (gratuit).
- **Chemin A (recommandé, URL stable)** : un **domaine géré par Cloudflare** (nameservers CF).
- **Chemin B (sans domaine)** : quick tunnel (`*.trycloudflare.com`, URL éphémère) — démos courtes.

---

## Chemin A — Named tunnel + Cloudflare Access (recommandé)

### 1. Créer le tunnel (dashboard CF)

Zero Trust → **Networks → Tunnels → Create a tunnel → Cloudflared** → nommer (`planit-beta`).
Copier le **token** affiché (`eyJ…`).

### 2. Lancer `cloudflared` sur la VM

Renseigner `CLOUDFLARE_TUNNEL_TOKEN` dans `infra/prod/env/.env.prod`, puis :

```bash
docker compose --env-file infra/prod/env/.env.prod -f infra/docker-compose.prod.yml \
  --profile tunnel up -d cloudflared
```

Le service `cloudflared` (profil `tunnel`, **opt-in**) rejoint le réseau de la stack et se connecte à CF.
Vérifier : `docker compose … logs cloudflared` → « Registered tunnel connection ».

### 3. Router le hostname public → Caddy (dashboard CF)

Dans le tunnel → **Public Hostname → Add** :

| Champ                         | Valeur                             |
| ----------------------------- | ---------------------------------- |
| Subdomain / Domain            | `beta.<ton-domaine>`               |
| Service                       | **HTTPS** → `caddy:443`            |
| Additional → No TLS Verify    | **ON** (CA interne Caddy)          |
| Additional → HTTP Host Header | `planit.local` (= `PLANIT_DOMAIN`) |

CF crée l'enregistrement DNS automatiquement. (Le Host header est indispensable : sinon Caddy ne matche
pas son site `{$PLANIT_DOMAIN}`.)

### 4. Rideau d'accès = Cloudflare Access

Zero Trust → **Access → Applications → Add (Self-hosted)** :

- Application domain : `beta.<ton-domaine>`
- Policy : **Allow**, selector **Emails** = liste des beta-testeurs (ou **Emails ending in** un domaine).

→ seuls les emails autorisés atteignent l'app (web **et** `/api`), **avant** la stack. C'est le rideau
« pas d'accès public » (5.3 / V4-D16). Ce **n'est pas** la frontière de sécurité : les guards JWT du
backend restent la frontière réelle.

### 5. Seed des comptes beta (mot de passe fort, V4-D16)

La prod n'auto-seed pas (ADR-0013 §3). Seeder **une fois** la base de la VM avec un mot de passe **fort
non commité** (l'image `migrate` = stage `build`, contient Prisma + le script de seed) :

```bash
docker compose --env-file infra/prod/env/.env.prod -f infra/docker-compose.prod.yml \
  run --rm -e SEED_PASSWORD='<MotDePasseFort!>' migrate pnpm --filter @planit/backend db:seed
```

Emails seed = dataset (cf. [local-setup-faq.md](local-setup-faq.md#comptes-de-connexion-après-dbseed)) ;
le **mot de passe** est `SEED_PASSWORD`, pas `Test1234!`. À distribuer en privé.

### 6. Test bout en bout

1. Ouvrir `https://beta.<ton-domaine>` → écran **Cloudflare Access** (email + code OTP).
2. Une fois passé : `/login` → se connecter avec un compte seed (`SEED_PASSWORD`).
3. Cookies : posés **host-only** sur `beta.<ton-domaine>` → le login tient (same-origin, pas de
   cross-host : c'est tout l'intérêt vs le découpage Vercel/Koyeb).
4. Realtime : publier une séance (RP) → réception côté autre rôle. Si bloqué → `TD-V04-WS-BUILDARG`
   (rebuild web avec `NEXT_PUBLIC_WS_URL=wss://beta.<ton-domaine>`).
5. `https://beta.<ton-domaine>/api/health` → `200` (derrière Access).

---

## Chemin B — Quick tunnel (sans domaine, éphémère)

Pour une démo rapide sans domaine, lancer un tunnel jetable (le réseau compose s'appelle
`planit-prod_default`) :

```bash
docker run --rm --network planit-prod_default cloudflare/cloudflared:latest \
  tunnel --url https://caddy:443 --no-tls-verify --http-host-header planit.local
```

→ affiche une URL `https://<aléatoire>.trycloudflare.com` qui **change à chaque lancement** (non stable).
**Pas de Cloudflare Access** sur un quick tunnel → activer un **`basic_auth` Caddy** comme rideau, ou ne
l'ouvrir que sur une **fenêtre courte**. Réservé aux démos ; pour tout usage réel → Chemin A.

---

## Pièges connus

- **Beta down si la VM/PC est éteint** : la disponibilité = celle de la machine (assumé, ADR-0015).
- **No TLS Verify + Host header `PLANIT_DOMAIN`** obligatoires, sinon Caddy ne matche pas son site.
- **Cloudflare Access ≠ sécurité backend** : c'est un rideau au bord ; les guards JWT (fail-closed)
  restent la frontière réelle.
- **Realtime WS** : same-origin via le tunnel ; dépend du build web → `TD-V04-WS-BUILDARG`.
- **`cloudflared` = profil `tunnel` opt-in** : le `up` par défaut **ne le démarre pas** (pas d'exposition
  accidentelle de la VM).

## Liens

- ADR-0015 : [`0015-beta-cloudflare-tunnel-vm.md`](../architecture/adr/0015-beta-cloudflare-tunnel-vm.md)
- VM self-host : [`vm-self-host.md`](vm-self-host.md) · Aiguillage : [`deploy.md`](deploy.md)
