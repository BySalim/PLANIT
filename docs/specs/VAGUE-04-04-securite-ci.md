# VAGUE-04-04 — Sécurité CI calibrée (LOT 4)

> **Statut** : **En cours**. **Demandeur** : Salim (TL, réassignation à sa session).
> **Branche** : `feat/salim` (base `develop` après #64 LOT 1 + #65 LOT 2). **Cadre** : ADR-0014 §6, V4-D6, V4-D15, V4-D16.
> **Lié à** : LOT 1 (images scannées), LOT 5.9 (rend ces checks bloquants via branch protection).

## 1. Problème

La CI gate déjà lint/typecheck/test/coverage/e2e/build/Lighthouse, mais **aucun filet sécurité** : pas de scan de secrets en CI (seul le hook pre-commit local existe), pas de SCA (vulnérabilités de dépendances), pas de SAST, pas de scan d'image/IaC, et les actions GitHub sont en **tags mobiles** (`@v4`) — risque supply-chain (V4-D6 : l'action Trivy a été compromise début 2026 → SHA-pinning obligatoire).

## 2. Décision (ADR-0014 §6)

Baseline **non intrusive** (statique + supply-chain), calibrée. L'intrusif (pentest, DAST, ASVS) reste **vague ∞**.

### Jobs (`.github/workflows/security.yml`)

| Job          | Outil                                                                      | Mode LOT 4                                                                 | Devient bloquant |
| ------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------- |
| `secrets`    | Gitleaks (`fetch-depth: 0`, full-history)                                  | **Bloquant** (aucun secret ne doit fuiter ; hook pre-commit déjà en place) | reste bloquant   |
| `sca`        | `pnpm audit --prod` + Trivy `fs` (SARIF) + OSV-scanner (SARIF)             | `pnpm audit` informationnel (`continue-on-error`), SARIF poussés           | LOT 5.9          |
| `sast`       | Semgrep (`--config auto` + `.semgrep.yml`) → SARIF                         | Informationnel (calibration)                                               | LOT 5.9          |
| `image-scan` | Trivy `image` (images LOT 1 buildées en CI) + Trivy `config` (IaC) → SARIF | Informationnel                                                             | LOT 5.9          |

> **Informationnel-d'abord** = même politique que Lighthouse (signal partout, gate à la maturité). Le DoD LOT 4 = « les jobs **tournent** + SARIF dans l'onglet Security + actions SHA-pinned ». Le **gating bloquant** (branch protection) est explicitement **LOT 5.9**.

### SHA-pinning (4.6, V4-D6)

Toutes les actions externes épinglées au **SHA complet** + commentaire `# vX`. Les workflows existants (`ci.yml`, `auto-assign-reviewer.yml`) sont épinglés **à leur major actuel** (pas d'upgrade : un bump v4→v6 casserait la CI ; Dependabot proposera les bumps en PR reviewables). `protect-main.yml` et `branch-owner-guard.yml` n'utilisent aucune action externe → rien à épingler.

### Dependabot (4.7, V4-D15)

`.github/dependabot.yml` : écosystèmes `npm` (racine monorepo), `github-actions` (met à jour les **SHA d'actions** + commentaire), `docker` (images de base des Dockerfiles). Cadence hebdo, PRs groupées.

### Durcissement runtime (4.5) — checklist

Vérification de l'existant (pas de régression) : throttler global (100/min) + login (5/min), CORS partagé HTTP/WS, headers web (CSP/X-CTO/Referrer/X-Frame) via `next.config.ts`, cookies HttpOnly+SameSite=Strict, validation Zod globale, redacter logger. **Gap** : réponses **API JSON** sans headers de sécurité → comblé au niveau **Caddy** (`Caddyfile.prod`, route `/api`+`/docs`, **0 dépendance**). `helmet` (dep npm) = **décision sensible** non prise ici (Caddy couvre le besoin sans dep).

### Sanitisation docs + hygiène secrets (4.8, V4-D16)

Repos publics assumés. Vérifier qu'aucun doc public n'expose IP/hôte réel/capacité serveur précise ni divulgation de faiblesse exploitable. `.gitignore` couvre déjà `.env.prod*`, `infra/ansible/*.vault.yml`, inventaires (posé en #63). Gitleaks étendu aux workflows/compose via le scan full-tree.

## 3. Non-objectifs (hors LOT 4)

- Rendre les checks **bloquants** (branch protection) → **LOT 5.9**.
- `ansible-vault` / inventaire Ansible → **LOT 5.7** (pas d'Ansible encore).
- Pentest, OWASP ASVS, DAST profond, fuzzing → **vague ∞**.
- CodeQL comme SAST principal → reporté (ADR-0014, Semgrep d'abord).

## 4. Critères d'acceptation (Done LOT 4)

1. `security.yml` : 4 jobs tournent sur PR ; SARIF (Trivy/OSV/Semgrep) visibles dans l'onglet **Security**.
2. Gitleaks **bloque** si un secret est détecté ; vert sinon.
3. **Toutes** les actions (security.yml + ci.yml + auto-assign) épinglées au SHA.
4. `dependabot.yml` valide (npm + github-actions + docker).
5. `SECURITY.md` décrit la posture V04 (ce qui est scanné, SHA-pinning, ce qui reste vague ∞).
6. Checklist durcissement écrite ; headers sécurité API ajoutés côté Caddy.
7. `actionlint`/parse YAML OK ; aucun secret/IP/hôte réel dans les docs publiques.

## 5. Plan de tests

- **YAML/actionlint** sur les workflows modifiés.
- **CI réelle sur la PR** : les 4 jobs s'exécutent ; SARIF uploadés ; Gitleaks vert (pas de secret) ; jobs informationnels n'échouent pas la PR.
- **Revue manuelle** : grep des docs publiques pour IP/hôtes/secrets.
