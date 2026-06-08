# Runbook — Beta cloud (Neon + Koyeb + Vercel) · V04 LOT 5.1/5.3/5.11

> Cible **beta publique gratuite** (ADR-0015, déviation de Railway). Trois hébergeurs :
> **Neon** (Postgres), **Koyeb** (backend NestJS depuis l'image GHCR), **Vercel** (web Next.js).
> Pas de Redis (inerte), pas de MinIO (exports client-side). Accès derrière **basic-auth**.

## 0. Topologie

```
  Navigateur ──https──▶ Vercel (apps/web)
                          │  rewrite /api/* (cookies first-party)
                          ▼
                        Koyeb (planit-api, image GHCR) ──▶ Neon (Postgres)
  socket.io (wss) ───────────────────────────────────────▶ Koyeb (même backend)
```

- Le rideau **basic-auth** (`BETA_BASIC_AUTH`) protège tout le front Vercel, `/api` compris.
- Le **WebSocket** vise Koyeb **directement** (`NEXT_PUBLIC_WS_URL`), hors proxy — son origine est
  ajoutée à la CSP `connect-src` au build (cf. `apps/web/next.config.ts`).

---

## 1. Neon (Postgres managé)

1. Créer un projet Neon → récupérer la **connection string** :
   `postgresql://<user>:<pwd>@ep-xxx.<region>.aws.neon.tech/<db>?sslmode=require`.
2. La conserver pour : le secret GitHub **`NEON_DATABASE_URL`** (migrations CI) **et** la variable
   Koyeb **`DATABASE_URL`** (runtime backend). Même valeur.

> Les migrations sont appliquées par `deploy-beta.yml` (`prisma migrate deploy`), **pas** au boot du
> backend. Le **seed** est un geste manuel contrôlé (§5).

---

## 2. Koyeb (backend NestJS)

Créer un service **Docker** depuis l'image GHCR (la même que la VM) :

- **Image** : `ghcr.io/bysalim/planit-api:develop` (ou `:beta` si tu fais buildez ce tag).
- **Registry privé** : l'image GHCR est **privée** → renseigner les identifiants registre côté Koyeb
  (user `BySalim` + **PAT `read:packages`**, cf. [vm-self-host.md §3bis](vm-self-host.md)).
- **Port** : laisser Koyeb fournir `PORT` (le backend lit `process.env.PORT`). Health check **`/api/health`**.

Variables d'environnement Koyeb :

| Variable                             | Valeur                                           |
| ------------------------------------ | ------------------------------------------------ |
| `DATABASE_URL`                       | URL Neon (§1)                                    |
| `FRONTEND_URL`                       | `https://<domaine-vercel>` (CORS)                |
| `JWT_ACCESS_SECRET`                  | secret frais ≥ 32 chars (≠ dev/VM)               |
| `JWT_REFRESH_SECRET`                 | secret frais ≥ 32 chars, **différent**           |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | `900` / `604800`                                 |
| `NODE_ENV`                           | `production` (cookies `Secure`, throttle strict) |

> **Ni `REDIS_URL` ni MinIO** : non consommés au runtime (ADR-0015). Koyeb expose une URL publique
> `https://<app>.koyeb.app` → c'est `BACKEND_ORIGIN` côté Vercel et `BETA_SMOKE_URL` côté CI.

Récupérer aussi : un **token API Koyeb** + l'**id du service** (pour le redeploy CI, §4).

---

## 3. Vercel (web Next.js)

Importer le repo, **Root Directory = `apps/web`** (Vercel détecte pnpm + le workspace via
`outputFileTracingRoot`). Variables d'environnement (Production) :

| Variable             | Valeur                        | Rôle                                              |
| -------------------- | ----------------------------- | ------------------------------------------------- |
| `BACKEND_ORIGIN`     | `https://<app>.koyeb.app`     | cible du rewrite `/api/*` (cookies first-party)   |
| `NEXT_PUBLIC_WS_URL` | `https://<app>.koyeb.app/api` | socket.io + origine WS de la CSP (**build-time**) |
| `BETA_BASIC_AUTH`    | `beta:<mot-de-passe-fort>`    | rideau d'accès (`user:pass`)                      |

> ⚠️ `NEXT_PUBLIC_WS_URL` est **inliné au build** : le définir **avant** le build Vercel (sinon la
> CSP `connect-src` n'autorisera pas le WS et le realtime sera bloqué silencieusement).

---

## 4. Pipeline `deploy-beta.yml` + Environment GitHub `beta`

`Settings → Environments → New environment → beta`. Y mettre les **secrets scopés** (+ éventuel
**reviewer d'approbation**, 5.11) :

| Secret              | Valeur                                        |
| ------------------- | --------------------------------------------- |
| `NEON_DATABASE_URL` | URL Neon (§1)                                 |
| `KOYEB_TOKEN`       | token API Koyeb                               |
| `KOYEB_SERVICE_ID`  | id du service backend Koyeb                   |
| `BETA_SMOKE_URL`    | `https://<app>.koyeb.app` (base, sans `/api`) |

**Déclenchement** : pousser sur la branche **`beta`** (créée à partir de `develop`). Le workflow
([deploy-beta.yml](../../.github/workflows/deploy-beta.yml)) : `migrate deploy` Neon → redeploy Koyeb →
smoke `/api/health`. Dormant tant que `beta` n'existe pas.

---

## 5. Seed beta (comptes à mot de passe fort, V4-D16)

La prod n'auto-seed pas (ADR-0013 §3). Pour donner des comptes aux beta-testeurs, **seeder une fois**
Neon avec un mot de passe **fort non commité** (`SEED_PASSWORD`) — à distribuer en privé :

```bash
# Localement, contre Neon (depuis apps/backend) :
cd apps/backend
DATABASE_URL='<NEON_DATABASE_URL>' pnpm prisma migrate deploy   # si pas déjà fait par la CI
DATABASE_URL='<NEON_DATABASE_URL>' SEED_PASSWORD='<MotDePasseFort!>' pnpm db:seed
```

Les emails seed restent ceux du dataset (cf. [local-setup-faq.md](local-setup-faq.md#comptes-de-connexion-après-db:seed)),
mais le **mot de passe** est `SEED_PASSWORD`, pas `Test1234!`. Le re-seed est idempotent (upsert).

---

## 6. Test bout en bout (à faire **tôt** — risque principal)

1. Ouvrir `https://<domaine-vercel>` → le navigateur demande le **basic-auth** (`BETA_BASIC_AUTH`).
2. Une fois passé : page `/login`. Se connecter avec un compte seed (mot de passe `SEED_PASSWORD`).
3. **Vérifier que le cookie d'auth est posé** (DevTools → Application → Cookies sur le domaine Vercel) :
   c'est le point sensible — le `Set-Cookie` du backend Koyeb doit traverser le rewrite Vercel et
   devenir **first-party** sur le domaine Vercel (même modèle qu'en dev/VM). Si le login « ne tient
   pas » (retour /login en boucle) → inspecter le passage de `Set-Cookie` à travers le proxy.
4. Realtime : publier une séance (RP) → vérifier la réception côté autre rôle (WS vers Koyeb autorisé
   par la CSP). Si bloqué : vérifier `NEXT_PUBLIC_WS_URL` au build et la CSP `connect-src`.
5. Smoke direct backend : `curl https://<app>.koyeb.app/api/health` → `200` (pas de basic-auth sur
   l'URL Koyeb directe — elle est protégée par les guards JWT, pas par le rideau).

---

## 7. Pièges connus

- **Cookies cross-hébergeur** : géré par le rewrite `/api` Vercel → Koyeb (first-party). Ne **pas**
  pointer le front directement sur l'URL Koyeb en cross-origin (cookies fragiles). Cf. ADR-0015.
- **CSP `connect-src`** : seule l'origine de `NEXT_PUBLIC_WS_URL` est autorisée pour le WS, en plus de
  `'self'`. Un WS sur un autre hôte échouerait (volontaire).
- **Image GHCR privée** : Koyeb doit avoir les identifiants registre, sinon le pull échoue.
- **basic-auth ≠ sécurité backend** : l'URL Koyeb directe ne passe pas par le rideau ; sa protection
  réelle = guards JWT (fail-closed). Le rideau ne masque que le front beta.

## 8. Liens

- ADR-0015 (déviation Railway) : [`0015-beta-cloud-neon-koyeb-vercel.md`](../architecture/adr/0015-beta-cloud-neon-koyeb-vercel.md)
- Workflow : [`deploy-beta.yml`](../../.github/workflows/deploy-beta.yml) · Aiguillage : [`deploy.md`](deploy.md)
