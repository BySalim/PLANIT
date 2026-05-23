---
description: Re-charge tout le contexte projet (utile en début de session ou après une absence). Vérifie la branche, lit CLAUDE.md, vague, ADR, PR ouvertes, dernier journal, soft-locks.
allowed-tools: Read, Bash, Glob
---

Onboarding rapide pour cette session. Tu travailles en autonomie.

> **Rappel périmètre** : tu ne lis PAS `strategies/`, `prompts/`, `doxcs/`, `templates/`. Tout ce dont tu as besoin est dans CLAUDE.md, la vague, et le code du repo.

# Étape 1 — Identification

1. `git branch --show-current` — affiche la branche
2. Identifie le membre selon le tableau du CLAUDE.md
3. Annonce : « Branche active : `feat/<X>` — session pour **Prénom**. »
4. Si la branche n'est pas une `feat/<prénom>` connue → demande confirmation, ne fais rien d'autre.

# Étape 2 — Lecture contextuelle (minimale)

Lis dans l'ordre :

1. `CLAUDE.md` racine (auto-suffisant — pas de cascade).
2. `../PLANIT-Strategie-VibeCode/vagues/vague-01-index.md` (décisions, périmètre, statut global).
3. Dernier journal d'agent du membre : `ls -t docs/agent-journal/<membre>/ | head -1`, puis lire ce fichier.
4. `docs/shared-resources-lock.md` (soft-locks).

**Ne lis PAS d'office** :

- ADR récents (uniquement à demande explicite)
- PR ouvertes (uniquement à demande explicite)
- Dernier commit sur main (uniquement à demande explicite)
- `vague-01-lots.md` ou `vague-01-scenarios.md` (chargés par `/feat-start` ou sur demande)

# Étape 3 — Récap en 5 lignes

Affiche :

1. **Vague** : <titre> + statut global vu dans l'index
2. **Mes tâches** : compteurs `[x]` / `[~]` / `[ ]` (à lire dans `lots.md` si l'humain demande le détail)
3. **Soft-locks actifs** : count + qui touche à quoi
4. **Dernier journal** : <date> · <feature> · suite proposée
5. **Question** : "Sur quoi tu veux travailler ?"

# Règles

- Ne fais rien d'autre que lire et résumer.
- N'écris pas de code, pas de commit.
- Si tu détectes une incohérence (branche main, CI rouge, lock expiré) → mentionne dans le récap.
