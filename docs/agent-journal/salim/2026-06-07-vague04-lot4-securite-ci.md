# Journal — Vague 04 LOT 4 : Sécurité CI calibrée

> **Membre** : Salim (`feat/salim`) · **Date** : 2026-06-07 · **LOT** : Vague 04 — LOT 4 (4.1 → 4.8)

## 1. Directives reçues

Réaliser le LOT 4 (sécurité CI calibrée) — réassignation à la session TL, comme LOT 1.
LOT 2 constaté **déjà mergé** (PR #65) au démarrage ; `feat/salim` fast-forward sur `develop`.

## 2. Décisions techniques (autonomes)

- **Nouveau workflow dédié `security.yml`** (plutôt que gonfler `ci.yml`) : jobs `secrets`, `sca`, `osv`, `sast`, `image-scan`. Séparation de responsabilité + déclencheurs propres (PR + push develop/main pour le SARIF du Security tab).
- **Mode « informationnel d'abord »** (comme Lighthouse) : `sca`/`sast`/`image-scan` en `continue-on-error` ; SARIF poussés. Gitleaks **bloquant**. Le gating bloquant (branch protection) = **LOT 5.9** (décision conforme aux conventions ADR-0014 « informationnel puis bloquant »).
- **SHA-pinning** : actions existantes épinglées à **leur major actuel** (v4/v7/v11) — pas d'upgrade (un bump v4→v6/v7 casserait la CI). Dependabot fera les bumps en PR. SHA résolus via `gh api repos/<repo>/commits/<tag>`.
- **OSV via workflow réutilisable officiel** Google (`fail-on-vuln: false`) — input vérifié sur le SHA épinglé avant usage (évite un job rouge). Gère scan + upload SARIF lui-même.
- **Semgrep via `pipx install`** sur l'hôte (pas de conteneur) → l'upload SARIF (`codeql-action`, JS/Node) tourne sur l'hôte qui a Node.
- **Durcissement API (4.5) sans dépendance** : headers sécurité (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `-Server`) posés au niveau **Caddy** sur la route `@backend` (les réponses JSON n'ont pas les headers que Next pose sur le HTML). **`helmet` écarté** (dep npm = décision sensible non prise ; Caddy couvre le besoin).
- **Allowlist Gitleaks étendue** aux `*.example` (templates à placeholders) pour éviter tout faux positif (`.env.prod.example`).
- **4.8 calibré** : retrait du lien vers le dossier privé `strategies/` dans `SECURITY.md` (vrai gain). **Pas** de réécriture des mentions « CX22/Hetzner » dans les ADR (historique immuable) ni deploy.md (réécrit en 5.6) — V4-D16 classe ce résiduel « cosmétique, accepté ». Scan : **0 IP réelle** dans les docs publiques.

## 3. Décisions soumises à validation

- **Aucune dépendance npm ajoutée** (helmet écarté ; Semgrep/Trivy/OSV/Gitleaks = outils CI externes, pas des deps du projet).
- Réassignation du LOT 4 à la session TL — validée.

## 4. Modifications

**Créés** :

- `docs/specs/VAGUE-04-04-securite-ci.md` (SPEC)
- `.github/workflows/security.yml` (4 jobs : secrets / sca / osv / sast / image-scan)
- `.github/dependabot.yml` (npm + github-actions + docker)
- `.semgrep.yml` (règles projet : no-eval, no-Function, no-child_process.exec)
- `docs/runbooks/v04-securite-ci.md` (posture + checklist durcissement)

**Modifiés** :

- `.github/workflows/ci.yml` + `.github/workflows/auto-assign-reviewer.yml` (actions SHA-pinned)
- `infra/caddy/Caddyfile.prod` (headers sécurité sur `@backend`)
- `SECURITY.md` (posture V04 + retrait lien privé)
- `.gitleaks.toml` (allowlist `*.example`)

## 5. Phase CHECK — résultats

- **YAML** des 5 fichiers (security/ci/auto-assign/dependabot/semgrep) : parse OK (PyYAML).
- **SHA-pinning** : `grep` confirme **0 action sur tag mobile** dans `.github/`.
- **OSV input `fail-on-vuln`** confirmé valide sur le SHA épinglé.
- **Gitleaks** : `.env.example` + `.env.prod.example` (placeholders) allowlistés → pas de faux positif ; le job ne scanne que les commits de la PR (pas de secret introduit).
- Validation réelle des jobs = **run CI sur la PR** (SARIF dans l'onglet Security) — non exécutable localement.

## 6. Surprises

- **LOT 2 déjà fait/mergé** (PR #65) — découvert via le `ci.yml` (coverage gate + job e2e 4 rôles déjà présents). Le « ok LOT 2 réaliser » de l'humain = LOT 2 acté.
- Pas de lib YAML locale (ni pyyaml ni js-yaml) ni `pip` direct → validé via `python -m pip install pyyaml`.
- `npx js-yaml` non résolu sur ce poste Windows.

## 7. Suite

- **LOT 5.9** : rendre `secrets`/`sca`/`sast`/`image-scan` **bloquants** (branch protection) après calibration des findings.
- **LOT 5.7** : `ansible-vault` + inventaire quand l'IaC Ansible arrivera.
- Adresser les findings SARIF réels (Trivy/OSV/Semgrep) une fois la 1ʳᵉ CI passée.
- `helmet` : décision à rouvrir seulement si l'API est exposée hors Caddy.

## 8. Mises à jour annexes

- `SECURITY.md` + `docs/runbooks/v04-securite-ci.md` documentent la posture V04.
- Statuts `vague-04-lots.md` 4.1→4.8 passés `[x]` (hors repo équipe).
- CLAUDE.md (patterns sécu CI) : **reporté au LOT 7.4** (capitalisation clôture vague).
