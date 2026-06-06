# Journal — LOT 4 V03 : Formations + Classes (+ fiche + inscription)

> **Membre** : Oumy (`feat/oumy`) · **Date** : 2026-06-03 · **LOT** : Vague 03 — LOT 4 (C.1 → C.5)

## 1. Directives reçues

« Réaliser tout le LOT 4 de la Vague 3 sans casser le code actuel, avec les méthodes les
plus propres/maintenables de la communauté. Suivre les étapes du LOT ; signaler les points
non décidables seul, sinon adopter l'approche la plus intelligente. Se référer à
`PLANIT-Design` pour le frontend. Commits, push et PR en fin de LOT. »

## 2. Décisions techniques (autonomie)

- **Fiche classe en route dédiée `/classes/[id]`** (et non drawer inline) : deep-linkable
  depuis la liste **et** depuis Maquettes (M.6), cohérent avec le socle URLs role-agnostiques.
- **Modal d'inscription dans `components/inscriptions/`** (dossier neutre, pas `rp/`) : il est
  explicitement **partagé RP + AC** → réutilisable tel quel par le LOT 6 (G.5).
- **Modal Formation en état contrôlé local** (pas react-hook-form) à cause des selects
  dépendants maquette → version ; validation conservée via les schémas Zod de `@planit/contracts`.
  Modal Classe en RHF (gabarit `filiere-modal`), pas de dépendance entre champs.
- **Édition Formation = code + double-diplôme** seulement (niveau/filière/version figés,
  affichés en lecture seule) — changer la version d'une formation existante est une opération
  avancée hors périmètre LOT 4.
- **Roster de la fiche en lecture seule** : `GET /classes/:id/etudiants` renvoie des `EtudiantDto`
  sans id d'inscription → pas d'UI de désinscription (non requise par les done-criteria) ; focus
  sur le flux d'**ajout** qui, lui, est exigé.
- **Onglet « Suivi pédagogique » de la fiche = synthèse lecture seule** (pas de bouton
  « Terminer ») pour ne pas empiéter sur la page Suivi (LOT 5 / E.4).
- **Nouvelle query v3 `useClassesV3Query`** distincte de `useClassesQuery` (queries-v2, schéma
  lite du séance-picker) : ne pas fusionner pour ne pas casser le picker (réponse `ClasseV3Dto`
  = sur-ensemble, parse sans souci côté picker).
- **Filtres année = année courante par défaut** (résolu via `useAnneesQuery`, `EN_COURS`).

## 3. Décisions soumises à validation (Salim)

- **Réassignation du LOT 4** : owner officiel = Libasse (cf. `vague-03-lots.md`). Réalisé sur
  `feat/oumy` après vérification qu'aucune collision n'existait (sa branche ne portait que le
  planning V02). **À acter par le TL** ; statuts de la vague non modifiés (fichier sur `master`
  du repo stratégie — non touché sans demande).
- **C.1 (micro-spec)** est nominalement à Libasse ; rédigée ici (`VAGUE-03-02`) pour satisfaire
  la phase SPEC du workflow. À confirmer/fusionner si Libasse en avait une en cours.

## 4. Modifications

**Créés**

- `docs/specs/VAGUE-03-02-formations-classes.md` (spec C.1)
- `apps/web/src/app/(planit)/(gestion)/formations/page.tsx` (C.2)
- `apps/web/src/components/rp/formations/formation-modal.tsx` (C.2)
- `apps/web/src/app/(planit)/(gestion)/classes/page.tsx` (C.3)
- `apps/web/src/components/rp/classes/classe-modal.tsx` (C.3)
- `apps/web/src/app/(planit)/(gestion)/classes/[id]/page.tsx` (C.4)
- `apps/web/src/components/inscriptions/inscription-modal.tsx` (C.5)
- `apps/web/src/components/inscriptions/inscription-modal.test.tsx` (3 tests)

**Modifiés**

- `apps/web/src/lib/queries-v3.ts` (+ formations/classes/roster/suivi)
- `apps/web/src/lib/mutations-v3.ts` (+ formation/classe/inscription)
- `apps/web/src/components/layout/sidebar.tsx` (Formations + Classes → routes réelles)

## 5. Phase CHECK — résultats

- **typecheck** (`tsc --noEmit`) : ✅ vert (0 erreur).
- **lint** (`pnpm lint`) : ✅ vert.
- **tests** (`vitest run`) : ✅ 50/50 (11 fichiers), dont 3 nouveaux (flux email du modal).
- **build** (`next build`) : ✅ vert — routes générées `/formations`, `/classes` (statique),
  `/classes/[id]` (dynamique). A révélé 1 erreur lint stricte (apostrophe JSX) + 3 warnings
  hooks-deps, **corrigés** (mémoïsation des tableaux `?? []`).
- **smoke navigateur** : ⚠️ **non réalisé localement** — backend non démarrable sur ce poste
  Windows (Prisma client régénéré OK, mais Postgres conteneur rejette les identifiants `.env`
  pourtant corrects = mismatch de volume persistant, hors périmètre LOT 4 et risqué à « réparer »).
  À faire dans l'environnement Ubuntu sain (stack complète). Verification statique forte tenant
  lieu de garantie (typecheck + lint + tests + build verts ; contrats partagés validés
  directement contre les controllers backend).

## 6. Surprises

- **Environnement local désynchronisé** après merge `develop` : deps `html-to-image`/`jspdf`
  (spike 0.8) non installées + **Prisma client non régénéré** (263 erreurs TS backend). Résolu
  par `pnpm install` + `prisma generate` (routine, aucune modif de dépendance).
- **`pnpm lint` ≠ `next build` lint** : le build active `react-hooks/exhaustive-deps` +
  `react/no-unescaped-entities` que `pnpm lint` ne signale pas. Le build est le vrai garde-fou
  pour les pages App Router.
- **Postgres** : conteneur up/healthy mais auth refusée (P1000) → blocage du smoke (cf. §5).

## 7. Suite

- **PR `feat/oumy` → `develop`** ouverte (LOT 4).
- **Smoke navigateur** à dérouler côté Ubuntu : login RP (`aminata.diallo@planit.test` /
  `Test1234!`), créer formation+classe (année courante), inscrire un étudiant (nouveau + connu),
  vérifier la fiche + filtres.
- Le **modal d'inscription** est prêt à être réutilisé par le LOT 6 (G.5, espace AC).
- Aucun soft-lock posé (pas de ressource partagée touchée).

## 8. Mises à jour annexes

- Aucune modif de `CLAUDE.md`, d'ADR ou de `prisma/schema.prisma`.
- Statuts de la vague (repo stratégie, `master`) **non modifiés** sans demande — à flipper
  C.1→C.5 = `[x]` une fois le LOT validé par le TL.
