# Tech Debt PLANIT

> Dette technique tracée par jalon-cible. Les items **résolus** lors de la rétro
> Vague 01 (console.log, exception filter, rate limit, redacter logger, CORS partagé,
> etc.) sont retirés. Quand une dette est livrée, supprimer la ligne et noter le
> commit dans `docs/agent-journal/`.

---

## Vague 02 — Auth + RBAC + conflits salles

Tout ce qui dépend de l'arrivée de l'authentification, du modèle `User` enrichi
et des guards de rôles.

| ID                 | Description                                                                                                                                 | Impact                                                                                                                                              | Priorité |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| TD-003             | `MailService` stub — pas de provider email réel                                                                                             | Pas d'emails transactionnels (reset password V02 bloqué)                                                                                            | Moyenne  |
| TD-006             | `prisma.seed` défini dans `package.json#prisma` (déprécié)                                                                                  | Warning Prisma 7, migration requise vers `prisma.config.ts`                                                                                         | Faible   |
| TD-008             | Tests backend (`apps/backend/test/`) non typecheckés par `tsc`                                                                              | SWC strippe les types sans les vérifier — erreurs de type non détectées dans les specs                                                              | Faible   |
| TD-009             | LOT 2 (R.12) — undo-redo des séances sur `<PlanningGrid>`                                                                                   | Drag/resize/copier-coller livrés (V1) ; historique undo/redo toolbar reste V02                                                                      | Moyenne  |
| TD-010             | LOT 2 (R.7/R.8) — listes hardcodées dans `apps/web/src/lib/seed-refs.ts`                                                                    | Création/édition séance limitée aux IDs seed ; impossible d'ajouter une classe/module sans rebuild                                                  | Haute    |
| TD-011             | LOT 2 — modes de vue Classe/Salle/Prof désactivés dans `<ViewModeTabs>`                                                                     | Vue planning limitée au mode Classique V1                                                                                                           | Moyenne  |
| TD-014             | LOT 2 — recherche topbar non branchée (`<input>` visuel uniquement)                                                                         | Le RP ne peut pas chercher module/prof/salle — câbler sur un service de recherche                                                                   | Moyenne  |
| TD-016             | LOT 2 — jours fériés hardcodés dans `apps/web/src/lib/holidays.ts`                                                                          | Pas de service backend — à exposer via API + admin UI                                                                                               | Moyenne  |
| TD-017             | LOT 2 — vue "Jour" désactivée dans `<ViewScopeToggle>`                                                                                      | Affichage day-by-day du planning à câbler                                                                                                           | Faible   |
| TD-018             | LOT 2 — `module.color` non exposé par le contrat                                                                                            | Couleur déterminée par hash module.id V1, palette change si la seed bouge. Ajouter `color` à `ModuleRef`                                            | Moyenne  |
| TD-019             | LOT 2 — undo/redo + sélecteur classe + exporter = stubs disabled                                                                            | Pas d'historique, pas de filtrage par classe UI, pas d'export                                                                                       | Moyenne  |
| TD-020             | LOT 2 — compteurs Topbar hardcodés (3 conflits / 5 demandes / 3 notifs)                                                                     | Demo V1 sans backend — brancher sur `useConflictsQuery / useDemandsQuery / useNotifsQuery`                                                          | Moyenne  |
| TD-021             | LOT 2 (R.12) — pas de validation conflit au collage / resize                                                                                | Même limite V1-D4 que le drag : POST/PUT sans check salle/prof — brancher sur le service conflits V02                                               | Moyenne  |
| TD-022             | `useCurrentTeacher()` et `useCurrentStudent()` retournent un acteur hardcodé (V1, pas d'auth)                                               | Le `userId` envoyé au WebSocket et le filtre `teacherId` dépendent de constantes — remplacer par contexte auth                                      | Haute    |
| TD-023             | LOT 3 — `<Sidebar>` hardcodée RP (nav + profil Aïssatou Diallo)                                                                             | L'enseignant voit la nav RP complète (Conflits, Demandes, Étudiants, Salles). Paramétrer par rôle (TD-SIDEBAR)                                      | Moyenne  |
| TD-024             | LOT 3 — `<Topbar>` : bouton "Demandes" (InboxIcon) visible côté enseignant                                                                  | RP-spécifique mais affiché partout. Ajouter prop `variant` ou contexte auth                                                                         | Moyenne  |
| TD-025             | LOT 3 — Item "Planning" de la sidebar pointe vers `/rp` même côté enseignant                                                                | L'enseignant clique sur "Planning" et atterrit sur la vue RP. Résoudre dynamiquement selon rôle (TD-023)                                            | Moyenne  |
| TD-026             | LOT 3 — Pas de tests unitaires sur les nouveaux composants/hooks enseignant                                                                 | Couverture 0% sur `HeroCurrentSession`, `SessionsTodayList`, `SessionDetailView`, `useRealtimeSessions`, etc.                                       | Moyenne  |
| TD-027             | LOT 3 — `<MobileShell>` rendu tel quel sur desktop (simulation du mobile)                                                                   | Layout `max-w-md` sur tous viewports. Volontaire V1 — revenir à un responsive switch quand Expo prend le relais                                     | Moyenne  |
| FACTOR-PAGES       | Factoriser `/etudiant/page.tsx` et `/enseignant/page.tsx` quasi-identiques                                                                  | Duplication de logique d'accueil — attend `useCurrentActor()` (TD-022) pour mutualiser                                                              | Moyenne  |
| FUSION-PLANNING    | Fusion `<PlanningGrid>` (RP, édition) vs `<WeekTimeline>` (Enseignant/Étudiant, lecture)                                                    | Deux composants distincts V1 — décision de fusion ou séparation actée par ADR à écrire début V02                                                    | Moyenne  |
| REFACTOR-GRID      | Refactoriser `<PlanningGrid>` (547 lignes) vers ≤350                                                                                        | Composant trop gros — extraire les handlers drag/resize/paste, possiblement un `useGridInteractions` hook                                           | Moyenne  |
| REPOSITORY-PATTERN | Extraire `SeanceRepository` du `SeanceService` (Prisma direct en V1)                                                                        | À faire conjointement avec `AuthRepository` V02 pour éviter deux refacto consécutives                                                               | Faible   |
| SIDEBAR-ROLE       | Paramétrer `<Sidebar>` et `<Topbar>` par rôle (prop `variant` ou contexte auth)                                                             | Aujourd'hui hardcodé RP — bloque l'expérience enseignant/étudiant web                                                                               | Moyenne  |
| MIDDLEWARE-RBAC    | Middleware Next.js (`apps/web/src/middleware.ts`) pour redirections selon rôle                                                              | Pas de garde-fou web — un user peut taper `/rp` même non-RP                                                                                         | Haute    |
| USE-AUTH-HOOK      | Hook `useAuth()` + `useCurrentActor()` (remplace les hooks hardcodés V1)                                                                    | Pré-requis à TD-022, TD-023, TD-024, TD-025, FACTOR-PAGES                                                                                           | Haute    |
| WS-AUTH            | Sécuriser le handshake WebSocket via JWT (fix faille V1 documentée ADR-0004)                                                                | Aujourd'hui `userId` envoyé par le client sans vérification — un attaquant peut s'abonner aux events d'autrui                                       | Haute    |
| TD-028             | LOT 2 — `apps/backend` ne résout pas `@planit/utils` (moduleResolution tsconfig)                                                            | `stableStringify` accessible via subpath (`@planit/utils/json-stable`) ou exports map — à fixer quand SeanceService V2 consommera l'util (ADR-0008) | Moyenne  |
| TD-029             | LOT 2 — Schéma Prisma **dual** V01+V02 : colonnes legacy `Seance.type/status/classeId/teacherId` à supprimer après refactor `SeanceService` | Migration `DROP COLUMN` à écrire dans le PR LOT 2. Idem `Module.name` → migré vers `libelle`                                                        | Moyenne  |
| TD-030             | LOT 2 — Backfill `SeanceClasse` depuis `Seance.classeId` (singulier) et `Seance.enseignantId` depuis `Seance.teacherId`                     | À faire dans la même PR que LOT 2 B.1/B.2 pour cohérence multi-classes + Enseignant 1-1                                                             | Haute    |

---

## Vague 03+ — AC enrichi, notifications, exports

| ID           | Description                                                                    | Impact                                                                                                       | Priorité | Vague cible |
| ------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | -------- | ----------- |
| WS-SCALE     | Adapter Redis `@socket.io/redis-adapter` quand on passe à 2+ instances backend | Aujourd'hui 1 process = OK ; en multi-process, un client connecté au réplica A ne reçoit pas les events de B | Moyenne  | V03         |
| LUCIDE-ICONS | TD-013 — Migrer `packages/ui/src/icons/` inline SVG vers `lucide-react`        | Maintenance manuelle des icônes — standardisation via Lucide                                                 | Faible   | V03         |
| TD-007       | `playwright install chromium` non exécuté localement                           | Tests e2e non lançables hors CI                                                                              | Moyenne  | V03         |

---

## Vague 04 — Mobile + WhatsApp + SMS

| ID          | Description                                                                     | Impact                                                                            | Priorité |
| ----------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------- |
| TD-001      | `apps/mobile` squelette — Expo non configuré                                    | Aucun dev mobile possible                                                         | Haute    |
| TD-002      | `apps/whatsapp-bot` squelette — Baileys non intégré                             | Pas de diffusion WhatsApp                                                         | Haute    |
| MOBILE-DEPS | `apps/mobile` ne consomme pas encore `@planit/design-tokens` ni `@planit/utils` | Une fois Expo bootstrappé, brancher les packages partagés (tokens + helpers date) | Haute    |
| CI-MOBILE   | Pas de step build mobile en CI                                                  | Aucun garde-fou TS/lint pour `apps/mobile` une fois activé                        | Haute    |

---

## Nice-to-have (sans vague-cible)

| ID           | Description                                                                            | Impact                                                                     | Priorité |
| ------------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------- |
| TD-012       | LOT 2 — Sidebar : drag-resize partiel vs proto                                         | Resize sidebar livré (iter. B), écarts résiduels vs `PLANIT-IA/` à affiner | Faible   |
| DISK-CLEANUP | Script de nettoyage `pnpm-store` + `node_modules` orphelins (incident Oumy 2026-05-22) | 5+ GB récupérables, libère le disque dev Windows                           | Faible   |

---

## Comment ajouter une dette

1. Identifier le jalon-cible (V02 / V03+ / V04 / Nice-to-have).
2. Insérer une ligne dans la bonne section avec ID stable (`TD-NNN`,
   `<DOMAIN>-<TOPIC>`, etc.).
3. Décrire l'impact en 1 ligne — pas la solution.
4. Si > 1h de chantier, créer une issue GitHub via `/tech-debt` et lier l'ID ici.
5. À la livraison, supprimer la ligne et le mentionner dans le journal d'agent.

## Comment retirer une dette

- Quand le code qui la supportait est mergé sur `develop` et que les
  tests passent.
- Ajouter une mention « Tech-debt levée : `<ID>` » dans le journal d'agent
  ou le commit message.
