# Journal — LOT 3 V03 : Page Maquettes de formation

> Date : 2026-06-03 · Branche : `feat/oumar` · Vague : 03

## 1. Directives reçues

Implémenter le LOT 3 Vague 03 — Frontend RP : Maquettes (M.1→M.8).
Protocole Salim suivi : pull stratégie + main + develop, merge develop dans feat/oumar,
pnpm install + docker up, vérification typecheck/lint avant de coder.

## 2. Décisions techniques

- Layout **master-detail** plein écran (pas dans Shell avec padding) — `fullBleed`
- Accordéons **fermés par défaut** par niveau (L1/L2/L3/M1/M2)
- Semestres **dépliables** — fermés par défaut, chips stats toujours visibles
- Mode **Composer** = édition locale avec snapshot + batch PUT sur Enregistrer
- Bouton Renouveler conditionnel (`!hasCurrentVersion && currentAnnee !== null`)
- `queries-v3.ts` + `mutations-v3.ts` séparés des fichiers V02 — pas d'interférence
- Palette UE : 6 couleurs cycliques identiques PLANIT-Design (orange/bleu/vert/rose/violet/rouge)
- Apostrophes françaises dans JSX = double-quote string ou `{""}`
- `exactOptionalPropertyTypes` : spread conditionnel `...(x !== undefined ? { k: x } : {})`

## 3. Décisions soumises à validation

Aucune décision sensible (pas de touche contracts, pas de schema Prisma).

## 4. Modifications

| Fichier                                            | Action                                       |
| -------------------------------------------------- | -------------------------------------------- |
| `app/(planit)/(gestion)/maquettes/page.tsx`        | Créé — re-export                             |
| `components/rp/maquettes/maquettes-page.tsx`       | Créé — layout master-detail                  |
| `components/rp/maquettes/maquette-list.tsx`        | Créé — panneau gauche (M.2)                  |
| `components/rp/maquettes/maquette-panel.tsx`       | Créé — panneau droit (M.3/M.5/M.6/M.7/M.8)   |
| `components/rp/maquettes/semestres-view.tsx`       | Créé — tableau UE/modules (M.5/M.7)          |
| `components/rp/maquettes/annees-widget.tsx`        | Créé — chip années + popover (M.4)           |
| `components/rp/maquettes/maquette-infos-modal.tsx` | Créé — modal édition + création (M.4/M.8)    |
| `lib/queries-v3.ts`                                | Créé — hooks TanStack V03                    |
| `lib/mutations-v3.ts`                              | Créé — mutations create/update/renew/compose |
| `components/layout/sidebar.tsx`                    | Modifié — href maquettes '#' → '/maquettes'  |
| `docs/specs/VAGUE-03-01-page-maquettes.md`         | Créé — spec M.1                              |

## 5. Phase CHECK — résultats

```
typecheck → ✅ 0 erreurs TS (3 rounds de correction : apostrophes, Modal props, exactOptionalPropertyTypes)
lint      → ✅ No ESLint warnings or errors
```

## 6. Surprises

- Backend LOT 1 (PR #49) venait d'être mergé sur develop au moment du pull — parfait timing
- `Modal` existant utilise `isOpen`/`size` (pas `open`/`maxWidth`) — adapté
- `exactOptionalPropertyTypes` strict : `ueColor?: string` ne peut pas recevoir `undefined` explicit

## 7. Suite

- PR `feat/oumar → develop` à ouvrir
- LOT 5 V03 (Étudiants + Suivi des modules) — attend LOT 2 backend (feat/salim)
- Sélecteur de module pour mode Composer (TODO dans handleAddModule) — à compléter

## 8. Mises à jour annexes

- `vague-03-lots.md` : M.1→M.8 passés de `[ ]` à `[~]` en début de session
