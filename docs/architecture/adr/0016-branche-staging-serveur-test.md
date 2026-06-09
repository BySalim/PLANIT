---
id: ADR-0016
titre: Branche staging = serveur de test (VM self-host), flux feat→develop→staging→main
statut: ACCEPTE
date: 2026-06-09
auteur: salim
vague: 04
---

# ADR-0016 — Branche `staging` = serveur de test (VM self-host)

> **Statut** : Accepté · **Date** : 2026-06-09 · **Vague** : 04 · **Auteur** : Salim (Tech Lead)
>
> Raffine ADR-0013 (déploiement V04) et ADR-0015 (beta Cloudflare Tunnel). Le reste de ces ADR
> (images communes GHCR, Caddy, CD pull-based, backups, tunnel beta) reste en vigueur.

## Contexte

Jusqu'ici le flux était `feat/* → develop → main` (cf. ADR-0013, `branch-protection.md`), et la VM
self-host « prod-like » tirait le tag `:develop` (décision de test du LOT 5, log vm-self-host). Deux
problèmes :

1. **Pas d'étage de pré-prod stable** : `develop` bouge en continu (intégration équipe). Faire pointer
   la VM dessus mélange « intégration en cours » et « ce qu'on teste sérieusement avant release ».
2. **`main` = prod future** ne doit recevoir que du **déjà testé sur la VM**, et garder une porte de
   sortie pour les **correctifs urgents** sans repasser tout le cycle.

## Décision

On introduit une branche longue **`staging`** entre `develop` et `main`. Flux nominal :

```
feat/* → develop → staging → main          hotfix/* → main (urgence prod)
```

- **`staging`** est la **branche de test** : la **VM self-host est le serveur de test** et suit le tag
  d'image **`:staging`** (au lieu de `:develop`). Toute promotion `develop → staging` est donc validée
  sur la VM avant la release `staging → main`.
- **`develop`** reste l'intégration continue (cible de toutes les PR `feat/*`).
- **`main`** reste la prod stable : ne reçoit que des PR depuis **`staging`** ou **`hotfix/*`**.
- **`hotfix/*`** : correctif urgent prod → PR vers `main`, puis **re-merge dans `develop` + `staging`**
  (sinon le correctif régresse au prochain cycle de release). Création ponctuelle validée par le TL.

### Mise en œuvre

- **Images** : `build-images.yml` build/push désormais sur `push` de `develop`, **`staging`**, `main`
  (tag mouvant `:staging`). `cd-pull.sh` a pour défaut `IMAGE_TAG=staging` ; la VM le fixe dans
  `/opt/planit/cd.env`.
- **Guards CI de source** (status checks bloquants) :
  - `protect-staging.yml` → `require-source-staging` : PR vers `staging` depuis `develop` ou `hotfix/*`.
  - `protect-main.yml` → `require-source-main` (**renommé** depuis `require-develop`) : PR vers `main`
    depuis `staging` ou `hotfix/*`.
- **Branch protection** : `staging` protégée en miroir de `develop` (mêmes required checks CI) +
  `require-source-staging`. Sur `main`, le contexte requis passe de `require-develop` →
  `require-source-main` (cf. `branch-protection.md`). `main` conserve code-owner + `enforce_admins`.
- **CLAUDE.md** : commit direct refusé aussi sur `staging` ; `hotfix/*` autorisé seulement sur demande
  explicite du TL.

## Conséquences

- **+** Un étage de pré-prod stable, testé sur la VM, avant toute release `main`.
- **+** Voie rapide `hotfix/* → main` documentée (avec re-merge obligatoire).
- **−** Une étape de promotion supplémentaire (`develop → staging`) par cycle de release.
- **−** Le renommage `require-develop` → `require-source-main` impose de **mettre à jour la liste des
  required checks de `main`** (sinon une PR vers `main` reste bloquée « Waiting for require-develop »).
  Tracé dans `branch-protection.md` §1/§2.

## Alternatives écartées

- **Garder la VM sur `:develop`** : pas d'isolation pré-prod, la VM teste un état mouvant.
- **`staging` éphémère par release** : complexité de cycle de vie pour un bénéfice nul à 5 personnes.
- **`hotfix/* → staging` d'abord** : plus sûr mais trop lent pour une urgence prod (décision TL :
  `hotfix → main` direct, puis re-merge).
