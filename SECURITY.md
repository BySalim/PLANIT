# Sécurité PLANIT

## Signaler une vulnérabilité

Envoyer un email à **salim-taoufiq.ouedraogo@ism.edu.sn** avec :

- Description de la vulnérabilité
- Étapes pour reproduire
- Impact potentiel

Ne pas ouvrir d'issue publique GitHub pour les vulnérabilités de sécurité.

## Règles de sécurité (jour 1)

- Aucun secret en dur — `.env.example` documenté, `.env` gitignored
- Gitleaks actif sur chaque commit (hook pre-commit) **et en CI** (full-history)
- Validation Zod systématique sur toutes les entrées
- Logger redacter — jamais `password`/`token`/`mfaSecret` dans les logs
- Pas de `eval`, `dangerouslySetInnerHTML` sans justification
- RBAC côté serveur sur chaque endpoint sensible (guards `@Roles`, JWT)
- Cookies HttpOnly + SameSite=Strict + Secure (prod) ; CORS restreint
- Rate limiting global (throttler) + validation d'env fail-fast au boot

## Sécurité CI calibrée (Vague 04)

Filet **non intrusif** automatisé sur chaque PR (ADR-0014 §6) :

- **Secrets** : Gitleaks (full-history) — **bloquant**.
- **SCA** : `pnpm audit` (deps prod) + Trivy `fs` + OSV-Scanner — SARIF dans l'onglet Security.
- **SAST** : Semgrep (`--config auto` + règles projet `.semgrep.yml`).
- **Image / IaC** : Trivy `image` (api+web) + Trivy `config` (Dockerfiles/compose).
- **Supply-chain** : actions GitHub **épinglées au SHA** + Dependabot (deps, actions, images).

Ces jobs sont **informationnels** d'abord puis rendus **bloquants** au LOT 5.9
(branch protection). Détails et checklist de durcissement runtime :
[`docs/runbooks/v04-securite-ci.md`](docs/runbooks/v04-securite-ci.md).

## Audit de sécurité (différé)

La posture V04 ci-dessus est une **baseline**. Un audit **complet** sera réalisé
à la vague d'audit dédiée avant la production publique : pentest, OWASP ASVS,
DAST profond authentifié, fuzzing, revue manuelle exhaustive.
