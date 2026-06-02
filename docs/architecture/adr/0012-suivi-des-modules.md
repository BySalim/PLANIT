---
id: ADR-0012
titre: Suivi des modules — heures prévues vs faites (dérivées)
statut: ACCEPTÉ
date: 2026-06-02
auteur: salim
vague: 03
---

# ADR-0012 — Suivi des modules (heures prévues vs faites, dérivées)

> **Statut** : Accepté · **Date** : 2026-06-02 · **Vague** : 03 (LOT 0.3) · **Auteur** : Salim (Tech Lead)

## Contexte

Le RP doit suivre, **par classe**, l'avancement pédagogique : pour chaque
module du plan d'études, combien d'heures sont **prévues**, combien ont été
**faites**, par **quels enseignants**, et le module est-il **terminé**. Le
design `PLANIT-IA/rp/screens/suivi-modules.jsx` rend ça en cards
prévu/fait/progression/enseignants.

La question de fond : **où vit l'information « heures faites » ?** Elle
n'est saisie nulle part — elle **découle** des séances réellement planifiées
(une séance COURS de 2h du module ALGO pour GL3-A = 2h faites sur ALGO en
GL3-A). La stocker serait la dupliquer, donc risquer la divergence (même
arbitrage que VHE/VHT en ADR-0010 et le smart-dirty V02).

V3-D8 tranche le principe ; cet ADR fige le modèle et les formules.

## Décision

### 1. `SuiviModule` — état persistant **minimal** (V3-D8)

```
SuiviModule {
  id          cuid
  classeId    -> Classe
  moduleId    -> Module
  estTermine  Boolean   @default(false)   // SEUL état "métier" persisté
  termineAt   DateTime?
  createdAt   DateTime
  updatedAt   DateTime
  @@unique([classeId, moduleId])
  @@index([classeId])
}
```

Le `SuiviModule` ne stocke **que** ce qui ne se dérive pas : le flag
`estTermine` (togglable par le RP) et son horodatage. **Tout le reste est
calculé** à la lecture. Il y a un `SuiviModule` par couple (classe, module
de la maquette version suivie par la formation de la classe).

### 2. Heures prévues = VHE (V3-D8, V3-D3)

`heuresPrevues` = **VHE** (`CM + TD + TP`) du `MaquetteModule` correspondant
au module, dans la `MaquetteVersion` suivie par la **formation** de la
classe.

```
classe -> formation -> maquetteVersion -> maquetteModule[moduleId] -> VHE
```

**TPE exclu** du prévu : c'est du travail personnel non encadré, non
planifié en séances — donc **non comparable** au « fait » (qui ne compte
que des séances encadrées). Comparer fait (encadré) à VHT (qui inclut le
TPE) fausserait la progression. (Décision sensible « heuresPrevues = VHE vs
VHT » : on fixe **VHE**. Si le métier veut inclure le TPE, basculer en VHT
et amender cet ADR.)

### 3. Heures faites = dérivées des séances

`heuresFaites` = somme des durées des **séances COURS** du **module** pour
la **classe**, sur l'année de la classe :

```
heuresFaites(classe, module) =
  Σ  (endAt - startAt en heures)
  pour chaque Seance où  typeV2 = 'COURS'
                    ET   moduleId = module
                    ET   la classe ∈ classes de la séance (SeanceClasse, V2-D6)
```

- **COURS uniquement** : une `EVALUATION` (examen) ou un `EVENEMENT`
  (conférence) ne compte pas comme heure de cours faite sur le module.
- **Multi-classes** : on s'appuie sur la jointure `SeanceClasse` (V2-D6) —
  une séance partagée par GL3-A et GL3-B compte ses heures pour **chacune**.
- Aucune dépendance au statut publié/non-publié en V03 (le suivi reflète le
  planning réel ; affinable plus tard si besoin).

### 4. Progression et enseignants — dérivés

```
progression = heuresPrevues > 0 ? min(100, round(heuresFaites / heuresPrevues * 100)) : 0
enseignants[] = regroupement des séances COURS (module, classe) par enseignant,
                avec Σ heures par enseignant :
                [ { id, nom, heures }, … ]   trié desc par heures
```

`estTermine` reste **indépendant** de la progression : le RP peut clôturer
un module à 95 % (rattrapage prévu hors planning) ou le laisser ouvert à
100 %. C'est un acte **explicite** du RP (`PATCH …/terminer` / `…/rouvrir`),
pas une déduction automatique. **RP only** — l'AC est en lecture seule sur
le suivi (V3-D9).

### 5. `heuresPrevues = VHE`, jamais persisté

Comme VHE/VHT (ADR-0010 §3) : `heuresPrevues`, `heuresFaites`,
`progression`, `enseignants[]` sont **calculés à chaque GET**, jamais
stockés. Le seul champ écrit est `estTermine`/`termineAt`.

## Options envisagées

### Option A — Stocker `heuresFaites` sur `SuiviModule`, incrémenter à chaque séance

**Rejeté** : duplication → divergence garantie au premier déplacement/
suppression de séance (il faudrait des hooks de cohérence partout dans le
`SeanceService`). Fragile, exactement le piège que VHE/VHT et smart-dirty
évitent.

### Option B — Pas de table du tout, tout dérivé y compris « terminé »

Calculer même `estTermine` (ex. progression ≥ 100 %). **Rejeté** :
`estTermine` est une **décision humaine** du RP (clôture pédagogique), pas
une fonction de la progression. Il faut un état persistant — d'où la table
minimale.

### Option C — `SuiviModule` à état minimal + agrégats dérivés (retenu)

Table = `estTermine` + horodatage ; tout le reste = SQL d'agrégation sur
`Seance`. **Pour** : pas de divergence possible sur les heures, état humain
préservé, requêtes naturelles via FK (ADR-0010 a fait le choix relationnel
pour rendre ce join possible). **Contre** : l'agrégation tourne à chaque GET
(mitigé : index `@@index([classeId])` + volumétrie faible — quelques dizaines
de séances par classe). **Retenu**.

### Option D — Vue matérialisée Postgres

Pré-agréger en vue matérialisée rafraîchie. **Reporté** : sur-ingénierie à
cette volumétrie. Réévaluable si le suivi multi-classes devient lent (LOT 2
B.5 mesurera) → tech-debt `TD-V03-SUIVI-PERF` si nécessaire.

## Conséquences

### Positives

- **Heures faites toujours exactes** : reflètent le planning réel sans
  étape de synchro.
- **État humain préservé** (`estTermine`) sans le confondre avec un calcul.
- **Réutilise les FK** posées par ADR-0010 (module ↔ maquetteModule) et la
  jointure multi-classes V2-D6.
- **« Voir les séances »** (LOT 5 E.5) est trivial : c'est exactement le
  même filtre que `heuresFaites` (COURS, module, classe).

### Négatives

- **Agrégation par GET** : acceptable à cette échelle, à surveiller en
  multi-classes (Option D en réserve).
- **Dépendance forte au modèle séance V2** (`typeV2`, `SeanceClasse`) : le
  suivi suppose que LOT 2 V02 a peuplé `typeV2`/`SeanceClasse`. En V03 le
  seed garantit ces champs sur toutes les séances.
- **Génération des `SuiviModule`** : il faut créer une ligne par (classe,
  module de la version). Fait au seed (LOT 0.7) et à la création de classe
  (LOT 2 B.1) — à ne pas oublier, sinon un module suivi manque dans la vue.

### À surveiller

- Cohérence `SuiviModule` ↔ modules de la version : si on retire un module
  d'une version (composer), un `SuiviModule` orphelin peut subsister. LOT 2
  B.5 doit ignorer/nettoyer les suivis sans `MaquetteModule` correspondant.

## Plan de mise en œuvre

| Étape | Livrable                                                                           | Owner | LOT           |
| ----- | ---------------------------------------------------------------------------------- | ----- | ------------- |
| A     | Schema : table `SuiviModule` (`estTermine`, `@@unique([classeId, moduleId])`)      | Salim | 0.4           |
| B     | Contracts : `SuiviModuleDto` (prévu/fait/progression/enseignants[]/estTermine)     | Salim | 0.5           |
| C     | Seed : `SuiviModule` pour GL3-A/GL3-B avec heures faites cohérentes                | Oumar | 0.7           |
| D     | `GET /suivi-modules` (agrégation), `PATCH …/terminer` `…/rouvrir`, `GET …/seances` | Oumar | LOT 2 B.5/B.6 |
| E     | Page Suivi + « Voir les séances »                                                  | Oumar | LOT 5 E.4/E.5 |

## Décision révisable quand

- La performance d'agrégation se dégrade en multi-classes → vue
  matérialisée (Option D, `TD-V03-SUIVI-PERF`).
- Le métier veut `heuresPrevues = VHT` (inclure le TPE) → bascule + amende.
- Le « fait » doit distinguer publié/non-publié → ajout d'un filtre au §3.

## Liens

- V3-D8, V3-D3 (`vague-03-index.md`)
- LOT 0.3 (`vague-03-lots.md`) — tâche source
- ADR-0010 (modèle académique) — `MaquetteModule`, VHE
- V2-D6 (`vague-02-index.md`) — multi-classes `SeanceClasse`
- LOT 2 B.5/B.6 (backend), LOT 5 E.4/E.5 (front)
