# Sécurité CI — posture V04 (LOT 4)

> Baseline **non intrusive** calibrée (ADR-0014 §6, V4-D6). L'intrusif (pentest,
> DAST profond, OWASP ASVS, fuzzing) reste **vague ∞**. Ce runbook décrit ce qui
> tourne en CI, la politique de SHA-pinning, et la checklist de durcissement runtime.

## Jobs CI (`.github/workflows/security.yml`)

| Job          | Outil                                          | Rôle                                          | État LOT 4                             | Bloquant |
| ------------ | ---------------------------------------------- | --------------------------------------------- | -------------------------------------- | -------- |
| `secrets`    | Gitleaks (full-history)                        | Détection de secrets commités                 | **Bloquant**                           | oui      |
| `sca`        | `pnpm audit --prod` + Trivy `fs`               | Vulnérabilités de dépendances + misconfig FS  | informationnel (SARIF)                 | LOT 5.9  |
| `osv`        | OSV-Scanner (workflow réutilisable)            | Vulnérabilités de dépendances (base OSV)      | informationnel (`fail-on-vuln: false`) | LOT 5.9  |
| `sast`       | Semgrep (`--config auto` + `.semgrep.yml`)     | Analyse statique de code                      | informationnel (`continue-on-error`)   | LOT 5.9  |
| `image-scan` | Trivy `config` (IaC) + Trivy `image` (api+web) | Misconfig Dockerfile/compose + CVE des images | informationnel (`continue-on-error`)   | LOT 5.9  |

> **Informationnel d'abord** = signal partout (SARIF dans l'onglet **Security**), gate à la maturité — même logique que Lighthouse. Le passage en **bloquant** (branch protection sur `develop`+`main`) est **LOT 5.9** : on adresse d'abord les findings réels, puis on retire les `continue-on-error` / on ajoute les contextes requis.

## SHA-pinning des actions (4.6, V4-D6)

- **Toute** action externe est épinglée au **SHA de commit complet** + commentaire `# vX` (jamais un tag mobile `@v4`). Raison : l'action `aquasecurity/trivy-action` a été compromise début 2026 ; un tag mobile aurait exécuté du code malveillant.
- Les workflows existants ont été épinglés **à leur major actuel** (pas d'upgrade) : un bump major non testé (ex. `upload-artifact` v4→v7) casserait la CI. Les bumps arrivent via **Dependabot** (`github-actions`), en PR reviewables.
- `protect-main.yml` et `branch-owner-guard.yml` n'utilisent aucune action externe (shell pur) → rien à épingler.
- Pour mettre à jour un SHA à la main : `gh api repos/<owner>/<repo>/commits/<tag> --jq .sha`.

## Dependabot (`.github/dependabot.yml`, 4.7)

Écosystèmes suivis (hebdo, PRs groupées) : `npm` (monorepo pnpm), `github-actions` (met à jour les SHA + commentaire), `docker` (images de base `apps/backend` + `apps/web`). Détecter (scans) ➜ corriger (Dependabot).

## Checklist durcissement runtime (4.5)

Vérifié présent (✅) / à décider (⚠️) :

| Contrôle                                                       | État        | Où                                                                                                                                                     |
| -------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Rate limiting global (100/min/IP) + login (5/min prod)         | ✅          | `ThrottlerModule` (`app.module.ts`), `@Throttle`                                                                                                       |
| CORS partagé HTTP + WS, origine via `FRONTEND_URL`             | ✅          | `common/cors.ts`                                                                                                                                       |
| Headers sécurité **web** (CSP, X-CTO, Referrer, X-Frame)       | ✅          | `apps/web/next.config.ts` `headers()`                                                                                                                  |
| Headers sécurité **API** (X-CTO, X-Frame, Referrer, `-Server`) | ✅          | `Caddyfile.prod` route `@backend` (LOT 4.5)                                                                                                            |
| Cookies HttpOnly + SameSite=Strict + Secure (prod)             | ✅          | `auth/cookies.ts` (ADR-0007)                                                                                                                           |
| Validation Zod systématique des entrées                        | ✅          | `ZodValidationPipe` global                                                                                                                             |
| Logger redacter (password/token/mfaSecret)                     | ✅          | `common/logger.module.ts`                                                                                                                              |
| Validation d'env fail-fast au boot                             | ✅          | `common/env.validation.ts` (LOT 1.5)                                                                                                                   |
| `helmet` (headers sur les réponses Express directes)           | ⚠️ décision | Couvert par Caddy (`@backend`) sans dépendance ; `helmet` = dep npm, **non ajoutée** (décision sensible). À réévaluer si l'API est exposée hors Caddy. |

## Sanitisation docs publiques (4.8, V4-D16)

Repos **publics** assumés (contexte académique). Règles :

- Aucun doc public n'expose IP/hôte réel, capacité serveur précise, ni divulgation de faiblesse exploitable (généraliser : « CX22 » → « VM », IP → placeholder).
- `.gitignore` couvre `.env.prod*`, `infra/ansible/*.vault.yml`, `infra/ansible/inventory*.yml`, `infra/prod/env/*.local|*.secret` (posé en #63).
- Gitleaks scanne **tout** l'arbre (workflows, compose, Ansible à venir).
- Secrets ops : GitHub Secrets / GitHub Environments ; `ansible-vault` quand l'IaC Ansible arrivera (LOT 5.7).

## Reste pour la vague ∞ (audit final)

Pentest, OWASP ASVS complet, DAST profond authentifié, fuzzing agressif, revue manuelle exhaustive. Cf. `SECURITY.md`.
