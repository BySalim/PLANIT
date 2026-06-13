---
membre: oumar
date: 2026-06-13
feature: VAGUE-05-03-direction-frontend
vague: 05
spec: docs/specs/VAGUE-05-03-direction-frontend.md (à créer)
pr: à ouvrir
duree-session: ~2h
statut: livré
---

# 2026-06-13 — Direction frontend (VAGUE-05-03)

## 1. Directives reçues du membre

Attaquer le LOT 3 de la Vague 05. Périmètre lu dans `vague-05-lots.md` (remote strategy repo) :
9 tâches frontend pour l'acteur DIRECTION — navigation, dashboard KPIs, pages Personnel et
Année académique (nouvelles), vue Salles Direction, accès lecture aux référentiels.

## 2. Décisions techniques prises (de manière autonome)

| #   | Décision                                                                                                | Pourquoi                                                                                                             | Réversible ? |
| --- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------ |
| 1   | DIRECTION ajouté à `(gestion)/layout.tsx` et `(rp-only)/layout.tsx` plutôt que duplication des pages    | Les pages existantes masquent déjà les boutons d'édition via `useIsRp()` → réutilisation maximale (consigne lots.md) | Oui          |
| 2   | Pages `/personnel` et `/annees` dans un nouveau groupe `(direction)/`                                   | Exclusives à la Direction, nettement séparées des pages partagées (pattern (admin))                                  | Oui          |
| 3   | `direction-queries.ts` + `direction-mutations.ts` distincts de `admin-queries.ts`                       | Périmètres distincts (école vs cross-école), pas de mélange de `enabled` guards                                      | Oui          |
| 4   | Sélecteur RP dans la modale Salle Direction : `usePersonnelQuery()` filtrée sur `RESPONSABLE_PROGRAMME` | Évite un endpoint dédié ; la liste est déjà chargée pour la page Personnel                                           | Oui          |
| 5   | Garde visuelle « Débuter » désactivée si une EN_COURS existe (calcul client)                            | Le 409 backend reste l'autorité ; le disabled est UX uniquement                                                      | Oui          |

## 3. Décisions soumises au membre pour validation

Aucune — tout le LOT 3 est dans le périmètre frontend, aucune décision d'architecture nouvelle.

## 4. Modifications effectuées

### Fichiers créés

- `apps/web/src/app/(planit)/(direction)/layout.tsx` — gate RequireAuth DIRECTION
- `apps/web/src/app/(planit)/(direction)/personnel/page.tsx` — CRUD RP/AC (suspendre/réactiver)
- `apps/web/src/app/(planit)/(direction)/annees/page.tsx` — débuter/clôturer avec garde EN_COURS
- `apps/web/src/components/direction/direction-home-view.tsx` — KPIs (personnel, année, salles)
- `apps/web/src/components/direction/personnel-modal.tsx` — modal créer/modifier (2 sous-forms)
- `apps/web/src/components/direction/personnel-skeleton.tsx` — skeleton 5 lignes
- `apps/web/src/lib/direction-queries.ts` — `usePersonnelQuery`, `useAnneesDirectionQuery`, `useSallesDirectionQuery`
- `apps/web/src/lib/direction-mutations.ts` — 8 mutations (personnel ×4, années ×2, salles ×2)

### Fichiers modifiés

- `hooks/use-role.ts` (+4, ajout `useIsDirection()`)
- `components/layout/sidebar.tsx` (+60, NAV_DIRECTION + navForRole branch DIRECTION)
- `app/(planit)/page.tsx` (+3, cas DIRECTION → `<DirectionHomeView />`)
- `app/(planit)/(gestion)/layout.tsx` (+1, DIRECTION dans RequireAuth)
- `app/(planit)/(gestion)/(rp-only)/layout.tsx` (+1, DIRECTION dans RequireAuth)
- `app/(planit)/(gestion)/salles/page.tsx` (+180, vue Direction : liste + create + assign RP)

### Migration BD

Aucune.

### Tests ajoutés

Aucun nouveau test unitaire — les hooks et mutations suivent le même pattern que
`admin-queries.ts`/`admin-mutations.ts` déjà couverts. Tests existants : 99/99 verts.

## 5. Phase CHECK — résultats

```
pnpm --filter web typecheck  → ✅ 0 erreur tsc
pnpm --filter web lint       → ✅ 0 warning ESLint
vitest run (web)             → ✅ 99/99 tests (21 fichiers)
Smoke navigateur             → non réalisé (backend requis)
```

## 6. Surprises / blocages

- Le `(direction)/` route group dans le shell macOS avec les parenthèses nécessite des
  guillemets ou l'échappement dans les commandes bash — mineur, résolu.
- `personnel-modal.tsx` : `updatePersonnelSchema` est un `.partial()` → impossible de
  partager un seul `useForm<T>` avec le schema create. Séparé en deux sous-formulaires
  distincts (`PersonnelCreateForm` / `PersonnelEditForm`) pour rester full-typed sans cast.

## 7. Suite

- PR `feat/oumar → develop` à ouvrir (LOT 3)
- LOT 4 : refontes transverses (suivi enrichi + overlay enseignant + responsable RP surfacé)
  — Oumar porte la partie backend (4.1 back, 4.3 back)
- Aucun soft-lock posé (contracts/ non touché)

## 8. Mises à jour annexes

- [ ] CLAUDE.md — patterns V05 à capitaliser en clôture de vague (Salim, LOT 5.4)
- [ ] ADR — aucun nouveau (LOT 3 implémente sans décision d'archi nouvelle)
- [ ] docs/tech-debt.md — RAS
