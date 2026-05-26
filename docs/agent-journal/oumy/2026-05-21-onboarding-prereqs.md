# Journal d'agent — Onboarding & vérification prérequis

**Date :** 2026-05-21
**Membre :** Oumy (`feat/oumy`)
**Slug :** `onboarding-prereqs`
**Durée :** ~2h

---

## Directives reçues

- Init de session complète (prompt 10) : identification, sync repo, env local, BD, config Claude, rattrapage de contexte
- Vérifier que tous les prérequis sont en place pour démarrer LOT 2 (Frontend RP)
- Résoudre proprement les blocages identifiés

---

## Décisions techniques

| Décision                                                             | Justification                                                                                                                                                                           |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/.gitignore` créé avec `next-env.d.ts` ignoré               | Fichier généré auto par Next.js, bloquait le rebase initial sur develop. Au lieu de stash récurrent, gitignore définitif.                                                               |
| `apps/backend/.env` créé depuis `.env.example` + conversion CRLF→LF  | `cp` sur Windows produit du CRLF, mais ce n'était pas la cause du P1000 (testé). Conservé en LF par convention Unix.                                                                    |
| `DATABASE_URL` modifié `localhost` → `127.0.0.1`                     | Tentative pour contourner une résolution DNS IPv6/IPv4 ambiguë sur Windows. Pas d'effet sur le P1000 mais préférable pour clarté.                                                       |
| Schéma BD appliqué via SQL brut (`docker exec psql < migration.sql`) | Bypass nécessaire car `prisma migrate dev` échoue systématiquement (cf. surprises). 5 tables créées correctement (users, classes, modules, salles, seances).                            |
| Workflow LOT 2 démarré sans backend local (mock-first)               | Avec 2.7 GB de disque libre, WSL2 impossible. Option pragmatique retenue : R.2 (`<PlanningGrid>`) est un composant pur sans fetch, peut être codé immédiatement. MSW arrivera pour R.4. |

---

## Décisions soumises à validation

Aucune dans cette session — toutes les modifs sont locales à la branche `feat/oumy` ou en tech-debt.

À soumettre à Salim avant LOT 2 :

- Choix de TanStack Query vs `fetch` natif (déjà identifié dans la vague comme décision sensible)
- Choix de MSW vs alternative pour les mocks API frontend
- Long terme : résolution propre du blocage Prisma Windows (cf. TD-011)

---

## Modifications effectuées

### Sync repo

- `git rebase origin/develop` → feat/oumy à jour avec develop (10 commits récupérés : topbar actor-selector, contracts, icons, seed, brand, etc.)
- `apps/web/.gitignore` créé (next-env.d.ts ignoré)

### Setup environnement

- `corepack enable pnpm` → pnpm 10.33.4 restauré (avait disparu après switch Node 20 → 22 via nvm)
- `pnpm install` → 2m02s, node_modules workspaces générés
- `apps/backend/.env` créé depuis `.env.example`
- Docker services up (postgres, redis, minio) — pull des images effectué
- `pnpm rebuild prisma @prisma/engines @prisma/client` → `schema-engine-windows.exe` téléchargé (18.9 MB)

### Application schéma BD

- `docker compose exec -T postgres psql -U planit -d planit_dev < migration.sql` → 5 tables + 3 enums créés
- Le seed n'a PAS été exécuté (échec Prisma Client — cf. surprises)

### Documentation

- `docs/tech-debt.md` : ajout TD-011 (Prisma Windows DLL) et TD-012 (pnpm postinstall après switch Node)
- `docs/agent-journal/oumy/2026-05-21-onboarding-prereqs.md` (ce fichier)

---

## Résultats CHECK

| Vérification                               | Statut | Notes                                                                               |
| ------------------------------------------ | ------ | ----------------------------------------------------------------------------------- |
| `git status` clean après rebase            | ✅     | Seul `apps/web/.gitignore` non-tracké (à committer)                                 |
| Node v22.22.3                              | ✅     | Requis >= 22                                                                        |
| pnpm 10.33.4                               | ✅     | Restauré via corepack                                                               |
| `pnpm install`                             | ✅     | Workspaces installés                                                                |
| Docker compose up                          | ✅     | postgres + redis + minio healthy                                                    |
| TCP `127.0.0.1:5432`                       | ✅     | Confirmé via `net.connect` Node.js                                                  |
| `psql` interne container                   | ✅     | `SELECT 1;` OK                                                                      |
| `pnpm --filter @planit/backend db:migrate` | ❌     | **P1000 systématique** (cf. surprises)                                              |
| `pnpm --filter @planit/backend db:seed`    | ❌     | Même erreur que migrate                                                             |
| Migration SQL via psql brut                | ✅     | 5 tables créées                                                                     |
| `pnpm --filter @planit/web dev`            | ✅     | Ready en 5.6s, port 3000. `/` → 307 redirect `/rp`, `/rp` → 200 avec topbar visible |

---

## Surprises

### 🔴 Bug Prisma 6.19.3 Windows DLL (TD-011)

**Symptôme** : Toute commande Prisma (`migrate dev`, `migrate status`, `db push`, et Prisma Client direct via `$queryRaw`) échoue avec :

```
Error: P1000: Authentication failed against database server,
the provided database credentials for `(not available)` are not valid.
```

**Diagnostic complet** :

- Postgres tourne et accepte les connexions (`psql` interne container OK)
- TCP `127.0.0.1:5432` joignable depuis Node.js (`net.connect` OK)
- `pg_hba.conf` modifié en `trust` (aucune auth nécessaire) → **P1000 persiste**
- Les logs Postgres montrent **0 tentative de connexion** depuis Prisma (seul `pg_isready` du healthcheck apparaît)
- DLL `query_engine-windows.dll.node` charge correctement (test `require()`)
- Binaire `schema-engine-windows.exe` présent et fonctionnel (`--version` OK)
- Pas de proxy système (ProxyEnable=0)
- Encodage `.env` propre (LF, ASCII)

**Conclusion** : Le DLL Prisma Windows échoue **avant** de tenter une connexion TCP. Le `(not available)` est en fait le username redacté dans le message d'erreur (sécurité Prisma 6), pas une indication que le credential est manquant. C'est un bug ou une incompatibilité spécifique à cette combinaison Windows + Prisma 6.19.3 + Docker Desktop.

**Workarounds identifiés** :

- WSL2 (impossible sur cette machine : seulement 2.7 GB libres sur C:)
- `@prisma/adapter-pg` (touche `schema.prisma` — décision sensible à soumettre à Salim)
- Postgres natif Windows (sans Docker port mapping)

### 🟡 pnpm 10 + switch Node version (TD-012)

`pnpm install` ne réexécute pas les `postinstall` si `node_modules` existe déjà. Après switch nvm Node 20 → 22, les binaires Prisma (téléchargés pendant le postinstall) ne sont pas régénérés pour le bon target Node. Fix : `pnpm rebuild prisma @prisma/engines @prisma/client`.

### 🟢 LOT 0 mostly already done dans develop

Plusieurs tâches `[ ]` dans la vague-01-mvp-planning.md sont en fait `[x]` dans develop (0.1, 0.4-0.7, 0.9). Le fichier vague n'a pas été mis à jour après le merge de la PR de Salim. À signaler à Salim pour qu'il mette à jour les statuts.

### 🟢 Disque saturé (2.7 GB libres / 118 GB total)

Découvert pendant l'investigation WSL2. Probablement la cause indirecte de lenteurs ailleurs. Pas de fix dans cette session, mais à nettoyer avant tout autre install lourd.

---

## Suite

### Immédiat

- Démarrer R.2 (`<PlanningGrid>`) : composant pur, props-driven, pas besoin de fetch — peut commencer maintenant
- Lire `PLANIT-IA/rp/components/planning-canvas.jsx` pour repérer la structure
- Attendre la spec R.1 (`docs/specs/VAGUE-01-01-planning-rp.md`) de Salim avant R.4+

### Bientôt

- Installer MSW pour mocker les API quand R.4 (page `/rp` avec fetch) sera abordé
- Libérer du disque (cible : 20+ GB) pour permettre WSL2 ou autres installs

### Long terme (à coordonner avec Salim)

- Choisir la résolution propre du TD-011 (WSL2 ? `@prisma/adapter-pg` ? autre ?)
- Mettre à jour la vague avec les statuts réels de LOT 0

---

## Mises à jour annexes

- `docs/tech-debt.md` → ajout TD-011 et TD-012
- `docs/shared-resources-lock.md` → aucun lock posé (pas de modif sur ressources partagées)

---

## Phase 2 — Migration WSL2 (après libération de disque, J+1)

**Contexte** : disque passé de 2.7 GB → 12.8 GB libres ; option WSL2 redevenue viable. Choix retenu pour résoudre TD-011 proprement plutôt que rester sur le mock-first.

### Modifications

- `wsl --install -d Ubuntu-24.04` → Ubuntu 24.04.4 LTS installé
- Compte Linux `oumy` créé
- nvm 0.40.1 + Node 22.22.3 installés via curl
- pnpm 10.33.4 activé via corepack
- Symlinks `/usr/local/bin/{node,pnpm,npm,npx,corepack}` créés pour rendre Node accessible dans toutes les sessions WSL (sans dépendre de `source ~/.nvm/nvm.sh`)
- Repo cloné dans `/home/oumy/PLANIT` (filesystem Linux natif, performance optimale)
- Branche `feat/oumy` recréée avec les 3 fichiers (gitignore + journal + tech-debt) en 1 commit
- Docker Desktop WSL Integration activée pour Ubuntu-24.04
- `pnpm install` → 4m22s, OK
- `pnpm --filter @planit/contracts build` → packages/contracts/dist/ généré (requis par ADR-0003)

### Résultats CHECK Phase 2

| Vérification                                   | Statut | Notes                                                                                                                                                                            |
| ---------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @planit/backend db:generate`    | ✅     | Generated Prisma Client v6.19.3                                                                                                                                                  |
| **`pnpm --filter @planit/backend db:migrate`** | ✅     | **Plus aucun P1000.** "Already in sync" car le schéma existait déjà depuis l'application SQL brute (Windows phase 1) ; Prisma a re-tracké la migration dans `_prisma_migrations` |
| `pnpm --filter @planit/backend db:seed`        | ✅     | 1 RP, 3 enseignants, 1 étudiant, 1 classe, 3 modules, 3 salles, 6 séances                                                                                                        |
| Counts par table (psql)                        | ✅     | users=5, classes=1, modules=3, salles=3, seances=6                                                                                                                               |
| `pnpm --filter @planit/web dev`                | ✅     | Ready en 7s sur port 3000                                                                                                                                                        |
| HTTP `localhost:3000/`                         | ✅     | 307 → /rp (depuis Windows, via WSL2 port forwarding)                                                                                                                             |
| HTTP `localhost:3000/rp`                       | ✅     | 200 OK, 40 KB, contient "Planning" + "RP"                                                                                                                                        |

### Surprises Phase 2

- **WSL2 inherit Windows PATH** : la PATH par défaut dans Ubuntu WSL contient `/mnt/c/nvm4w/nodejs/pnpm` (le pnpm Windows). Si Node Linux n'est pas dans PATH avant, `pnpm` essaie de lancer `node` Windows et échoue. Fix appliqué : symlinks dans `/usr/local/bin/`. Alternative documentée : sourcer `~/.nvm/nvm.sh` à chaque session.
- **`@planit/contracts` doit être buildé avant `pnpm --filter @planit/web dev`** sinon erreur "Module not found". Lié à ADR-0003. À documenter dans le README ou rajouter dans `dev` script en pré-step.
- **`127.0.0.1:3000` ne forward pas depuis Windows vers WSL** mais `localhost:3000` oui. Comportement de WSL2 networking. Utiliser `localhost` ou l'IP WSL (visible dans le output de `pnpm dev`).

### TD-011 statut

**Contourné** pour Oumy via WSL2. La doc dans `docs/tech-debt.md` reste valable pour les autres devs Windows qui rencontreraient le bug avant de migrer eux-mêmes.

### Suite révisée

- R.2 (`<PlanningGrid>`) peut démarrer **avec backend local fonctionnel** dans WSL — pas besoin de MSW
- Workflow quotidien : ouvrir Ubuntu → `cd ~/PLANIT` → `docker compose -f infra/docker-compose.dev.yml up -d` → `pnpm dev` → travailler dans VS Code (extension Remote WSL recommandée)
- Ouvrir une PR vers `develop` quand Salim ajoute `oumy-code` comme collaborateur (push actuellement bloqué par 403)
