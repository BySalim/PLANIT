---
id: ADR-0014
titre: Strategie tests et qualite V04
statut: ACCEPTE
date: 2026-06-06
auteur: salim
vague: 04
---

# ADR-0014 — Strategie tests et qualite V04

> **Statut** : Accepte · **Date** : 2026-06-06 · **Vague** : 04 (LOT 0.3) · **Auteur** : Salim (Tech Lead)

## Contexte

PLANIT possede deja des tests unitaires et d'integration, mais la qualite n'est pas encore gatee comme une chaine de release. La CI execute lint, typecheck, tests et build ; Lighthouse donne un signal frontend. Il manque :

- seuils de couverture explicites,
- rapport coverage CI,
- e2e Playwright 4 roles en CI,
- tests de performance API,
- securite CI calibree,
- politique claire de ce qui est fait en V04 et de ce qui reste pour la vague d'audit securite.

## Decision

### 1. Pyramide de tests

La strategie V04 suit cette pyramide :

| Niveau          | Outil                                     | Role                                                         |
| --------------- | ----------------------------------------- | ------------------------------------------------------------ |
| Unit            | Vitest                                    | Helpers, services purs, composants sans infra                |
| Integration API | Vitest + Nest + Postgres test             | Auth/RBAC, seances, referentiel, inscriptions, suivi, scopes |
| E2E             | Playwright                                | Parcours 4 roles : RP, AC, Enseignant, Etudiant              |
| Perf smoke      | k6                                        | Endpoints chauds, seuils p95/erreur, baseline                |
| Front perf/a11y | Lighthouse CI                             | Page publique `/login` et budget mobile                      |
| Securite CI     | Gitleaks, pnpm audit, OSV, Trivy, Semgrep | Baseline non intrusive                                       |

### 2. Seuils coverage

Les seuils V04 sont volontairement progressifs : ils doivent bloquer les regressions sans exiger une couverture artificielle immediate.

| Package              | Lines | Branches | Functions | Statements | Justification                                           |
| -------------------- | ----: | -------: | --------: | ---------: | ------------------------------------------------------- |
| `apps/backend`       |    60 |       45 |        55 |         60 | Forte logique domaine + integration existante           |
| `apps/web`           |    45 |       35 |        40 |         45 | UI riche, beaucoup de composants encore peu couverts    |
| `packages/utils`     |    80 |       70 |        80 |         80 | Code pur, facile a couvrir                              |
| `packages/ui`        |    55 |       45 |        55 |         55 | Hooks/composants partages                               |
| `packages/contracts` |    70 |       60 |        70 |         70 | Schemas Zod critiques, tests a creer si logique ajoutee |

Ces seuils peuvent monter a la cloture V04 si la couverture reelle est nettement au-dessus.

### 3. Integration API

Les flows critiques a proteger :

- auth login/refresh/logout/me,
- RBAC RP/AC/Enseignant/Etudiant,
- planning/seances V2,
- maquettes/formations/classes,
- inscriptions double-diplome,
- suivi modules,
- scope AC et scope etudiant,
- health/readiness.

### 4. E2E 4 roles

Playwright doit couvrir au minimum :

- login + home role-aware,
- RP : planning + referentiel cle,
- AC : consultation scoped,
- Enseignant : planning/suivi,
- Etudiant : planning/suivi,
- interdiction/redirect quand role inadapte.

Le job e2e CI doit demarrer les services necessaires et publier le rapport HTML en artefact.

### 5. Performance k6

k6 mesure les endpoints chauds :

- login,
- planning semaine,
- suivi-modules,
- inscription,
- liste classes.

Profils :

- `smoke` : court, CI informationnelle au debut.
- `load-leger` : manuel ou nocturne, baseline.

Seuils initiaux :

- taux d'erreur HTTP < 1 %,
- p95 < 800 ms en smoke local/CI,
- aucune reponse 5xx.

Ces seuils servent de point de depart ; la baseline LOT 3 pourra les ajuster.

### 6. Securite CI calibree

V04 met en place un filet statique et supply-chain :

- Gitleaks full-history sur PR.
- `pnpm audit` sur dependances prod.
- OSV-scanner.
- Trivy `fs`, `config` et `image`.
- Semgrep config auto + regles projet.
- SARIF publie dans l'onglet Security.
- GitHub Actions epinglees au SHA.

Ce qui reste hors V04 et va dans la vague ∞ :

- pentest,
- OWASP ASVS complet,
- DAST profond authentifie,
- fuzzing agressif,
- revue manuelle securite exhaustive.

### 7. Branch protection

Quand les jobs V04 sont stables, ils deviennent obligatoires pour merger vers `develop` et `main` :

- lint/typecheck/test/build,
- coverage,
- e2e,
- perf smoke,
- secrets/SCA/SAST/image scan,
- Lighthouse strict sur release vers `main`.

## Alternatives considerees

### Couverture tres haute immediatement

Rejete : pousser 80-90 % partout encouragerait des tests superficiels et ralentirait V04. Les seuils progressifs protegent mieux le rythme.

### CodeQL comme SAST principal

Reporte : utile mais plus lent et plus lourd a calibrer. Semgrep donne une mise en place plus rapide en V04 ; CodeQL reste possible plus tard.

### DAST complet en V04

Rejete : intrusif, demande des comptes seed, un environnement stable et du temps d'analyse. Garde pour la vague d'audit securite.

## Consequences

### Positives

- Les regressions qualite deviennent visibles et bloquantes.
- Les tests restent alignes avec les flows metier reels.
- La securite CI couvre les risques les plus probables sans immobiliser la vague.

### Negatives

- Les seuils initiaux peuvent necessiter un ajustement apres baseline.
- Les jobs CI vont allonger le temps de feedback.
- Les scans peuvent produire des faux positifs a trier.

## Plan de mise en oeuvre

| Etape | Livrable                                | Lot   |
| ----- | --------------------------------------- | ----- |
| A     | Conventions coverage et arbo tests/perf | LOT 0 |
| B     | Coverage Vitest + artefacts CI          | LOT 2 |
| C     | Completer tests unit/integration        | LOT 2 |
| D     | E2E 4 roles + job CI                    | LOT 2 |
| E     | k6 + baseline + job perf-smoke          | LOT 3 |
| F     | Scans secrets/SCA/SAST/image/IaC        | LOT 4 |
| G     | Checks bloquants branch protection      | LOT 5 |

## Decision revisable quand

- La baseline coverage prouve que les seuils sont trop bas ou trop hauts.
- Le temps CI depasse un seuil acceptable pour l'equipe.
- La vague ∞ remplace la posture calibree par une posture audit complet.

## References

- Etat des lieux : `docs/runbooks/v04-etat-des-lieux.md`
- Conventions : `docs/runbooks/v04-conventions-qualite-infra.md`
- Runbook Lighthouse : `docs/runbooks/ci-lighthouse.md`
- ADR-0009 : observabilite
