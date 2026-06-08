---
id: ADR-0015
titre: Beta cloud Neon + Koyeb + Vercel (deviation Railway)
statut: ACCEPTE
date: 2026-06-08
auteur: salim
vague: 04
---

# ADR-0015 — Beta cloud Neon + Koyeb + Vercel (deviation Railway)

> **Statut** : Accepte · **Date** : 2026-06-08 · **Vague** : 04 (LOT 5) · **Auteur** : Salim (Tech Lead)
>
> Devie ADR-0013 §1 (ligne « Railway beta ») et §5 (« CD beta Railway »). Le reste d'ADR-0013
> (images communes, VM self-host, CD pull-based, backups TrueNAS §7) reste en vigueur.

## Contexte

ADR-0013 prevoyait une **beta publique sur Railway** depuis `develop`. L'essai Railway a **expire**
(plan payant requis) : la cible beta gratuite n'est plus tenable telle quelle. Il faut un hebergeur
**gratuit et durable** pour exposer une beta aux testeurs externes.

Deux constats issus du code changent les contraintes d'ADR-0013 :

1. **Redis est inerte au runtime.** Un `grep` `ioredis|bullmq|createClient` ne renvoie rien hors
   `env.validation` : aucune file BullMQ ni client Redis n'est consomme. Socket.IO tourne en memoire
   (instance unique) sans adapter Redis. → **pas besoin de Redis manage** pour la beta.
2. **Les exports sont 100% client-side** (V3-D11, `html-to-image` + `jspdf`). → **pas besoin de MinIO**
   ni de stockage objet pour la beta.

ADR-0013 avait **rejete** l'alternative « Vercel + backend separe » au motif qu'elle « ne couvre pas
simplement NestJS persistant + Redis + Postgres + images communes ». Les deux constats ci-dessus
**lèvent ce motif** : sans Redis ni stockage objet a couvrir, le decoupage redevient simple.

## Decision

La **beta cloud** est servie par **trois hebergeurs gratuits** :

| Brique          | Hebergeur  | Detail                                                                               |
| --------------- | ---------- | ------------------------------------------------------------------------------------ |
| Base de donnees | **Neon**   | Postgres manage gratuit (`sslmode=require`). Migrations via `prisma migrate deploy`. |
| Backend NestJS  | **Koyeb**  | Service Docker tirant l'**image GHCR `planit-api`** (la meme que la VM). Free tier.  |
| Web Next.js     | **Vercel** | Build depuis `apps/web`. Proxy `/api` (rewrite) vers Koyeb → cookies first-party.    |

- **Pas d'Upstash / Redis** (inerte). **Pas de MinIO** (exports client-side).
- **Acces beta protege** par un rideau **basic-auth** (`BETA_BASIC_AUTH`, middleware Vercel, couvre
  `/api`). Ce n'est pas la frontiere de securite (le backend Koyeb garde ses guards JWT) — juste un
  verrou « pas d'acces public » (5.3 / V4-D16).
- **Comptes seed a mot de passe fort** : `SEED_PASSWORD` (env, non commite) remplace `Test1234!` sur
  la beta (V4-D16). Dev/CI gardent le defaut.
- **Pipeline** `deploy-beta.yml` (branche `beta`, **Environment GitHub `beta`** = secrets scopes +
  approbation, 5.11) : `migrate deploy` Neon → **redeploy Koyeb** → **smoke** `/api/health`.

## Alternatives considerees

- **Railway Hobby payant** : rejete — on veut gratuit et durable (contrainte projet etudiant).
- **Cloudflare Tunnel sur la VM** : rejete pour la beta — expose la VM domestique en permanence et
  depend de sa disponibilite (PC eteint = beta down). Reste une option distincte de la VM LAN.
- **Tout sur Koyeb (web + backend + PG Koyeb)** : Koyeb sert bien le backend Docker, mais Vercel est
  nettement meilleur pour Next.js (build, CDN, previews) et Neon meilleur que le PG d'un free tier
  generaliste. Le decoupage joue sur les forces de chacun.
- **Fly.io / Render free** : equivalents ; Koyeb retenu pour son free tier Docker-GHCR direct et son
  redeploy par API token simple.

## Consequences

### Positives

- Beta **gratuite et durable**, sans materiel ni VM allumee.
- Le **backend reutilise l'image GHCR commune** `planit-api` (continuite avec ADR-0013 §2).
- Proxy `/api` Vercel → Koyeb : meme modele de cookies first-party qu'en dev/VM (Caddy) → un seul
  modele d'auth a raisonner.

### Negatives / risques

- **Trois dashboards** (Neon, Koyeb, Vercel) vs un seul Railway → plus de secrets a gerer (scopes dans
  l'Environment `beta`).
- **L'image web GHCR (`planit-web`) n'est pas reutilisee** pour la beta : Vercel build depuis la
  source. La « chaine d'images commune » d'ADR-0013 §2 ne vaut donc plus que pour le **backend** en beta
  (elle reste totale sur la VM).
- **Cookies cross-hebergeur** : l'auth depend du passage de `Set-Cookie` a travers le rewrite Vercel →
  Koyeb. **A tester tot, bout en bout** (login → `/api/me`). Risque principal de la cible.
- **Realtime** : Socket.IO en instance unique (sans Redis) — OK a l'echelle beta ; pas de scale-out.

## Decision revisable quand

- Une vraie prod cloud (payante) remplace la beta.
- Redis redevient actif au runtime (files BullMQ) → il faudra une cible avec Redis manage.
- Le besoin de previews/branches multiples sur le backend impose un autre hebergeur.

## References

- ADR-0013 (deploiement V04) — §1, §5 devies ; §2, §6, §7 en vigueur.
- Runbook : `docs/runbooks/beta-cloud.md` · Workflow : `.github/workflows/deploy-beta.yml`
- Spec : `docs/specs/VAGUE-04-05-vm-self-host.md`
- Vague 04 : `../PLANIT-Strategie-VibeCode/vagues/vague-04-index.md`
