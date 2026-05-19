# Sécurité PLANIT

## Signaler une vulnérabilité

Envoyer un email à **salim-taoufiq.ouedraogo@ism.edu.sn** avec :

- Description de la vulnérabilité
- Étapes pour reproduire
- Impact potentiel

Ne pas ouvrir d'issue publique GitHub pour les vulnérabilités de sécurité.

## Règles de sécurité (jour 1)

- Aucun secret en dur — `.env.example` documenté, `.env` gitignored
- Gitleaks actif sur chaque commit (hook pre-commit)
- Validation Zod systématique sur toutes les entrées
- Logger redacter — jamais `password`/`token`/`mfaSecret` dans les logs
- Pas de `eval`, `dangerouslySetInnerHTML` sans justification

## Audit de sécurité

Un audit complet sera réalisé à la vague finale avant déploiement en production.

Détail : [07-SECURITE-DIFFEREE.md](../PLANIT-Strategie-VibeCode/strategies/07-SECURITE-DIFFEREE.md)
