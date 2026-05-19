---
description: Lance l'audit sécurité final (sprint final uniquement). Produit un rapport docs/security/audit-YYYY-MM-DD.md avec verdict par catégorie OWASP.
allowed-tools: Read, Bash, Grep, Glob, Write
---

Audit sécurité final PLANIT.

## Avertissement

Cet audit est conçu pour le **sprint final** avant déploiement production. Si on n'est pas en sprint final :

- Vérifie via le fichier sprint si on y est
- Si non, demande confirmation explicite avant de poursuivre (le rapport est long et n'a de sens qu'en pré-déploiement)

## Méthode

Invoque le subagent **reviewer** en mode sécurité, avec le périmètre suivant et le format de sortie ci-dessous.

### Périmètre

- `apps/backend/` — auth, RBAC, validation, injections
- `apps/web/` — XSS, CSP, cookies, deep links
- `apps/mobile/` — SecureStore, deep links, jailbreak detection
- `apps/whatsapp-bot/` — sandbox, secrets, sessions
- `packages/contracts/` — Zod validations
- `infra/` — Docker, Caddy, exposition
- `.env.example`, gitleaks, dépendances
- Logs / audit trail

### Catégories à auditer (verdict 🟢/🟡/🔴 + justif)

A. Authentification & sessions (Argon2id, MFA TOTP, JWT, refresh rotation)
B. RBAC & autorisations (guards, élévation horizontale)
C. Validation & injection (Zod, raw SQL, eval, dangerouslySetInnerHTML)
D. Secrets & configuration (gitleaks, .env, rotation)
E. Headers & transport (HSTS, CSP, CORS, TLS, cookies)
F. Rate limiting & abus (throttler, anti-énumération)
G. Logs & audit (redacter, audit log applicatif)
H. Dépendances (pnpm audit, Dependabot)
I. Bot WhatsApp sandboxé (process séparé, no DB direct)
J. Infrastructure (ports, BD non-exposée, backups chiffrés, non-root containers)

### Output

Crée `docs/security/audit-YYYY-MM-DD.md` (date du jour) au format :

```markdown
# Audit sécurité PLANIT — <date>

## Résumé exécutif

- N findings 🔴 (critiques)
- N findings 🟡 (à durcir)
- Verdict global : <Prêt pour prod / Bloqué jusqu'à fix des 🔴>

## Détail par catégorie

### A. Authentification & sessions

🟢/🟡/🔴 — <verdict + détails>
...

## Plan de remédiation priorisé

| #   | Finding | Sévérité | Effort | Owner | Échéance |
| --- | ------- | -------- | ------ | ----- | -------- |
| 1   | ...     | 🔴       | 4h     | Salim | J+1      |

## Recommandations post-déploiement

- Monitoring Sentry à brancher
- Pentest manuel à programmer 3 mois après lancement
- security.txt à exposer
```

## Règles

- Pas de fix proposé qui ne soit pas analysé (lecture du code requise).
- Distingue vulnérabilité réelle (exploitable) vs durcissement (bonne pratique non encore appliquée).
- Si flou → "à clarifier" plutôt qu'inventé.
- Rapport en français.

Ne fixe **rien** dans cet audit — produit uniquement le rapport. Les fixes feront l'objet de PR séparées dans le sprint final.
