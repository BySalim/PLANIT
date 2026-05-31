# Suppression du code mort — stub d'auto-login dev pré-LOT 6

**Date** : 2026-05-31
**Branche** : `feat/salim`
**PR cible** : `develop`

## 1. Directives reçues

Supprimer le code mort laissé par le stub d'auto-login dev d'avant le LOT 6
(l'auth frontend réelle est livrée : `AuthProvider` + page `/login` + `RequireAuth`

- `middleware.ts`). Deux fichiers visés, portant l'en-tête « À SUPPRIMER au merge
  du LOT 6 » : `apps/web/src/lib/dev-auth.ts` (`ensureDevAuth`, `actorFromPathname`,
  `checkAuth`, `devLogin` + comptes seed hardcodés) et
  `apps/web/src/components/dev-auth-provider.tsx` (`DevAuthProvider`). Vérifier
  d'abord qu'ils ne sont plus importés, retirer l'entrée tech-debt liée, garder la
  suite CHECK verte. Ticket séparé car suppression > 20 lignes (décision sensible).

## 2. Décisions techniques (autonomie)

- **Pas de SPEC formelle** : pure suppression de code mort, le ticket fait office
  de spec. Workflow réduit à PROBE → CODE (delete) → CHECK → JOURNAL.
- **Suppression de l'entrée `USE-AUTH-HOOK`** dans `docs/tech-debt.md` (et non un
  simple amendement) : l'entrée décrivait « Hook `useAuth()` + `useCurrentActor()`
  (remplace les hooks hardcodés V1) ». Vérifié que **les deux hooks existent et
  sont réels** — `useAuth()` ([auth-context.tsx](../../../apps/web/src/contexts/auth-context.tsx)),
  `useCurrentActor()` ([use-current-actor.ts](../../../apps/web/src/hooks/use-current-actor.ts)) —
  et que `useCurrentTeacher`/`useCurrentStudent` lisent désormais depuis `useAuth()`
  (le hardcodé n'est plus qu'un fallback pré-résolution garanti inatteignable par
  `RequireAuth`). La dette est donc **livrée**, pas seulement déplacée → on retire
  la ligne (cf. politique d'en-tête de `tech-debt.md`).
- **TD-022/023/024/025 + FACTOR-PAGES non touchés** : hors périmètre du ticket.
  `USE-AUTH-HOOK` en était le pré-requis ; ce pré-requis est levé, les items aval
  restent tracés tels quels.
- **Suppression via `git rm`** (staging propre) plutôt que `Remove-Item`.

## 3. Décisions soumises à validation

Aucune. Le ticket autorisait explicitement la suppression (> 20 lignes). Le retrait
de l'entrée tech-debt était demandé dans le ticket.

## 4. Modifications

### Supprimés

- `apps/web/src/lib/dev-auth.ts` (83 lignes) — stub auto-login dev.
- `apps/web/src/components/dev-auth-provider.tsx` (59 lignes) — gate de rendu du stub.

### Modifiés

- `docs/tech-debt.md` — retrait de la ligne `USE-AUTH-HOOK` (dette livrée).

### Tests

Aucun test ajouté/supprimé — suppression de code mort jamais couvert par un test
(aucun fichier de test ne référençait `dev-auth*`). Les 42 tests web existants
restent verts.

## 5. Phase CHECK — résultats

- `pnpm --filter @planit/web typecheck` ✅ (`tsc --noEmit`, 0 erreur)
- `pnpm --filter @planit/web lint` ✅ (0 warning / 0 erreur)
- `pnpm --filter @planit/web test` ✅ **42/42** (8 fichiers)
- `pnpm --filter @planit/web build` ✅ (compiled, 13 routes, middleware 33.7 kB)

Le typecheck + build au vert valent **preuve d'absence d'import résiduel** : un
import survivant de `@/lib/dev-auth` ou `@/components/dev-auth-provider` aurait fait
échouer `tsc` sur `Cannot find module`.

## 6. Surprises / blocages

- **Aucune surprise.** `grep` repo-wide pré-suppression : les seules occurrences
  hors des 2 fichiers étaient dans des journaux d'agent (archives historiques,
  non modifiées). Confirmé par le journal `2026-05-31-auth-pro-refactor.md` qui
  avait déjà constaté le code mort et flaggé sa suppression « séparément ».
- Warning `act(...)` dans le smoke test (`AuthProvider`) : **préexistant**, sans
  rapport avec cette suppression, test vert.

## 7. Suite

- Commit + PR `feat/salim → develop`.
- Aucun soft-lock posé (pas de ressource partagée touchée ; `tech-debt.md` n'est
  pas sous lock).
- Débloque la base saine pour la PR release `develop → main` (LOT 8 V.5).

## 8. Mises à jour annexes

- **Tech-debt** : `USE-AUTH-HOOK` retiré (dette levée). Aucun autre item modifié.
- **CLAUDE.md** : inchangé (les patterns auth décrits y restent valides ; le stub
  supprimé n'y était pas documenté comme pattern).
- **ADR** : aucun.
