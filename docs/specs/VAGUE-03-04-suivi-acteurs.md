# VAGUE-03-04 — Suivi consultation Étudiant + Enseignant (LOT 9)

> **Statut** : IN PROGRESS (Oumar, 2026-06-04)
> **Réf design** : `PLANIT-Design/etudiant/screens/suivi.jsx` + `enseignant/screens/suivi.jsx`
> **Backend dépend de** : LOT 2 B.5 (`GET /api/suivi-modules`) ✅

---

## URL role-aware (V3-D14)

`/suivi-modules` est l'URL unique pour les 3 acteurs :

| Rôle       | Rendu                                    | Accès       |
| ---------- | ---------------------------------------- | ----------- |
| RP / AC    | Page gestion (existante LOT 5)           | `(gestion)` |
| ETUDIANT   | Page suivi lecture seule (sa classe)     | `(consult)` |
| ENSEIGNANT | Page suivi pivot (ses modules × classes) | `(consult)` |

---

## S.2 — Backend Étudiant

**Modification** : `SuiviModulesController` → ajouter `ETUDIANT` aux rôles autorisés sur `@Get()`.

**Self-scope** : dans `SuiviModulesService.resolveScopeClasseIds()`, si `user.role === 'ETUDIANT'` :

1. Chercher `Inscription.classeId` where `etudiantId = user.id AND anneeAcademique.etat = EN_COURS`
2. Retourner ces `classeIds` (peut être 1 ou 2 en cas de double-diplôme)
3. Si `classeId` fourni en query → vérifier que l'étudiant est inscrit dans cette classe (403 sinon)

**RBAC** : lecture seule uniquement — `terminer`/`rouvrir` restent RP only.

---

## S.3 — Backend Enseignant + DTO

### Endpoint

`GET /api/suivi-modules/mes-enseignements`

- Rôle : `ENSEIGNANT` only
- Retourne les modules sur lesquels l'enseignant a fait des séances COURS (cette année)

### Algorithme

1. Trouver toutes les `Seance` où `enseignantId = user.id` AND `type = COURS` AND année courante
2. Pour chaque couple unique `(moduleId, classeId)` :
   - `heuresFaites` = somme durée séances CM/TD/TP de cet enseignant pour ce couple
   - `heuresPrevues` = `MaquetteModule.heuresCM + heuresTD + heuresTP` de la version suivie par la classe
   - `sessionsCount` = nombre de séances
   - `status` = dérivé de `SuiviModule.estTermine` + `heuresFaites / heuresPrevues`
3. Grouper par module

### DTO `EnseignantSuiviItemDto` (nouveau dans `packages/contracts/`)

```ts
{
  moduleId: string
  module: { id, code, libelle, color, ue: { id, code, libelle } | null }
  classes: [{
    classeId: string
    classeCode: string
    className: string
    heuresFaites: number     // heures totales CM+TD+TP faites par cet enseignant
    heuresCM: number
    heuresTD: number
    heuresTP: number
    heuresPrevues: number    // VHE du MaquetteModule (CM+TD+TP prévus)
    progression: number      // 0-100
    sessionsCount: number
    estTermine: boolean
  }]
  status: 'completed' | 'ongoing' | 'upcoming'  // dérivé des classes
}
```

---

## S.4 — Frontend Étudiant

**Route** : `app/(planit)/(consult)/suivi-modules/page.tsx` → branché via le layout role-aware

**Design** (réf `etudiant/screens/suivi.jsx`) :

```
┌─────────────────────────────────────────┐
│ Onglets formation  [GL3] [INFO]          │  ← tabs filière
├─────────────────────────────────────────┤
│ Onglets semestre   [S1]  [S2]            │
├─────────────────────────────────────────┤
│ Carte récap semestre :                   │
│  Anneau % + heures faites/prévues        │
│  Chips : Terminés · En cours · À venir  │
├─────────────────────────────────────────┤
│ Filtres : En cours · À venir · Terminés │
├─────────────────────────────────────────┤
│ [Card module 1 — EN COURS]              │  ← badge statut coloré
│ [Card module 2 — TERMINÉ]              │
└─────────────────────────────────────────┘
```

**Écarts vs design** :

- `plannedH` = `heuresPrevues` = VHE (pas VHT, cf. ADR-0012 V3-D8)
- Statut 3 états : `ongoing` / `upcoming` / `completed` mappés sur `estTermine` + `progression`

---

## S.5 — Frontend Enseignant

**Design** (réf `enseignant/screens/suivi.jsx`) :

```
┌─────────────────────────────────────────┐
│ Hero : X modules · Y h faites           │
│        filtres : En cours · À venir     │
├─────────────────────────────────────────┤
│ Groupe "En cours"                        │
│  [Card module A]  +  ClassRow GL3 █████ │
│                       ClassRow INFO ░░░ │
├─────────────────────────────────────────┤
│ Groupe "À venir"                         │
│  [Card module B]  +  ClassRow GL3 ░░░░ │
└─────────────────────────────────────────┘
```

**Détails** : modules groupés par statut (ongoing → upcoming → completed), expandable par classe, barre de progression par classe.

---

## S.6 — Routing + Nav

- `app/(planit)/(consult)/suivi-modules/page.tsx` — branché selon rôle (`useAuth`)
- `app/(planit)/(consult)/layout.tsx` — ajouter `ETUDIANT` + `ENSEIGNANT` aux rôles autorisés
- MobileShell enseignant : ajouter tab « Suivi »
- MobileShell étudiant : ajouter tab « Suivi »

---

## S.7 — Tests

Tests backend (`apps/backend/test/suivi-modules-scope.spec.ts`) :

- Étudiant voit uniquement sa classe (`200` + bon classeId)
- Étudiant avec classeId d'autrui → `403`
- Enseignant accède `mes-enseignements` → `200`
- RP accède `mes-enseignements` → `403`
- Étudiant accède `mes-enseignements` → `403`
