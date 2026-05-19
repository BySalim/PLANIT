---
description: Re-charge tout le contexte projet (utile en début de session ou après une absence). Vérifie la branche, lit CLAUDE.md, vague, ADR, PR ouvertes, dernier journal, soft-locks.
allowed-tools: Read, Bash, Glob
---

Onboarding rapide pour cette session. Tu travailles en autonomie.

# Étape 1 — Identification

1. `git branch --show-current` — affiche la branche
2. Identifie le membre selon le tableau du CLAUDE.md
3. Annonce : « Branche active : `feat/<X>` — session pour **Prénom**. »
4. Si la branche n'est pas une `feat/<prénom>` connue → demande confirmation, ne fais rien d'autre.

# Étape 2 — Lecture contextuelle

Lis dans l'ordre :

1. `CLAUDE.md` racine
2. `CONTRIBUTING.md` (rappel des règles équipe)
3. La vague active : `../PLANIT-Strategie-VibeCode/vagues/vague-*.md` (la plus récente non terminée)
4. Les 3 derniers ADR : `ls -t docs/architecture/adr/ | head -3`
5. PR ouvertes : `gh pr list --state open --limit 10`
6. Dernier commit sur main : `git log main --oneline -5`
7. `docs/shared-resources-lock.md` (soft-locks)
8. Dernier journal d'agent du membre : `ls -t docs/agent-journal/<membre>/ | head -1`

# Étape 3 — Récap en 7 lignes

Affiche :

1. **Vague** : <titre>
2. **Mes tâches pour <membre>** : `[x]` DONE (count) · `[~]` IN PROGRESS (count) · `[ ]` TODO (count)
3. **Prochaine recommandée** : <id tâche · titre> (dépendances satisfaites, matche ma spécialité)
4. **Soft-locks actifs** : <count> (qui touche à quoi)
5. **PR à reviewer** : <count> (assignées à moi)
6. **Dernier journal** : <date> · <feature> · suite proposée
7. **Question** : "Sur quoi tu veux travailler ?"

# Règles

- Ne fais rien d'autre que lire et résumer.
- N'écris pas de code, pas de commit.
- Si tu détectes une incohérence (branche main, CI rouge, lock expiré) → mentionne dans le récap.
