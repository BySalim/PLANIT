# SPEC — VAGUE-02-01 · Refonte formulaire Séance + footer planning RP (LOT 3)

**Vague :** 02 · **Lot officiel :** 3 (Frontend RP — formulaire, tâches R.1–R.8)
**Auteur :** Salim · **Date :** 2026-05-26 · **Statut :** Approuvée · **Branche :** `feat/salim` (spec) puis `feat/oumy` (implémentation)

> Référence planning : `PLANIT-Strategie-VibeCode/vagues/vague-02-lots.md` (LOT 3, tâches R.1–R.8).
> Décisions structurelles : `vague-02-index.md` (V2-D4 à V2-D10, V2-D12).
> ADR : `docs/architecture/adr/0008-smart-dirty-hybrid.md`.

---

## Objectif

Refondre la modal de création et le drawer d'édition de séance sur `/rp` pour le **nouveau modèle Séance V02** (cf. V2-D4 → V2-D9) consommant les endpoints **`/api/v2/sessions`** déjà livrés en LOT 2. Aligner le footer du planning sur la nouvelle convention boutons (V2 — `vague-02-index.md`).

L'objectif n'est **pas** de réécrire le planning (grille, drag/copy/resize de V01 conservés) ni les interactions avancées (LOT 4 : hover+, multi-select, undo/redo, copy/paste, flash — voir VAGUE-02-03 à venir).

---

## Périmètre

**IN** :

- `<CreateSessionModal>` refondu (R.2) — formulaire **adaptatif au type** Cours / Évaluation / Événement (V2-D5)
- `<ClasseChipsPicker>` (R.3) — sélection multi-classes (V2-D6), réutilisable
- Validation horaires (R.4) — refuse hors `Settings.dayStartHour/dayEndHour` (V2-D10) avec message d'erreur sous l'input
- `<SessionDetailDrawer>` refondu (R.5) — type **désactivé** après création (V2-D8) avec tooltip
- Smart dirty client (R.6) — alimenté par `hasUnpublishedChanges` du backend (autoritatif, V2-D7) avec override optimiste en cours d'édition
- Footer planning RP (R.7) — retirer « Aperçu étudiant » et « Exporter », ordre `[Publier les modifications…, …, Historique]`, libellé « Publier la semaine » → « Publier les modifications »
- `<SessionCard>` (R.8) — indicateur « non publiée » synchronisé sur `hasUnpublishedChanges` (et **non plus** `isPublished` legacy)

**OUT** (gérés ailleurs) :

- Hover créneau vide + bouton « + », drag-select, multi-sélect Ctrl, drag&drop multi, copier/coller, undo/redo, flash messages → **LOT 4** (spec VAGUE-02-03 à rédiger)
- Page Enseignants / UE-Modules / Filières → **LOT 5** (spec VAGUE-02-02)
- Page `/login`, guards, topbar avatar, gestion 401/403 → **LOT 6** (livré)
- Responsivité Enseignant + Étudiant → **LOT 7**
- Historique RP (le bouton reste affiché mais reste non-implémenté V01) → V03

---

## Mapping composant ↔ fichier

| Composant               | Localisation                                                 | Action                                                                    |
| ----------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `<CreateSessionModal>`  | `apps/web/src/components/planning/create-session-modal.tsx`  | **Refonte complète** (V01 supprime/réécrit le contenu, props compatibles) |
| `<SessionDetailDrawer>` | `apps/web/src/components/planning/session-detail-drawer.tsx` | **Refonte complète** (idem)                                               |
| `<SessionCard>`         | `apps/web/src/components/planning/session-card.tsx`          | Patch : indicateur lié à `hasUnpublishedChanges`                          |
| `<ClasseChipsPicker>`   | `apps/web/src/components/planning/classe-chips-picker.tsx`   | **Nouveau** (réutilisable LOT 5 si besoin)                                |
| `<PublishButton>`       | `apps/web/src/components/planning/publish-button.tsx`        | Patch : libellé + compteur dérivé `hasUnpublishedChanges`                 |
| `<PlanningToolbar>`     | `apps/web/src/components/planning/planning-toolbar.tsx`      | Patch : footer = retirer Exporter + Aperçu étudiant, réordre              |
| Page `/rp`              | `apps/web/src/app/(planit)/rp/page.tsx`                      | Bascule fetch vers `/api/v2/sessions` (au lieu de `/api/sessions`)        |

---

## Contrats consommés (depuis `@planit/contracts`)

V02 (`planning/planning-v2.ts`) :

- `sessionV2Schema` / `SessionV2Dto`
- `sessionTypeV2Schema` (`COURS` | `EVALUATION` | `EVENEMENT`)
- `sessionSousTypeSchema` (`CM` | `TD` | `TP` | `EXAMEN` | `RATTRAPAGE` | `DEVOIR`)
- `COURS_SOUS_TYPES`, `EVALUATION_SOUS_TYPES` (constantes)
- `createCoursSessionSchema` / `createEvaluationSessionSchema` / `createEvenementSessionSchema` (discriminated union sur `type`)
- `updateCoursSessionSchema` / `updateEvaluationSessionSchema` / `updateEvenementSessionSchema`
- `enseignantRefSchema` / `EnseignantRef`

Settings : `settingsSchema` / `SettingsDto` (depuis `packages/contracts/src/entities/settings.ts`).

---

## Endpoints consommés (LOT 2 backend)

| API                                                              | Composant                       | Quand                                                     |
| ---------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------- |
| `GET /api/v2/sessions?weekStart&classeId?&teacherId?&studentId?` | `/rp` page                      | mount + changement de semaine                             |
| `GET /api/v2/sessions/stats?weekStart&classeId?`                 | `<StatsBar>`                    | mount + changement de semaine                             |
| `POST /api/v2/sessions`                                          | `<CreateSessionModal>`          | submit création                                           |
| `GET /api/v2/sessions/:id`                                       | `<SessionDetailDrawer>`         | ouverture drawer                                          |
| `PUT /api/v2/sessions/:id`                                       | `<SessionDetailDrawer>`         | submit édition                                            |
| `POST /api/v2/sessions/publish`                                  | `<PublishButton>`               | clic « Publier les modifications »                        |
| `GET /api/settings`                                              | provider racine `/rp`           | mount (cache long, invalidate manuel)                     |
| `GET /api/enseignants`                                           | `<CreateSessionModal>` / drawer | option du select enseignant (Cours/Évaluation uniquement) |
| `GET /api/ues` (avec modules)                                    | `<CreateSessionModal>` / drawer | option du select module                                   |

Tous les endpoints requièrent le rôle `RESPONSABLE_PROGRAMME` (déjà guardé serveur).

---

## Modèle Séance V02 — règles métier

### Type & sousType

```
COURS       → sousType ∈ { CM, TD, TP }                  (optionnel)
EVALUATION  → sousType ∈ { EXAMEN, RATTRAPAGE, DEVOIR }  (optionnel)
EVENEMENT   → sousType = null                            (interdit)
```

Le `sousType` n'est **généralement pas requis** (V2-D4) — le sélecteur affiche une option « Aucun » par défaut.

### Champs visibles selon le type

| Champ              | COURS                   | EVALUATION                    | EVENEMENT                   |
| ------------------ | ----------------------- | ----------------------------- | --------------------------- |
| `libelle`          | ✅ requis               | ✅ requis                     | ✅ requis                   |
| `type`             | ✅ sélecteur            | ✅ sélecteur                  | ✅ sélecteur                |
| `sousType`         | ✅ optionnel (CM/TD/TP) | ✅ optionnel (EX./RATT./DEV.) | ❌ caché                    |
| `moduleId`         | ✅ requis               | ✅ requis                     | ❌ caché                    |
| `enseignantId`     | ✅ requis               | ✅ requis                     | ❌ caché                    |
| `intervenantNom`   | ❌ caché                | ❌ caché                      | ✅ optionnel (string libre) |
| `description`      | ❌ caché                | ❌ caché                      | ✅ optionnel (textarea)     |
| `salleId`          | ✅ optionnel            | ✅ optionnel                  | ✅ optionnel                |
| `classeIds`        | ✅ requis (≥ 1)         | ✅ requis (≥ 1)               | ✅ requis (≥ 1)             |
| `startAt`, `endAt` | ✅ requis               | ✅ requis                     | ✅ requis                   |

**Transition de type dans la modal de création** : changer `type` réinitialise les champs spécifiques à l'ancien type (avec confirmation `confirm()` si des données sont déjà saisies dans ces champs).

### Multi-classes (V2-D6)

- Composant `<ClasseChipsPicker>` : autocomplete + chips
- Liste source : `GET /api/classes` (déjà disponible côté backend V01)
- Min 1 classe (validation Zod et UI)
- Affichage drawer : la séance liste ses N classes en chips read-only avec bouton « Modifier » qui passe en mode édition

### Validation horaires (R.4, V2-D10)

- Au mount de la modal/drawer, récupérer `Settings` (cache TanStack 5 min)
- Validation client miroir backend :
  - `startAt.getHours() < settings.dayStartHour` → erreur sous input `startAt` : « L'heure de début doit être ≥ {dayStartHour}h »
  - `endAt.getHours() > settings.dayEndHour` (ou `=== dayEndHour && minutes > 0`) → erreur sous input `endAt` : « L'heure de fin doit être ≤ {dayEndHour}h »
  - `endAt <= startAt` → erreur sous input `endAt` : « L'heure de fin doit être postérieure à l'heure de début »
- Affichage : texte rouge **immédiatement sous l'input concerné**, pas de toast (V2-D12 : les flash messages sont pour les actions, pas pour la validation)
- Le backend renvoie 400 avec message clair en cas d'incohérence non détectée côté client (failsafe)

### Type lock après création (R.5, V2-D8)

- Le drawer en mode édition affiche le `<Select>` du type **désactivé** (`disabled`)
- Tooltip au hover : « Le type d'une séance ne peut pas être modifié après création. Pour changer de type, supprimez et recréez la séance. »
- Côté backend, le `PUT /api/v2/sessions/:id` rejette tout `type` qui diffère de l'existant (400) — déjà implémenté en LOT 2

### Smart dirty (R.6, V2-D7, ADR-0008)

**Backend autoritatif** : la réponse de chaque endpoint contient `hasUnpublishedChanges: boolean`. Le badge « non publiée » sur `<SessionCard>` est piloté par ce flag.

**Override client optimiste** (UX) :

- Pendant que l'utilisateur édite (drawer ouvert, formulaire dirty), on affiche le badge **immédiatement** sans attendre la réponse du PUT (réactivité)
- Au retour du PUT, on resynchronise sur la valeur serveur
- Si l'utilisateur annule la modif (clic « Annuler »), on n'envoie pas le PUT, donc `hasUnpublishedChanges` reste à sa valeur serveur
- Cas **clé** : si l'utilisateur ramène une séance dirty à son état publié (cf. scénario démo étape 14), le backend détecte `currentState === publishedSnapshot` et renvoie `hasUnpublishedChanges: false` → badge disparaît automatiquement à la réception. Aucune logique de comparaison côté client requise (volontairement — éviter la duplication, le serveur est la source de vérité)

**Compteur du bouton « Publier les modifications »** : `sessions.filter(s => s.hasUnpublishedChanges).length`, recalculé à chaque mise à jour de la query TanStack.

### Footer planning RP (R.7)

Avant V02 (planning-toolbar.tsx V01) :

```
[Publier la semaine (N)]  [Aperçu étudiant]  [Exporter]  [Historique]
```

Après V02 :

```
[Publier les modifications (N)]  [Historique]
```

Changements :

1. « Publier la semaine » → « Publier les modifications »
2. Suppression définitive de « Aperçu étudiant » (pas de retour planifié, vue n'a jamais eu de cas d'usage validé — `vague-02-index.md` OUT)
3. Suppression définitive de « Exporter » (planifié V03 mais réintroduit alors avec un autre placement)
4. « Historique » conservé visuellement, en dernière position. Comportement V01 inchangé (bouton désactivé / visuel only, vraie page V03)

---

## Indicateur "non publiée" (R.8)

Sur `<SessionCard>` :

- Badge ou bordure (au choix Oumy — V01 utilise un trait coloré gauche) actif si `session.hasUnpublishedChanges === true`
- Plus de référence à `session.isPublished` côté UI (le champ reste exposé par l'API pour info debug mais n'est plus utilisé visuellement)
- `<SessionDetailDrawer>` : indicateur identique dans l'en-tête du drawer

---

## États / props (signatures)

```ts
// <CreateSessionModal>
type CreateSessionModalProps = {
  open: boolean;
  onClose: () => void;
  // Pré-remplissage optionnel (déjà utilisé en LOT 4 pour hover+/drag-select, hors scope ici)
  initialValues?: Partial<{
    type: SessionTypeV2;
    startAt: string;
    endAt: string;
    classeIds: string[];
  }>;
  onCreated?: (session: SessionV2Dto) => void;
};

// <SessionDetailDrawer>
type SessionDetailDrawerProps = {
  sessionId: string | null;
  onClose: () => void;
  onUpdated?: (session: SessionV2Dto) => void;
  onDeleted?: (id: string) => void;
};

// <ClasseChipsPicker>
type ClasseChipsPickerProps = {
  value: string[];
  onChange: (classeIds: string[]) => void;
  error?: string;
  min?: number; // default 1
};
```

---

## Stack libs (cohérent V01)

- `react-hook-form` + `@hookform/resolvers/zod` (déjà utilisé V01)
- `discriminated union` Zod côté schemas (déjà câblé dans `planning-v2.ts`)
- TanStack Query pour les `useQuery(['settings'])`, `useQuery(['enseignants'])`, `useQuery(['ues'])`, `useMutation` pour create/update/publish
- Cache settings : `staleTime: 5min`, invalidate manuel si V03 introduit une UI admin

---

## Décisions sensibles à arbitrer pendant l'implémentation

| Sujet                                                                    | Recommandation                                                      | Qui décide     |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------- | -------------- |
| Lib autocomplete chips multi-classes (cmdk, downshift, custom)           | Custom léger (10 classes max attendues) ou downshift si pénible     | Oumy           |
| Animation transition champs entre les 3 types                            | Fade simple, pas de transition complexe                             | Libasse / Oumy |
| Comportement clic « X » sur une chip de classe en mode édition           | Retirer la classe (sans confirmation, undo dispo en LOT 4)          | Oumy           |
| Modal vs drawer pour la création                                         | **Modal** (V01) — drawer réservé à l'édition d'une séance existante | Salim (acté)   |
| Validation Zod sur le client : refire après chaque change ou submit only | `mode: 'onBlur'` + `reValidateMode: 'onChange'` (RHF)               | Oumy           |

---

## Definition of Done (R.1 → R.8)

**Fonctionnel** :

- Création d'une séance de type Événement → pas de champ module/prof affiché, intervenant + description visibles, soumission OK
- Création d'une séance avec 3 classes → apparaît dans les 3 plannings via le filtre `classeId` (vérifié sur 3 onglets)
- Modification puis retour à l'état initial → badge « non publiée » disparaît (backend autoritatif)
- Tentative d'horaire 7h-9h (si `dayStartHour=8`) → message d'erreur rouge sous l'input `startAt`, submit bloqué
- En mode édition, sélecteur de type désactivé avec tooltip
- Footer planning : 2 boutons uniquement, ordre `[Publier les modifications (N), Historique]`, libellé renommé

**Qualité** :

- Aucune erreur console
- `pnpm lint`, `pnpm typecheck`, `pnpm test --filter=web`, `pnpm build` verts en local
- Test unitaire `<CreateSessionModal>` : 1 test par variante de type (Cours/Évaluation/Événement) + 1 test validation horaires + 1 test multi-classes ≥ 1
- Test unitaire `<SessionDetailDrawer>` : 1 test type lock + 1 test smart dirty (mock `hasUnpublishedChanges` qui passe true puis false)

**Documentation** :

- Journal d'agent Oumy `docs/agent-journal/oumy/YYYY-MM-DD-vague02-lot3.md` rédigé en fin de LOT
- `tech-debt.md` mis à jour si des points sont remis à LOT 4 (interactions) ou V03

---

## Hors scope (rappel)

- ❌ Hover créneau vide + bouton « + » → LOT 4
- ❌ Drag-select multi-créneaux → LOT 4
- ❌ Multi-sélect Ctrl + drag&drop + copy/paste → LOT 4
- ❌ Undo/redo (CTRL+Z) → LOT 4
- ❌ Flash messages → LOT 4
- ❌ Pages Enseignants / UE-Modules / Filières → LOT 5 (spec VAGUE-02-02)
- ❌ UI admin de `Settings.dayStartHour/dayEndHour` → V03
