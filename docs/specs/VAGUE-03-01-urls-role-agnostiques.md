# VAGUE-03-01 — URLs sans nom d'acteur (unification role-aware)

> **Statut** : SPEC — en attente validation TL (plan ci-dessous). Zéro code avant GO.
> **Demandeur** : Salim (TL). **Branche** : `feat/salim` (base `develop` @ v0.2.0).
> **Lié à** : tech-debt `FACTOR-PAGES`, `TD-022` (acteur courant hardcodé).

## 1. Problème

Les routes exposent le rôle dans l'URL : `/rp`, `/etudiant`, `/enseignant`,
`/enseignant/planning`, `/rp/enseignants`… On veut **retirer tout nom d'acteur de
la barre d'adresse, sans le remplacer** par un autre segment. Les URLs deviennent
**role-agnostiques** ; la page rend le bon contenu selon le rôle **authentifié**.

Constat technique (PROBE) : les pages enseignant/étudiant sont des quasi-jumelles
(home 78 %, planning 92 %, détail 81 %, MobileShell 92 % identiques). Les seules
différences sont systématiques : hook acteur, `variant`, libellé rôle, chaînes de
route. → fusion nette (c'est la dette `FACTOR-PAGES`).

## 2. Décision (approche B — unification)

URLs cibles, **sans segment de rôle** :

| Avant                                              | Après          | Rôles                                           | RBAC front         |
| -------------------------------------------------- | -------------- | ----------------------------------------------- | ------------------ |
| `/rp`                                              | `/`            | RP/AC : grille planning ; Ens./Étu. : dashboard | tout authentifié   |
| `/enseignant`, `/etudiant`                         | `/`            | (idem, rendu selon rôle)                        | tout authentifié   |
| `/enseignant/planning`, `/etudiant/planning`       | `/planning`    | Ens./Étu./Délégué                               | groupe `(consult)` |
| `/enseignant/seance/[id]`, `/etudiant/seance/[id]` | `/seance/[id]` | Ens./Étu./Délégué                               | groupe `(consult)` |
| `/rp/enseignants`                                  | `/enseignants` | RP/AC                                           | groupe `(gestion)` |
| `/rp/filieres`                                     | `/filieres`    | RP/AC                                           | groupe `(gestion)` |
| `/rp/ue-modules`                                   | `/ue-modules`  | RP/AC                                           | groupe `(gestion)` |

Mécanisme RBAC : **route groups Next.js** `(consult)` et `(gestion)` — invisibles
dans l'URL — portent le `RequireAuth roles={…}` (remplacent les layouts d'acteur).
Le **RBAC réel reste serveur** (guards NestJS, inchangés) ; le front = UX + filet.

## 3. Design

```
app/
  page.tsx                  ❌ SUPPRIMÉ (résolveur role-home — conflit avec / ci-dessous)
  (planit)/
    layout.tsx              (inchangé : QueryProvider + listeners)
    page.tsx                ➕ HOME role-aware → /  (RequireAuth roles={[]} = tout auth)
                               RP/AC  → <RpPlanningView/>   (corps actuel de rp/page)
                               Ens/Étu → <ActorHomeView variant/>  (corps actuel enseignant/page)
    (consult)/
      layout.tsx            ➕ RequireAuth ENSEIGNANT/ETUDIANT/RESPONSABLE_CLASSE
      planning/page.tsx     ➕ fusion enseignant+etudiant/planning (variant selon rôle)
      seance/[id]/page.tsx  ➕ fusion enseignant+etudiant/seance
    (gestion)/
      layout.tsx            ➕ RequireAuth RESPONSABLE_PROGRAMME/ASSISTANT_PROGRAMME
      enseignants/page.tsx  ← déplacé de rp/enseignants (inchangé sauf breadcrumb)
      filieres/page.tsx     ← déplacé de rp/filieres
      ue-modules/page.tsx   ← déplacé de rp/ue-modules
```

Supports :

- **`useCurrentActor()`** ([hooks/]) : lit `useAuth()`, renvoie `{ id, fullName, role, variant }`.
  Fusionne `useCurrentTeacher`/`useCurrentStudent` (garde la logique seed-id pour
  l'instant — le câblage sur l'id auth réel reste `TD-022`, hors scope ici).
- **`<MobileShell>`** unifié (paramétré par `variant`), remplace les 2 actuels.
- **`ROLE_HOME`** → `/` pour tous les rôles. `login` + `RequireAuth` (mismatch)
  redirigent vers `/`. `middleware.ts` inchangé (gating cookie + returnUrl marchent
  en URLs propres).
- **Redirections legacy** (`next.config.ts > redirects()`, permanentes) : `/rp`→`/`,
  `/enseignant`→`/`, `/etudiant`→`/`, `…/planning`→`/planning`,
  `…/seance/:id`→`/seance/:id`, `/rp/enseignants`→`/enseignants`, etc. → pas de 404
  sur bookmarks/liens existants.
- **Liens internes** : sidebar (4 hrefs), breadcrumbs RP, `router.push` des pages →
  URLs propres.

## 4. Scope

**IN** : structure de routes ci-dessus, fusion des pages jumelles, `useCurrentActor`,
MobileShell unifié, redirections legacy, mise à jour liens + `ROLE_HOME` + tests.

**OUT** : câblage acteur courant sur l'id auth réel (`TD-022`) ; refonte du **contenu**
des pages (on déplace/fusionne à iso-fonctionnel) ; pages en `href: '#'` (placeholders) ;
renommage des **endpoints API** (`/api/enseignants` etc. restent inchangés).

## 5. Risques

| Risque                                                                   | Mitigation                                                                                                                    |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Conflit route `/` (résolveur `app/page.tsx` vs home `(planit)/page.tsx`) | Supprimer `app/page.tsx` ; `/` rend le home role-aware (plus de redirect)                                                     |
| Lien oublié → 404                                                        | Redirections legacy + grep exhaustif des chaînes `/rp` `/enseignant` `/etudiant` (hors `/api`) + smoke navigateur des 3 rôles |
| Régression RBAC (un rôle accède à une page interdite)                    | `RequireAuth` par groupe + guards serveur inchangés ; test par rôle                                                           |
| Tests cassés (smoke, return-url) référencent les vieilles routes         | Mis à jour dans le même lot                                                                                                   |
| Home `/` lourde (grille RP) montée pour tous                             | Role-switch tôt : le composant RP n'est rendu que pour RP/AC                                                                  |
| Active-state sidebar avec href `/`                                       | Logique best-match existante : `/` actif seulement si `pathname === '/'`                                                      |

## 6. CHECK prévu

`typecheck` + `lint` + `test` (web) verts ; build prod ; smoke navigateur **par rôle**
(login RP → `/` grille + `/enseignants`/`/filieres`/`/ue-modules` ; login Enseignant
→ `/` dashboard + `/planning` + `/seance/:id` ; login Étudiant idem) ; vérif
redirections legacy (`/rp` → `/`, etc.) ; vérif qu'un rôle non autorisé sur
`/enseignants` est renvoyé sur `/`.

## 7. Plan d'exécution

Voir le tableau présenté au TL (`# · Étape · Fichiers · Tests · Risque`). Aucune
écriture de code applicatif avant validation explicite du plan.
