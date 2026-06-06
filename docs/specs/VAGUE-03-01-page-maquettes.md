# VAGUE-03-01 — Page Maquettes de formation

> **Statut** : IN PROGRESS (Oumar, 2026-06-03)
> **Réf design** : `PLANIT-Design/rp/screens/maquettes.jsx`
> **Backend** : LOT 1 V03 (PR #49 mergé) — endpoints `/api/maquettes`, `/api/maquette-versions`, `/api/maquette-modules`, `/api/annees`

---

## Layout général

Page **master-detail** pleine hauteur, sans padding externe :

```
┌─────────────────────────────────────────────────────┐
│  Shell (sidebar RP + header)                         │
│  ┌──────────────┬──────────────────────────────────┐ │
│  │  Panneau G   │  Panneau D                       │ │
│  │  (320px)     │  (flex-1)                        │ │
│  │  Liste       │  Détail maquette sélectionnée    │ │
│  └──────────────┴──────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## M.2 — Panneau gauche

- Recherche (input) + bouton **« + Nouvelle »** → **en haut**, avant la liste
- Filtre filière (select) + filtre niveau (select)
- Liste groupée par **niveau** (`L1` / `L2` / `L3` / `M1` / `M2`) dans des **accordéons fermés par défaut**
- Chaque item affiche : nom · filière sigle · badge niveau · chip dernière année (couleur selon état)
- Sélection → charge le panneau droit. Sélection persistée dans l'URL (`?id=`)

**Écarts vs design** : le design affiche un code maquette en `JetBrains Mono` dans chaque item → **conserver** (utile pour l'identification rapide).

---

## M.3 — Panneau droit — En-tête

Affiché quand une maquette est sélectionnée. Sinon : état vide illustré.

**Ligne titre** :

- `nom` (h1, Poppins)
- Badge `niveau` (pill bg-warm)
- Badge filière (pill orange) avec `sigle — libelle`
- Compteur semestres

**Boutons d'action** (ligne droite) — **ordre strict** :

1. `Modifier` (icône crayon, secondary) → ouvre modal infos (M.4)
2. `Exporter` (secondary) → stub flash « bientôt » (LOT 7)
3. `Composer la maquette` (primary, icône bookStack) → mode composer (M.7)
4. `Renouveler` (primary amber) → **visible UNIQUEMENT si** aucune version pour l'année courante

**Retirer vs design** : code maquette en en-tête, ligne « Voir formations / Voir classes ».

---

## M.4 — Modal informations

Bouton `Modifier` → ouvre un modal (pas un drawer).

Contenu :

- **Date de création** de la **maquette** (pas de la version) — format `d MMMM yyyy` FR
- **Dernière modification** — idem + relative (`il y a X jours`)
- **Années d'utilisation** : liste des `AnneeAcademique` liées avec chip état coloré (`EN_COURS` → vert, `PLANIFIEE` → amber, `CLOTUREE`/`SUSPENDUE` → gris)
- Champ éditable : **nom** uniquement (filière + niveau figés ADR-0010)
- Bouton « Enregistrer » → `PUT /api/maquettes/:id`

---

## M.5 — Semestres (tableau)

Pour chaque semestre de la version sélectionnée (S1 / S2) :

- **En-tête dépliable** (fermé par défaut) : badge semestre + libellé + chips (nb modules, VHT total)
- Table dépliée :
  - Colonnes : `Code UE` · `Module` · `CM` · `TD` · `TP` · **`VHE`** (surligné amber) · `TPE` · **`VHT`** (surligné amber)
  - Groupes UE colorés (6 palettes cycliques), sous-total UE, total semestre (fond marron foncé)
  - Mode lecture par défaut ; mode composition (M.7) active les inputs

---

## M.6 — Stats + Classes (sous les semestres, 2 colonnes)

Affiché **sous les semestres**, en layout `grid-cols-2` :

**Colonne 1 — Stats** (KPI cards verticales) :

- UE totales · Modules totaux · Volume horaire total (VHT)

**Colonne 2 — Classes suivant cette version** :

- Liste des classes liées à la version sélectionnée (via `maquetteVersion.classes`)
- Chaque ligne : code + nom · bouton **« Voir la classe »** → lien `/classes?id=` (LOT 4)
- Si aucune classe : message « Aucune classe ne suit cette version »

---

## M.7 — Composer la maquette

Bouton `Composer` → active le **mode édition** sur les tableaux semestres.

- Chaque cellule CM/TD/TP/TPE devient un `<input type="number">`
- Bouton `+ Ajouter un module` par semestre → modal sélecteur de module (UE → modules)
- Bouton `×` sur chaque ligne → `DELETE /api/maquette-modules/:id`
- `Enregistrer` → `PUT /api/maquette-modules/:id` pour chaque ligne modifiée (batch)
- `Annuler` → rollback snapshot local
- **Sélecteur de version** en haut du panneau droit (si plusieurs versions) — change la version affichée

---

## M.8 — Renouveler + Créer

**Renouveler** (bouton conditionnel M.3) :

- Appelle `POST /api/maquettes/:id/renew`
- Flash succès → recharge les versions + sélectionne la nouvelle version
- Si la version de l'année courante existe déjà → bouton absent

**Créer une nouvelle maquette** (bouton `+ Nouvelle` M.2) :

- Modal : champs `nom` (texte), `filiereId` (select filières), `niveau` (select L1→M2)
- `POST /api/maquettes` → ajoute à la liste, sélectionne automatiquement

---

## Fichiers produits

| Fichier                                            | Description                           |
| -------------------------------------------------- | ------------------------------------- |
| `app/(planit)/(gestion)/maquettes/page.tsx`        | Entry point Next.js                   |
| `components/rp/maquettes/maquettes-page.tsx`       | Layout master-detail                  |
| `components/rp/maquettes/maquette-list.tsx`        | Panneau gauche (M.2)                  |
| `components/rp/maquettes/maquette-panel.tsx`       | Panneau droit (M.3/M.5/M.6)           |
| `components/rp/maquettes/maquette-infos-modal.tsx` | Modal infos/édition (M.4/M.8 créer)   |
| `components/rp/maquettes/semestres-view.tsx`       | Tableau semestres (M.5/M.7)           |
| `components/rp/maquettes/annees-widget.tsx`        | Chip années + popover (M.4)           |
| `lib/queries-v3.ts`                                | Hooks TanStack Query V03              |
| `lib/mutations-v3.ts`                              | Mutations create/update/renew/compose |

Sidebar : `href: '#'` → `href: '/maquettes'`
