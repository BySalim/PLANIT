---
id: ADR-0008
titre: Modèle « modifié » hybride — snapshot serveur + override client optimiste
statut: PROPOSÉ
date: 2026-05-25
auteur: salim
---

# ADR-0008 — Modèle « modifié » hybride (snapshot serveur + client optimiste)

## Contexte

En V01, une séance porte simplement `isPublished: boolean`. Chaque
modification d'une séance publiée la rebascule à `isPublished=false` (et
`status=PROVISOIRE`), forçant le RP à re-publier pour retirer le badge
« non publiée ». **Problème** : si le RP modifie un horaire puis le
remet exactement à sa valeur d'origine (par exemple un undo manuel), le
badge reste affiché et le compteur « N séances modifiées » reste élevé
inutilement.

La Vague 02 introduit l'undo/redo (V2-D11), la copie multi-classes
(V2-D6), et un formulaire RP beaucoup plus permissif. Le scénario de
démo (`vague-02-scenarios.md:33`) demande explicitement :

> 13. Modifier heure 10h-12h → 11h-12h, sauvegarder → badge « non
>     publiée » apparaît + compteur passe à 2
> 14. Re-modifier à 10h-12h → badge disparaît + compteur retourne à 1

Le calcul du « modifié » doit donc devenir **smart** : comparer l'état
courant à l'état au dernier publish, plutôt qu'un flag binaire écrasé
à chaque update. V2-D7 a tranché le principe — cet ADR fige
**l'implémentation**.

## Options envisagées

### Option A — Snapshot serveur uniquement

Le backend stocke `publishedSnapshot: Json` (état figé au dernier
publish). À chaque `GET /api/sessions/...` ou après chaque mutation, il
compare l'état courant au snapshot et renvoie `hasUnpublishedChanges:
boolean` calculé.

- **Pour** : source de vérité unique, multi-éditeur safe (si Salim et
  Oumy éditent le même RP en parallèle, les deux voient le même état).
- **Contre** : le badge ne disparaît qu'**après** un round-trip API.
  Latence visible (~100-300 ms) sur un retour à l'état initial — UX
  décevante sur l'undo immédiat.
- **Effort** : moyen. JSON normalisé + util `stableStringify` côté
  backend.

### Option B — Diff client uniquement

Le client conserve une copie de l'état « publié » reçu de l'API, et
calcule `hasUnpublishedChanges` localement en comparant à l'état du
formulaire.

- **Pour** : réactivité immédiate sur l'undo, pas de round-trip.
- **Contre** :
  - **Désync multi-éditeur** : si Salim publie pendant qu'Oumy édite,
    le client d'Oumy ne sait pas que l'état « publié » a changé.
  - **Pas de persistence cross-refresh** : un F5 perd le diff.
  - **Logique métier dupliquée** front + back — sera désynchronisée
    au premier ajout de champ.
- **Effort** : faible côté front, mais difficile à maintenir cohérent.

### Option C — Hybride snapshot serveur + override client optimiste (retenu)

V2-D7 a déjà acté ce principe. Cet ADR le détaille :

- Backend = **source de vérité**. Stocke `publishedSnapshot` et
  calcule `hasUnpublishedChanges` sur chaque retour API.
- Client = **override optimiste**. Garde un flag local que le badge
  utilise immédiatement après une action utilisateur. Réconcilié à
  chaque réponse API (la valeur backend gagne).

- **Pour** : réactivité immédiate (option B) + cohérence multi-éditeur
  (option A) + récupération propre au refresh (option A).
- **Contre** : duplication de la logique de comparaison côté client
  pour l'override optimiste (mitigé via util partagé
  `stableStringify`).
- **Effort** : moyen-élevé. Demande un `stableStringify` partagé +
  réconciliation client.

### Option D — Ne rien faire (statu quo V01)

- Garder `isPublished` binaire écrasé à chaque update.
- **Conséquence** : le scénario de démo V02 (étape 14) échoue. Le
  badge reste collé même après un retour à l'état publié.
- **Acceptable ?** Non — c'est explicitement un objectif V02-D7.

## Décision

**Option C — hybride snapshot serveur (autoritatif) + override client
optimiste**.

### Détails techniques

#### 1. Format de `publishedSnapshot`

- Colonne Prisma : `publishedSnapshot Json?` sur `Seance` (nullable,
  null tant que la séance n'a jamais été publiée).
- Contenu : **JSON normalisé** (clés triées récursivement, dates
  ISO 8601 UTC, tableaux d'ids triés lexicographiquement).
- Util `stableStringify(obj)` créé dans `packages/utils/src/json-stable.ts`
  (LOT 0.4 — cette session). Garantit que `stableStringify(a) ===
stableStringify(b)` ssi les objets sont sémantiquement égaux pour
  les champs comparés. Utilisé backend ET front.

#### 2. Champs comparés (« comparable shape »)

Une fonction `extractComparable(seance)` produit la projection
canonique à snapshoter / comparer :

```ts
function extractComparable(s: SessionV2) {
  return {
    libelle: s.libelle,
    type: s.type,
    sousType: s.sousType ?? null,
    startAt: s.startAt.toISOString(),
    endAt: s.endAt.toISOString(),
    moduleId: s.moduleId ?? null,
    enseignantId: s.enseignantId ?? null,
    salleId: s.salleId ?? null,
    intervenantNom: s.intervenantNom ?? null,
    description: s.description ?? null,
    classeIds: [...s.classeIds].sort(),
  };
}
```

**Pas inclus** (volontairement) : `id`, `createdAt`, `updatedAt`,
`lastModifiedAt`, `lastPublishedAt`, `isPublished`, `hasUnpublishedChanges`,
`publishedSnapshot` lui-même. Sinon comparaison infiniment circulaire.

Cette fonction vit dans `packages/contracts/src/planning/comparable.ts`
pour être importable côté backend ET front (même résultat des deux
côtés).

#### 3. Règles côté backend

| Évènement                          | `publishedSnapshot`                        | `hasUnpublishedChanges`                                                                     |
| ---------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| **POST /api/sessions** (création)  | `null`                                     | `true`                                                                                      |
| **PUT /api/sessions/:id**          | inchangé                                   | `stableStringify(extractComparable(post)) === stableStringify(snapshot)` ? `false` : `true` |
| **POST /api/sessions/publish**     | `stableStringify(extractComparable(curr))` | `false`                                                                                     |
| **GET /api/sessions...** (lecture) | renvoyé tel quel                           | recalculé à la volée si null → `true` ; sinon comparaison snapshot                          |

**Note** : `hasUnpublishedChanges` est **stocké** en BD (colonne
`Boolean @default(true)`) plutôt que calculé à chaque lecture. Maintenu
à jour par les writes (POST/PUT/publish). Évite un `JSON.parse` +
comparaison à chaque GET. La cohérence est garantie tant que les writes
respectent le tableau ci-dessus — testé explicitement (cf. ## Plan).

#### 4. Règles côté client (Next.js)

- Le badge `<UnpublishedBadge>` sur `<SessionCard>` lit
  `seance.hasUnpublishedChanges` (autoritatif backend).
- **Override optimiste** : un store léger `useDirtyOverrides()` (Zustand
  ou Context) garde un set `Set<seanceId>` pour les modifs en cours
  non encore PUTées. La carte affiche le badge si **soit** le backend
  dit `true`, **soit** l'override local le dit.
- **Réconciliation** : à chaque réponse `PUT /api/sessions/:id` (ou
  `GET`), l'override local pour cet id est **retiré**. La valeur
  backend devient seule autorité jusqu'à la prochaine édition locale.
- Sur un retour à l'état initial (étape 14 du scénario), le PUT
  renvoie `hasUnpublishedChanges=false`, l'override est retiré, le
  badge disparaît immédiatement (pas d'attente d'un refetch séparé).

#### 5. Limite de taille

- Cap `publishedSnapshot` à **5 KB** par séance (mesuré post
  `stableStringify`). En 2026, les `extractComparable` produisent
  < 1 KB avec 3 classes. La limite protège contre un futur ajout
  involontaire (description longue + 50 classes).
- Si dépassement → log warning pino + erreur 500 (refus du publish).
  Force à raffiner `extractComparable`.

## Conséquences

### Positives

- **UX cohérente avec V2-D7** : retour à l'état initial = badge
  disparaît immédiatement. Multi-éditeur safe (la valeur backend
  réconcilie après chaque réponse).
- **Source de vérité unique** (backend), pas de drift long terme.
- **Util `stableStringify` partagé** : la même comparaison côté
  backend et front, pas de faux positifs sur ordre des clés.
- **Migration V01 → V02 simple** : pour chaque séance V01 avec
  `isPublished=true`, calculer `publishedSnapshot = stableStringify(extractComparable(seance))`
  à la migration data. Pour `isPublished=false`, `publishedSnapshot=null`.

### Négatives

- **Duplication contrôlée** : `extractComparable` et `stableStringify`
  vivent côté front ET backend. Mitigé en les hébergeant dans
  `packages/contracts/` et `packages/utils/` (importés des deux
  côtés).
- **Risque d'oubli** : si un dev ajoute un champ à `Seance` sans
  mettre à jour `extractComparable`, le badge ne réagira pas à ce
  champ. Mitigation : test `dirty-detection.spec.ts` qui itère sur
  tous les champs de `SessionV2Dto` et vérifie qu'au moins un cas
  les couvre.
- **JSON cap 5 KB** : limite théorique pas un problème aujourd'hui,
  à monitorer.

### À surveiller

- Performance : sur publish d'une semaine entière (~30 séances),
  recalcul des 30 snapshots = ~30 `stableStringify` ~ 1-3 ms total.
  Acceptable.
- Drift : créer test `extractComparable.spec.ts` qui s'assure que
  tous les champs « métier » de `SessionV2Dto` sont projetés (vs.
  liste blanche).

## Plan de migration / mise en œuvre

| Étape | Livrable                                                                                                      | Owner        | LOT                     |
| ----- | ------------------------------------------------------------------------------------------------------------- | ------------ | ----------------------- |
| A     | `packages/utils/src/json-stable.ts` (`stableStringify`)                                                       | Salim        | LOT 0.4 (cette session) |
| B     | `packages/contracts/src/planning/comparable.ts` (`extractComparable`)                                         | Salim        | LOT 0.4 (cette session) |
| C     | Migration Prisma : ajout colonnes `publishedSnapshot Json?` + `hasUnpublishedChanges Boolean` ; data-fill V01 | Salim        | LOT 0.3 (cette session) |
| D     | `SeanceService.create/update/publish` met à jour `hasUnpublishedChanges` selon règles §3                      | Oumar        | LOT 2 B.1/B.2/B.4       |
| E     | Store `useDirtyOverrides` + intégration `<SessionCard>` + réconciliation                                      | Oumy         | LOT 3 R.6/R.8           |
| F     | Tests : `dirty-detection.spec.ts` (backend) + composant `<SessionCard>` (front)                               | Oumar + Oumy | LOT 2 / LOT 3           |

## Décision révisable quand

- `publishedSnapshot` dépasse régulièrement 5 KB (besoin de revoir
  `extractComparable` ou de stocker un hash plutôt que le JSON entier)
- Performance publish dégrade (>500 ms pour une semaine)
- Une feature V03+ nécessite un historique (versions multiples) → il
  faudrait stocker un tableau de snapshots, pas un seul

## Liens

- V2-D7 (`vague-02-index.md:41`) : principe acté
- LOT 0.2 (`vague-02-lots.md:16`) : tâche source
- LOT 2 B.1/B.2/B.4 : implémentation backend
- LOT 3 R.6/R.8 : intégration front
- ADR-0007 (auth V02) : contexte de cette PR
