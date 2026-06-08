# Runbook — Branch protection (`develop` + `main`) · V04 LOT 5.9

> **Action réservée à un admin du repo (Tech Lead).** L'agent Claude **ne peut pas**
> activer/modifier la branch protection (pas d'accès aux _repo settings_). Ce document
> est la **checklist exacte** : les _status checks_ à exiger (noms tels qu'émis par les
> workflows), leur nature (gate réel vs présence), et la procédure GitHub Settings.

---

## 0. Pourquoi

`feat/* → develop → main`. On verrouille les deux branches d'intégration pour qu'aucun
merge ne passe sans que la CI (qualité + sécurité) soit verte. Politique de review :

- **`develop`** : merge possible par un admin (intégration continue de l'équipe), CI verte requise.
- **`main`** : review **code-owner** obligatoire (`@ShadowHaku54`), `enforce_admins` activé
  (les admins ne bypassent pas), source du merge restreinte à `develop`.

---

## 1. Status checks — noms exacts

> ⚠️ **Le nom requis = le `name:` du job**, pas le nom du fichier ni du workflow. Renommer un
> job (ex. `Lint · Typecheck · Test`) **sans** mettre à jour la branch protection bloque toute
> PR sur _« Expected — Waiting for status to be reported »_. Le job `quality` de `ci.yml` porte
> d'ailleurs un commentaire d'avertissement à ce sujet.

| Contexte (à coller dans GitHub)             | Workflow           | Job            | S'exécute sur | Nature du gate                                                          |
| ------------------------------------------- | ------------------ | -------------- | ------------- | ----------------------------------------------------------------------- |
| `Lint · Typecheck · Test`                   | `ci.yml`           | `quality`      | PR + push     | **Réel** (lint/typecheck/test + coverage gate)                          |
| `Build`                                     | `ci.yml`           | `build`        | PR + push     | **Réel**                                                                |
| `E2E Playwright (4 rôles)`                  | `ci.yml`           | `e2e`          | PR uniquement | **Réel**                                                                |
| `Perf smoke (k6)`                           | `ci.yml`           | `perf-smoke`   | PR uniquement | **Présence** (step k6 en `continue-on-error`) — cf. §3                  |
| `Lighthouse mobile (Étudiant + Enseignant)` | `ci.yml`           | `lighthouse`   | PR uniquement | **main = réel** · **develop = présence** sauf label `lighthouse-strict` |
| `Secrets (Gitleaks)`                        | `security.yml`     | `secrets`      | PR + push     | **Réel** (aucun secret ne doit fuiter)                                  |
| `SCA (deps + Trivy fs)`                     | `security.yml`     | `sca`          | PR + push     | **Présence** (`pnpm audit` en `continue-on-error`) — cf. §3             |
| `SCA (OSV-Scanner)`                         | `security.yml`     | `osv`          | PR + push     | **Présence** (`fail-on-vuln: false`) — cf. §3                           |
| `SAST (Semgrep)`                            | `security.yml`     | `sast`         | PR + push     | **Présence** (job en `continue-on-error`) — cf. §3                      |
| `Image & IaC scan (Trivy)`                  | `security.yml`     | `image-scan`   | PR uniquement | **Présence** (job en `continue-on-error`) — cf. §3                      |
| `require-develop`                           | `protect-main.yml` | `check-source` | PR → `main`   | **Réel** — **`main` uniquement** (source = `develop`)                   |

> **« Présence »** = le check est toujours **vert** tant que le job _s'exécute jusqu'au bout_
> (les findings n'échouent pas le job). L'exiger garantit que la CI a tourné, **pas** que le
> seuil est respecté. Pour le transformer en gate réel → §3.

### Checks **non** pertinents pour la branch protection

- **`branch-owner`** (`branch-owner-guard.yml`) : s'exécute sur **push** vers `feat/**`, pas sur
  les PR vers `develop`/`main`. C'est un garde-fou de push (un membre ne pousse que sur sa propre
  branche), **pas** un status check de PR — ne pas l'ajouter à la liste requise.

---

## 2. Liste à exiger, par branche

### `develop`

```
Lint · Typecheck · Test
Build
E2E Playwright (4 rôles)
Secrets (Gitleaks)
SCA (deps + Trivy fs)
SCA (OSV-Scanner)
SAST (Semgrep)
Image & IaC scan (Trivy)
Perf smoke (k6)
```

> `Lighthouse` sur develop reste piloté par le **label `lighthouse-strict`** (design à deux
> niveaux, cf. `docs/runbooks/ci-lighthouse.md`) plutôt que par un required check — l'ajouter en
> dur retirerait l'opt-in. À toi de l'inclure si tu veux le rendre systématiquement bloquant.

### `main` (tous ceux de develop **+**)

```
Lighthouse mobile (Étudiant + Enseignant)
require-develop
```

> Sur `main`, Lighthouse est **toujours bloquant** (le workflow désactive `continue-on-error`
> quand `base_ref == main`) → l'exiger a un effet réel.

---

## 3. Durcir les checks « présence » → gate réel (édition workflow, hors PR 5.9)

Exiger un check « présence » ne garantit pas le seuil : le job reste vert même en cas de finding.
Pour le rendre **réellement bloquant**, il faut **aussi** retirer le `continue-on-error`
correspondant (c'est une édition de `ci.yml`/`security.yml`, séparée de la simple checklist) :

| Check à durcir             | Fichier        | Modif                                                                                                                         |
| -------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `Perf smoke (k6)`          | `ci.yml`       | step _« Run k6 perf smoke »_ → retirer `continue-on-error: true`                                                              |
| `SCA (deps + Trivy fs)`    | `security.yml` | step _« pnpm audit »_ → retirer `continue-on-error`; pour bloquer sur findings Trivy, ajouter `exit-code: 1` au step Trivy fs |
| `SCA (OSV-Scanner)`        | `security.yml` | `with: fail-on-vuln: false` → `true`                                                                                          |
| `SAST (Semgrep)`           | `security.yml` | job `sast` → retirer `continue-on-error: true`                                                                                |
| `Image & IaC scan (Trivy)` | `security.yml` | job `image-scan` → retirer `continue-on-error: true` (+ `exit-code: 1` sur les steps image pour bloquer sur findings)         |

> Les commentaires dans `ci.yml`/`security.yml` annoncent déjà ce passage (« informationnel au
> LOT 4 ; bloquant au LOT 5.9 »). Procéder check par check, en confirmant le score réel sur 2 runs
> consécutifs avant de durcir (même prudence que pour les seuils Lighthouse).

---

## 4. Procédure GitHub Settings (UI)

`Settings → Branches → Branch protection rules → Add rule` (une règle par branche).

1. **Branch name pattern** : `develop` (puis répéter pour `main`).
2. ☑️ **Require a pull request before merging**
   - `main` : ☑️ **Require review from Code Owners**. Les code-owners sont `@BySalim` **et**
     `@ShadowHaku54` (`.github/CODEOWNERS`) ; l'un OU l'autre satisfait la règle. Comme l'auteur
     ne peut pas s'auto-approuver, une PR de release ouverte par Salim exige `@ShadowHaku54`.
   - `develop` : review non bloquante (intégration équipe) — au choix du TL.
3. ☑️ **Require status checks to pass before merging**
   - ☑️ **Require branches to be up to date before merging** (re-run CI sur le head à jour).
   - Dans la recherche, ajouter **un par un** les contextes de la liste §2 pour la branche
     concernée. ⚠️ Ils n'apparaissent que s'ils ont **déjà tourné au moins une fois** (ouvre une
     PR de test si un nom manque dans l'autocomplétion).
4. ☑️ **Require conversation resolution before merging** (recommandé).
5. `main` uniquement : ☑️ **Do not allow bypassing the above settings** (= `enforce_admins` :
   les admins sont soumis aux mêmes règles, aucun bypass).
6. **Save changes**.

### Équivalent `gh` CLI (optionnel, scriptable)

```bash
# Exemple pour develop — adapter la liste de contextes et répéter pour main (+ require-develop,
# + Lighthouse, + required_pull_request_reviews code-owner, + enforce_admins=true).
gh api -X PUT repos/BySalim/PLANIT/branches/develop/protection \
  -H "Accept: application/vnd.github+json" \
  -f 'required_status_checks[strict]=true' \
  -f 'required_status_checks[contexts][]=Lint · Typecheck · Test' \
  -f 'required_status_checks[contexts][]=Build' \
  -f 'required_status_checks[contexts][]=E2E Playwright (4 rôles)' \
  -f 'required_status_checks[contexts][]=Secrets (Gitleaks)' \
  -f 'required_status_checks[contexts][]=SCA (deps + Trivy fs)' \
  -f 'required_status_checks[contexts][]=SCA (OSV-Scanner)' \
  -f 'required_status_checks[contexts][]=SAST (Semgrep)' \
  -f 'required_status_checks[contexts][]=Image & IaC scan (Trivy)' \
  -f 'required_status_checks[contexts][]=Perf smoke (k6)' \
  -f 'enforce_admins=false' \
  -f 'required_pull_request_reviews[required_approving_review_count]=0' \
  -f 'restrictions=null'
```

---

## 5. Vérification (après activation)

1. Ouvrir une PR de test `feat/<x>` → `develop` : la liste « Required » doit afficher **exactement**
   les contextes de §2, tous résolus avant que le bouton _Merge_ ne s'active.
2. Aucun statut bloqué sur _« Expected — Waiting for status to be reported »_ : si c'est le cas, le
   nom requis ne correspond à **aucun** job (faute de frappe / job renommé) → corriger le contexte.
3. Sur une PR `develop → main`, vérifier que `require-develop` apparaît et que `main` refuse une PR
   dont la source ≠ `develop`.

---

## 6. Liens

- Workflows : [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) ·
  [`security.yml`](../../.github/workflows/security.yml) ·
  [`protect-main.yml`](../../.github/workflows/protect-main.yml)
- Lighthouse (gating à deux niveaux) : [`ci-lighthouse.md`](ci-lighthouse.md)
- Perf k6 : [`perf-k6.md`](perf-k6.md)
- Stratégie de branches `feat/* → develop → main` : `CLAUDE.md` §« Stratégie de branches » ·
  [ADR-0013](../architecture/adr/0013-strategie-deploiement-v04.md) (déploiement V04)
