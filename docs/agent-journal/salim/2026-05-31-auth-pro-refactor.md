# Refonte pro du flux d'authentification (Next.js 15)

**Date** : 2026-05-31
**Branche** : `feat/salim`
**PR cible** : `develop` (avant la PR release `develop → main` — on ne release pas un login cassé)

## 1. Directives reçues

L'utilisateur signale 3 symptômes à l'usage : (1) chargement très long qui n'atteint jamais `/login`, (2) `/` qui tombe toujours sur `/login` même connecté, (3) après login avec les bons identifiants, retour sur `/login`. Demande explicite : **la manière pro actuelle** d'implémenter l'auth (non-auth → login, login OK → page demandée ou défaut) + revue des mauvaises pratiques.

## 2. Cause racine (diagnostic)

**La CSP introduite en PR #41 (Lighthouse) cassait l'app entière en DEV.** Le `script-src 'self' 'unsafe-inline'` (sans `'unsafe-eval'`) bloque l'exécution des modules client de Next dev (webpack `devtool: eval-source-map` enveloppe chaque module dans `eval()`). Conséquence : **React n'hydrate jamais** → aucun effet ni handler ne tourne → `RequireAuth` reste en spinner (« chargement infini »), le form login ne soumet rien (« reste sur login »). En **prod** (pas d'eval), la CSP passait → Lighthouse était vert, masquant le bug. Diagnostic confirmé via preview : `reactFiberOnBody: []` (pas de fiber attaché), `meCalls: 0`, `loginCalls: 0`, puis en-tête CSP servi sans `unsafe-eval`.

Au-delà du bug bloquant, revue archi : dev cross-origin (`API_BASE` absolu → :3001) alors que la **prod est same-origin** (Caddy proxifie `/api`) ; gating 100% client (pas de middleware) ; `/` en `redirect('/login')` serveur en dur ; pas de `returnUrl`.

## 3. Décisions techniques (autonomie, validées par l'utilisateur en amont)

- **CSP `'unsafe-eval'` en DEV uniquement** ([next.config.ts](../../../apps/web/next.config.ts)) : `isDev ? script-src …'unsafe-eval' : script-src …`. La CSP **prod reste stricte** (inchangée, telle que validée par Lighthouse). → corrige le bug racine.
- **Proxy same-origin en dev** (mirror prod Caddy) : `next.config.ts > rewrites()` proxifie `/api/:path*` → backend. `API_BASE` passe à `/api` (relatif). Cookies d'auth **first-party**, dev == prod, pas de CORS. WS conserve une URL absolue (`WS_URL`).
- **`middleware.ts`** (pattern Next 15, gating _optimiste_) : présence du cookie `access` → redirige non-auth vers `/login?returnUrl=…`, et `/login`+cookie vers la cible. Frontière de sécurité réelle = guards RBAC backend (le middleware est de l'UX). Le rôle reste enforce par `<RequireAuth>` (JWT opaque côté edge).
- **`returnUrl`** : helper partagé `safeReturnUrl` ([lib/return-url.ts](../../../apps/web/src/lib/return-url.ts), anti open-redirect) consommé par le middleware et `/login`. Restructuration `/login` en `<Suspense>` + `useSearchParams`.
- **`app/page.tsx`** : `redirect('/login')` serveur → résolveur client `useAuth()` → `ROLE_HOME[role]`.
- **AuthProvider robuste StrictMode** ([auth-context.tsx](../../../apps/web/src/contexts/auth-context.tsx)) : le chemin de succès ne dépend plus d'un flag `cancelled` muté par le cleanup (sous double-invoke StrictMode + proxy rapide, le 1er fetch résolvait après `cancelled=true` → dispatch skippé → bloqué en `loading`). Désormais tout fetch qui résout dispatche ; seuls les rejets `signal.aborted` sont ignorés.
- **Idle 15 min → re-login** : choix validé, pas de modif `cookies.ts` / ADR-0007.

## 4. Modifications

### Créés

- `apps/web/src/middleware.ts` — gating optimiste + returnUrl.
- `apps/web/src/lib/return-url.ts` — `safeReturnUrl` (anti open-redirect).
- `apps/web/src/lib/__tests__/return-url.test.ts` — 6 cas.
- `apps/web/public/favicon.ico` — (déjà via PR #41, rappel).

### Modifiés

- `apps/web/next.config.ts` — CSP `unsafe-eval` en dev + `rewrites()` proxy `/api`.
- `apps/web/src/lib/api.ts` — `API_BASE='/api'` (relatif) + `WS_URL` séparé.
- `apps/web/src/hooks/use-realtime-sessions.ts` — socket sur `WS_URL`.
- `apps/web/src/lib/dev-auth.ts` — fix double `/api` (stub mort, fix trivial).
- `apps/web/src/contexts/auth-context.tsx` — effet StrictMode-safe + commentaire corrigé.
- `apps/web/src/app/page.tsx` — résolveur role-home client.
- `apps/web/src/app/login/page.tsx` — Suspense + returnUrl.
- `CLAUDE.md` — pattern auth + piège CSP/eval dev.

## 5. Phase CHECK — résultats

- `pnpm --filter @planit/web typecheck` ✅
- `pnpm --filter @planit/web lint` ✅ (0 warning)
- `pnpm --filter @planit/web test` ✅ **42/42** (8 fichiers, +6 return-url)
- `pnpm --filter @planit/web build` ✅ (Middleware 33.7 kB enregistré, CSP prod stricte)
- **Smoke e2e navigateur** (preview dev + backend :3001 + Postgres) :
  - Non-auth `/rp` → `/login?returnUrl=%2Frp` ✅
  - Login via **form** → redirect `/rp`, dashboard RP rendu (vrai contenu) ✅
  - `meStatus 200`, hydration `true`, `loginCalls 1` ✅
  - Round-trip returnUrl : `/rp/enseignants` déconnecté → login → atterrit sur `/rp/enseignants` ✅
  - `/` connecté → role-home ; `/login` connecté → redirect ✅
  - Console **0 erreur** ✅

## 6. Surprises / blocages

- **Le vrai bug était la CSP, pas l'archi.** J'ai d'abord suspecté l'archi cross-origin/cookies. Le diagnostic preview (fiber absent, eval bloqué en dev) a révélé que la CSP `unsafe-inline` sans `unsafe-eval` tuait l'hydration dev. Leçon : **toujours tester une CSP en `next dev` ET `next start`** — le dev utilise eval, pas la prod ; un audit Lighthouse (prod) ne détecte pas la casse dev.
- **Race StrictMode + AbortController** révélée par le proxy (plus rapide) : le pattern `cancelled`-flag d'origine skippait le dispatch de succès. Corrigé.
- **`dev-auth.ts` / `dev-auth-provider.tsx` = code mort** (stub pré-LOT 6, plus importé). Fix du double `/api` appliqué, mais **suppression du stub (~140 lignes) flaggée séparément** (>20 lignes = décision sensible).

## 7. Suite

- Commit + PR `feat/salim → develop`. Après merge, **reprendre la PR release `develop → main`** (LOT 8 V.5) sur une base auth saine.
- Suppression du stub `dev-auth*` (tâche flaggée).
- WS prod (path socket.io via Caddy) : à valider au déploiement (hors V02).

## 8. Mises à jour annexes

- **CLAUDE.md** : pattern auth complété (middleware optimiste + proxy same-origin + returnUrl) + **piège CSP/eval dev** documenté.
- **ADR** : aucun (proxy dev = convention, pas de décision structurante ; proposable en ADR court si le TL le souhaite).
- **Tech-debt** : `TD-LH-CSP-NONCE` inchangé (le hardening nonce reste le chantier prod).
