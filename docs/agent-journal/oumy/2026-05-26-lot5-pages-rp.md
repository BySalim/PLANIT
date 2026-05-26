# Journal — 2026-05-26 — LOT 5 Pages RP

## 1. Directives reçues

Implémenter le LOT 5 : 3 nouvelles pages RP (Enseignants, UE & Modules, Filières) + navigation + lib helpers (apiDelete, queries, mutations).

## 2. Décisions techniques

- `apiDelete` implémente sa propre logique fetch (pas via `request()`) car il ne parse pas de body de réponse — cohérent avec les 204 No Content du backend.
- `z` importé depuis `@planit/contracts` (qui le ré-exporte) plutôt que `zod` direct (non listé dans les deps web).
- `zodResolver` passé conditionnellement (`isEdit ? zodResolver(updateSchema) : zodResolver(createSchema)`) pour éviter tout `as any` — la règle `@typescript-eslint/no-explicit-any` n'est pas configurée dans le linter web mais les disable-comments non reconnus causaient une erreur lint.
- Discriminated union `type ModalState = { open: false } | { open: true; mode: ... }` pour les pages UE-modules et Filières — type-safe sans `as`.
- Accordéon UE via `Set<string>` en state local — pas besoin de librairie externe.

## 3. Décisions soumises à validation

Aucune — toutes les décisions rentrent dans le périmètre autonome.

## 4. Modifications

### Fichiers modifiés

- `apps/web/src/lib/api.ts` — ajout `apiDelete`
- `apps/web/src/lib/queries.ts` — ajout `enseignantKeys`, `ueKeys`, `filiereKeys` + 3 hooks query
- `apps/web/src/lib/mutations.ts` — ajout 9 mutations (enseignants, UE, modules, filières)
- `apps/web/src/components/layout/sidebar.tsx` — câblage hrefs filieres/modules/teachers

### Fichiers créés

- `apps/web/src/components/rp/color-swatch-picker.tsx`
- `apps/web/src/components/rp/enseignants/enseignant-modal.tsx`
- `apps/web/src/components/rp/ue-modules/ue-modal.tsx`
- `apps/web/src/components/rp/ue-modules/module-modal.tsx`
- `apps/web/src/components/rp/filieres/filiere-modal.tsx`
- `apps/web/src/app/(planit)/rp/enseignants/page.tsx`
- `apps/web/src/app/(planit)/rp/ue-modules/page.tsx`
- `apps/web/src/app/(planit)/rp/filieres/page.tsx`

Tests ajoutés : aucun dans cette session (à compléter en suivant).

## 5. Phase CHECK — résultats

- `pnpm --filter @planit/web typecheck` : 0 erreur
- `pnpm --filter @planit/web lint --max-warnings 0` : 0 warning, 0 erreur

## 6. Surprises

- La règle `@typescript-eslint/no-explicit-any` n'est pas configurée dans `.eslintrc.json` (only `next/core-web-vitals`). Les commentaires disable référençant une règle inexistante causent une erreur lint "rule not found". Résolu en restructurant le code pour ne pas avoir besoin de `any`.
- `zod` n'est pas dans les dépendances directes du package web — import via `@planit/contracts` qui ré-exporte `z`.

## 7. Suite

- PR à ouvrir vers `develop`
- Tests RTL à écrire pour les modals (mock mutations)
- Pagination avancée (URL params) à envisager pour la liste enseignants

## 8. Mises à jour annexes

Aucune modification de CLAUDE.md, ADR ou tech-debt.
