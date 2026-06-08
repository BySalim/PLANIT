# Journal — Vague 04 : pivot beta → Cloudflare Tunnel (ADR-0015 révisé)

> **Membre** : Salim (`feat/salim`) · **Date** : 2026-06-08 · **LOT** : Vague 04 — LOT 5 (beta) + ADR-0015

## 1. Directives reçues

« Koyeb est payant, quelle alternative ? » → après comparatif (Render / Cloudflare Tunnel / Cloud Run),
choix **Cloudflare Tunnel sur la VM**. Pivot appliqué **sur la PR #80** (encore ouverte) pour ne jamais
livrer la variante Koyeb sur `develop`.

## 2. Décisions techniques (autonomes)

- **Beta = VM self-host exposée via `cloudflared`** (connexion sortante seule, aucun port entrant).
  Routage : hostname public → `https://caddy:443` (**No-TLS-Verify** + **Host = `PLANIT_DOMAIN`**) →
  Caddy route `/api`/web. **Same-origin** → cookies host-only sur le domaine public, CSP `'self'` →
  **aucune modif Caddy / backend / CSP**.
- **Rideau d'accès = Cloudflare Access** (≤ 50 users) ; fallback quick-tunnel = `basic_auth` Caddy.
- **Service `cloudflared`** ajouté à `compose.prod` en **profil opt-in `tunnel`** (le `up` par défaut ne
  l'active pas → pas d'exposition accidentelle).
- **Revert pré-PR4** de `next.config.ts` (retrait `prodWsConnectSrc` → prod `connect-src 'self'`) et
  `middleware.ts` (retrait basic-auth + matcher `/api`) : sur la topo VM/Caddy, `/api` est servi par
  Caddy **hors** middleware Next → la prémisse « le middleware couvre `/api` » était fausse. Le rideau
  passe à CF Access. Effet de bord : supprime le fix Semgrep du scheme websocket non-TLS (sans objet).
- **Suppression `deploy-beta.yml`** (spécifique Neon/Koyeb) : la beta réutilise le **CD VM** (5.8), pas
  de deploy cloud séparé.
- ADR + runbook **renommés** (`…-cloudflare-tunnel-vm.md`, `beta-tunnel.md`). `SEED_PASSWORD` conservé.

## 3. Décisions soumises à validation

- **Choix hébergeur beta** = décision utilisateur (Cloudflare Tunnel) — actée via question.
- **ADR-0015 réécrit** (déviation Railway/Koyeb → Tunnel) — décision d'archi.
- **0 dépendance npm** (cloudflared = image Docker, hors `package.json`).
- **Reverts de code PR4** (middleware ~57 l.) + **suppression workflow** : code rendu obsolète par le
  pivot. `compose.prod` (infra partagée) : ajout d'un service **opt-in non bloquant**.

## 4. Modifications

**Renommés + réécrits** :

- `docs/architecture/adr/0015-beta-cloud-neon-koyeb-vercel.md` → `…-cloudflare-tunnel-vm.md`.
- `docs/runbooks/beta-cloud.md` → `beta-tunnel.md`.

**Modifiés** :

- `infra/docker-compose.prod.yml` (service `cloudflared`, profil `tunnel`).
- `apps/web/next.config.ts` + `apps/web/src/middleware.ts` (**revert** pré-PR4).
- `docs/runbooks/deploy.md` (cible 3), `vm-self-host.md` (§10), spec `VAGUE-04-05` (§3),
  `docs/tech-debt.md` (`TD-V04-BETA-EXTERNE`), `.env.prod.example` (`CLOUDFLARE_TUNNEL_TOKEN`),
  `justfile` (recette `deploy-beta`).

**Supprimés** : `.github/workflows/deploy-beta.yml`.

**Tests** : aucun ajout (changement infra/docs + reverts ; la CSP prod `'self'` est le comportement VM
déjà éprouvé). CI PR #80 rejoue lint/typecheck/test/e2e/sécu.

## 5. Phase CHECK — résultats

- `next.config.ts` / `middleware.ts` = versions **pré-PR4** (déjà vertes sur `develop`).
- `compose.prod` : service `cloudflared` valide (anchor logging, profil, depends_on caddy) — `docker
compose config` à confirmer dans le run CI.
- Semgrep : le littéral de scheme websocket non-TLS qui avait déclenché l'alerte a disparu (revert next.config).
- ⚠️ Non validable ici (= côté Salim) : tunnel réel + Cloudflare Access + login/realtime bout en bout.

## 6. Surprises

- **Koyeb free tier supprimé** → leçon : les free tiers PaaS persistants sont volatils ; exposer la VM
  déjà prouvée est plus robuste que relouer un host à chaque fois.
- Le **rewrite de Host** côté Caddy n'affecte **pas** le scope cookie navigateur (host-only sur le
  domaine public) → login same-origin OK, et **supprime le risque `Set-Cookie` cross-host** de la
  variante Koyeb (qui était le risque n°1 de l'ancienne cible).

## 7. Suite (côté Salim)

1. Domaine sur Cloudflare → named tunnel → `CLOUDFLARE_TUNNEL_TOKEN` → `--profile tunnel up -d cloudflared`.
2. Public hostname → `https://caddy:443` (No-TLS-Verify, Host=`planit.local`) + **Cloudflare Access** (emails).
3. Seed `SEED_PASSWORD` ; **test login + realtime** bout en bout.
4. **Merge PR #80** → `develop` quand CI verte.

## 8. Mises à jour annexes

- ADR-0015 (réécrit), runbook `beta-tunnel.md`, `compose.prod` (cloudflared).
- `tech-debt.md` : `TD-V04-BETA-EXTERNE` → tunnel. Realtime WS = `TD-V04-WS-BUILDARG` (inchangé).
- `vague-04-lots.md` (stratégie) : 5.1/5.2/5.11 re-scopés tunnel.
- CLAUDE.md (patterns déploiement) → **LOT 7.4**.
