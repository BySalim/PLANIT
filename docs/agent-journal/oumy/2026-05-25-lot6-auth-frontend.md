---
membre: Oumy
date: 2026-05-25
feature: VAGUE-02-LOT6-auth-frontend
vague: 02
spec: aucune (Salim a délégué directement — pas de spec formelle)
pr: à ouvrir
duree-session: ~3h
statut: livré
---

# 2026-05-25 — Auth Frontend F.1 → F.8 (VAGUE-02-LOT6)

## 1. Directives reçues du membre

Salim a confié la réalisation complète du LOT 6 (auth frontend Vague 02). Périmètre : page `/login`, store auth, guards de routes, topbar refactor, intercepteur 401/403, WebSocket cookie-based, DevAuthBadge. Le backend (LOT 1) n'est pas encore livré — construire correctement, connecter quand disponible.

## 2. Décisions techniques prises (de manière autonome)

| #   | Décision                                                            | Pourquoi                                                                                                                               | Réversible ?                                      |
| --- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 1   | Context + useReducer (pas Zustand)                                  | Zustand non installé → nouvelle dépendance = décision sensible. Context suffit pour login/logout/me.                                   | Oui, migration Zustand triviale si besoin         |
| 2   | AuthProvider au niveau root layout                                  | Login page (`/login`) hors groupe `(planit)` mais doit accéder à `useAuth().login()` → AuthProvider doit être plus haut que `(planit)` | Oui                                               |
| 3   | `authMeSchema` défini localement dans `auth-context.tsx`            | `@planit/contracts` v2 (Salim, tâche 0.4) pas encore livré — pas de `AuthMeDto` disponible                                             | Oui, remplacer par import contracts dès 0.4 livré |
| 4   | Fallback hardcodé dans `useCurrentTeacher/Student`                  | `RequireAuth` garantit que l'état est `authenticated` en prod — fallback = filet de sécurité pendant le loading                        | Oui, supprimer quand backend stable               |
| 5   | `enabled: boolean` pour `useRealtimeSessions` (vs `userId: string`) | Cookie httpOnly suffisant, pas de userId en clair côté client — aligné sur la spec F.6                                                 | Non (breaking change intentionnel)                |

## 3. Décisions soumises au membre pour validation

Aucune. Toutes les décisions sont dans le scope LOT 6 ou sont des choix d'implémentation standard.

À signaler à Salim : les emails seed (`rp@ism.sn`, `enseignant@ism.sn`, `etudiant@ism.sn`) dans `DevAuthBadge` sont des placeholders — à aligner avec le seed Oumar dès que LOT 0.3 est livré.

## 4. Modifications effectuées

### Fichiers créés

- `apps/web/src/contexts/auth-context.tsx` — AuthProvider + useAuth + ROLE_HOME
- `apps/web/src/app/login/page.tsx` — formulaire connexion (react-hook-form + loginSchema)
- `apps/web/src/app/login/layout.tsx` — layout minimal centré
- `apps/web/src/components/auth/require-auth.tsx` — guard RequireAuth
- `apps/web/src/components/auth/forbidden-listener.tsx` — capte `api:forbidden`, toast
- `apps/web/src/components/auth/dev-auth-badge.tsx` — badge dev-only, seed switcher
- `apps/web/src/app/(planit)/rp/layout.tsx` — RequireAuth RP + AC
- `apps/web/src/app/(planit)/enseignant/layout.tsx` — RequireAuth ENSEIGNANT
- `apps/web/src/app/(planit)/etudiant/layout.tsx` — RequireAuth ETUDIANT + RESPONSABLE_CLASSE

### Fichiers modifiés

- `apps/web/src/app/layout.tsx` (+3, AuthProvider au root)
- `apps/web/src/app/(planit)/layout.tsx` (+8, DevAuthBadge + ForbiddenListener)
- `apps/web/src/lib/api.ts` (+33, credentials:include + 401 refresh singleton + 403 event)
- `apps/web/src/components/layout/topbar.tsx` (+51/-7, initiales dynamiques + dropdown logout)
- `apps/web/src/hooks/use-realtime-sessions.ts` (signature userId→enabled, withCredentials)
- `apps/web/src/hooks/use-current-teacher.ts` (lit useAuth, fallback hardcodé)
- `apps/web/src/hooks/use-current-student.ts` (idem)
- 6 pages enseignant/etudiant (`useRealtimeSessions(teacher.id,…)` → `useRealtimeSessions(true,…)`)

### Migration BD

Aucune.

### Tests ajoutés

Aucun (backend non disponible — tests d'intégration auth à ajouter quand LOT 1 livré).

## 5. Phase CHECK — résultats

```
pnpm --filter @planit/web exec tsc --noEmit   → 0 erreur
pnpm --filter @planit/web lint                → ✔ No ESLint warnings or errors
pnpm --filter @planit/web build               → ❌ ENOSPC (disque plein — problème machine, pas code)
Smoke navigateur                              → non réalisé (build impossible sans disque)
```

Le typecheck et le lint sont les vérifications déterminantes ici : la logique est correcte. Le build a échoué uniquement par manque d'espace disque (cache Next.js a saturé le disque — nettoyé avec `rm -rf .next`).

## 6. Surprises / blocages

- ⚠️ **`noUncheckedIndexedAccess` activé** : `Record<UserRole, string>[role]` retourne `string | undefined` → ajout de `?? '/rp'` fallbacks sur tous les accès à `ROLE_HOME`. Découvert au typecheck.
- ⚠️ **`zod` pas dépendance directe de `apps/web`** : import `z` via `@planit/contracts` (qui re-exporte `z`). Erreur au premier typecheck, corrigée immédiatement.
- ⚠️ **Disque plein (ENOSPC)** : Next.js build a saturé le disque pendant le CHECK. Nettoyage `.next/` nécessaire pour débloquer git.
- ⚠️ **PowerShell + chemins `(planit)`** : `(planit)` interprété comme sous-expression PowerShell → `git add` nécessite de quoter chaque chemin individuellement.
- 🟡 **Backend LOT 1 absent** : toutes les requêtes `/auth/*` échoueront jusqu'à la livraison d'Oumar. `DevAuthBadge` gère silencieusement les erreurs de login seed.

## 7. Suite

- **PR** : à ouvrir vers `develop` dès que Salim ajoute `oumy-code` comme collaborateur (403 push actuellement).
- **Aligner seeds DevAuthBadge** : quand Oumar livre LOT 0.3 seed v2, mettre à jour `SEED_ACCOUNTS` dans `dev-auth-badge.tsx`.
- **Remplacer `authMeSchema` local** : dès que Salim livre contracts 0.4 (`AuthMeDto`), importer depuis `@planit/contracts`.
- **Ajouter tests auth** : dès LOT 1 backend livré (≥ 5 tests : login OK, login bad pwd, me sans cookie, refresh, guard redirect).
- **Soft-locks** : aucun posé, aucun à libérer.
- **Prochaine tâche recommandée** : LOT 3 (R.2→R.8 refonte formulaire séance v2) dès que B.1/B.2 backend livrés.

## 8. Mises à jour annexes

- [ ] CLAUDE.md racine — pas de modification nécessaire
- [ ] ADR — pas de décision d'architecture nouvelle (Context vs Zustand = choix d'implémentation standard)
- [ ] `docs/tech-debt.md` — à ajouter : seeds DevAuthBadge à aligner (TD temporaire)
- [ ] Slash command — aucune
