---
id: ADR-0015
titre: Beta self-host exposee via Cloudflare Tunnel (deviation Railway/Koyeb)
statut: ACCEPTE
date: 2026-06-08
auteur: salim
vague: 04
---

# ADR-0015 — Beta self-host exposee via Cloudflare Tunnel

> **Statut** : Accepte · **Date** : 2026-06-08 · **Vague** : 04 (LOT 5) · **Auteur** : Salim (Tech Lead)
>
> Devie ADR-0013 §1 (« Railway beta ») et §5 (« CD beta Railway »). Le reste d'ADR-0013 (images
> communes §2, Caddy §4, VM self-host, backups TrueNAS §7) reste en vigueur.

## Contexte

ADR-0013 prevoyait une beta sur **Railway** : l'essai a **expire** (plan payant). Une premiere revision
de cet ADR avait retenu **Neon + Koyeb + Vercel** — mais elle **n'a jamais ete deployee** : le free tier
**Koyeb est passe payant** a son tour. Constat : les free tiers PaaS persistants disparaissent en serie
(Railway -> Koyeb -> ...), et reconfigurer une cible a chaque fois coute du temps pour une garantie de
gratuite jamais tenue.

Deux faits du code (deja actes) gardent la beta simple :

1. **Redis est inerte au runtime** (`grep ioredis|bullmq|createClient` -> rien hors `env.validation` ;
   Socket.IO en instance unique sans adapter Redis).
2. **Les exports sont 100% client-side** (V3-D11) -> pas de stockage objet.

Surtout : **la VM self-host est deja livree et prouvee** (`docker-compose.prod` : web + api + Postgres +
Redis + MinIO + Caddy ; CD pull-based ; backups 2 niveaux). Plutot que relouer un host externe, on
**expose la stack VM existante**.

## Decision

La **beta publique** = la **VM self-host exposee sur Internet via Cloudflare Tunnel** (`cloudflared`).
**Aucun host loue** : Postgres, web et backend viennent de la VM.

- `cloudflared` (conteneur, **profil compose `tunnel`** opt-in) ouvre une connexion **sortante** vers
  Cloudflare : **aucun port entrant** ouvert sur la box / le routeur (aligne V4-D16, surface reduite).
- **Routage** : hostname public -> `https://caddy:443` (**No-TLS-Verify** car CA interne, **Host header
  = `PLANIT_DOMAIN`**). Caddy route `/api` -> backend, le reste -> web. **Same-origin** -> cookies
  first-party, CSP `'self'` : **aucune modif Caddy / backend / CSP** (le rewrite de Host n'affecte pas
  le scope cookie cote navigateur, qui reste le hostname public).
- **Rideau d'acces** = **Cloudflare Access** (gratuit, <= 50 users) sur le hostname : ne laisse passer
  que les emails autorises (couvre web **et** `/api` au bord). Fallback quick-tunnel sans domaine :
  **basic_auth Caddy**.
- **Comptes seed a mot de passe fort** : `SEED_PASSWORD` (env, non commite) au lieu de `Test1234!`
  (V4-D16). Dev/CI gardent le defaut.

## Alternatives considerees

- **Neon + Koyeb + Vercel** (revision precedente de cet ADR) : **abandonnee avant tout deploiement** —
  Koyeb passe payant. Trois dashboards + cookies cross-hebergeur en plus.
- **Render free** : drop-in conteneur, mais **spin-down ~15 min** (cold start ~50 s). Ecarte pour l'UX
  beta ; reste un **plan B** si la dispo domestique devient bloquante.
- **Google Cloud Run** : free tier genereux, mais setup GCP (compte + billing) et friction pour puller
  une **image GHCR privee**. Ecarte (complexite).
- **Fly.io** : usage-based avec **CB requise** -> risque de facturation. Ecarte (garantie gratuit).

## Consequences

### Positives

- **Gratuite durable** : fin de la roulette des free tiers PaaS.
- **Reutilise la stack VM deja prouvee** : une seule chaine d'images, un seul modele d'auth/CSP,
  **zero cookie cross-host** (vs le risque `Set-Cookie` du decoupage Vercel/Koyeb).
- **Aucun port entrant** (connexion sortante seule) -> surface d'attaque reduite.

### Negatives / risques

- **Dispo liee a la machine** : PC / VM eteint = beta down. Acceptable pour une beta academique.
- **URL stable = domaine gere par Cloudflare** (named tunnel). Sans domaine : quick tunnel a URL
  **ephemere** (`*.trycloudflare.com`), reserve aux demos courtes.
- **Realtime WS** : same-origin via le tunnel ; depend du build web (`NEXT_PUBLIC_WS_URL`) — tracage
  existant `TD-V04-WS-BUILDARG`.
- Bande passante / TLS au bord Cloudflare (gratuit ; limites d'usage raisonnables a l'echelle beta).

## Decision revisable quand

- Une vraie prod cloud (payante) est financee.
- Une dispo 24/7 independante du domicile devient bloquante -> Render / VPS / PaaS payant.
- Redis redevient actif (files BullMQ) -> cible avec Redis manage.

## References

- ADR-0013 (deploiement V04) — §1, §5 devies ; §2, §4, §6, §7 en vigueur.
- Runbook : `docs/runbooks/beta-tunnel.md` · Compose : service `cloudflared` (profil `tunnel`).
- Spec : `docs/specs/VAGUE-04-05-vm-self-host.md`
- Vague 04 : `../PLANIT-Strategie-VibeCode/vagues/vague-04-index.md`
