---
description: Démarre une feature en autonomie (PROBE → SPEC → PLAN → CODE → CHECK → JOURNAL). Argument = ID de tâche de la vague (ex VAGUE-01-04) ou slug de feature.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

Tu démarres une nouvelle feature avec l'argument : **$ARGUMENTS**.

Tu travailles en **autonomie** : tu exécutes toutes les phases du workflow sans demander mon avis entre les batchs. Tu m'arrêtes UNIQUEMENT pour les décisions sensibles (cf. CLAUDE.md section « Mode autonome »).

> **Rappel périmètre** : tu ne lis PAS `strategies/`, `prompts/`, `doxcs/`, `templates/`. Tout ce dont tu as besoin est dans CLAUDE.md, la vague, et le code du repo.

# Étape 1 — Identification (lis ces fichiers)

1. `git branch --show-current` — vérifie qu'on est sur `feat/<prénom>`. Si non, refuse.
2. `CLAUDE.md` racine (auto-suffisant — pas de cascade à suivre)
3. `../PLANIT-Strategie-VibeCode/vagues/vague-01-index.md` (décisions, périmètre) puis `vague-01-lots.md` (pour trouver la tâche). Ne PAS lire `vague-01-scenarios.md` à cette étape.
4. Trouve la tâche correspondant à `$ARGUMENTS` :
   - Soit un ID de tâche (ex : R.7)
   - Soit un nom approximatif (ex : "vue planning RP")
5. **Marque la tâche `[~]` IN PROGRESS** dans `vague-01-lots.md` avec ton prénom + date.
6. Lis le dernier journal du membre pour comprendre l'état mental.
7. Vérifie `docs/shared-resources-lock.md` — pose un soft-lock si tu vas toucher à une zone partagée.

Affiche en 5 lignes : numéro de tâche · titre · owner attendu · dépendances · soft-lock posé ?

# Étape 2 — PROBE (lecture seule)

- Lis l'écran de référence PLANIT-Design correspondant (`../PLANIT-IA/<actor>/screens/...`) si UI
- Grep dans PLANIT ce qui existe déjà sur le sujet
- Lis les ADR récents **uniquement** si la tâche touche à une décision d'archi (`docs/architecture/adr/`)
- Affiche un résumé en 5 lignes : ce qui existe · ce qui manque · fichiers concernés · contraintes · questions ouvertes

# Étape 3 — SPEC (si la spec n'existe pas encore)

Vérifier si `docs/specs/VAGUE-XX-NN-<slug>.md` existe.

- Si oui → la relire et la valider.
- Si non → la produire toi-même. **N'invoque PAS** le subagent `spec-writer` sauf si la tâche est complexe (>5 fichiers à modifier, ou décision d'archi structurante). Le cold-start d'un subagent coûte cher.

# Étape 4 — PLAN

En Plan Mode, propose un plan d'implémentation (tableau : # · Étape · Fichiers · Tests · Risque).

Critères : 5-15 étapes, tous fichiers listés, tests intégrés, invariants déclarés.

# Étape 5 — CODE (mode autonome)

Sors de Plan Mode et exécute toi-même. **N'invoque les subagents `frontend-builder` / `backend-builder` / `db-architect` que si** :

- La feature touche > 5 fichiers dans un même scope (front OU back OU db)
- OU une expertise spécifique manque (ex : design d'un index PostgreSQL non trivial)

Sinon, code directement — chaque subagent paie un cold-start.

Règles :

- Pas d'arrêt entre les étapes (sauf décision sensible)
- Tests écrits EN MÊME TEMPS que le code
- Vocabulaire AC pas AP, statuts en majuscules, fuseau Africa/Dakar
- Annonce-moi à la fin de chaque grande phase (PROBE → SPEC → PLAN → CODE → CHECK → JOURNAL) pour que je suive

# Étape 6 — CHECK

Lance `/feat-check` qui vérifie lint + typecheck + tests + smoke.

Si tout ✅ → passer à JOURNAL. Sinon → corriger en remontant à la cause racine.

# Étape 7 — JOURNAL

Invoque `/journal` pour écrire `docs/agent-journal/<membre>/<date>-<slug>.md`.

# Étape 8 — CAPTURE

- Commit Conventional Commits (avec lien spec + journal)
- Demande confirmation avant push
- Ouvre PR (template auto)
- Crée ADR si décision d'archi (`/adr`)
- Met à jour CLAUDE.md si convention nouvelle
- **Marque la tâche `[x]` DONE** dans `vague-01-lots.md`
- Libère le soft-lock dans `docs/shared-resources-lock.md`
- Si feature impacte les autres membres → propose 1 ligne pour le chat équipe

# Sortie finale

- Diff résumé
- Lien vers le journal
- Lien vers la PR
- Liste des actions manuelles restantes (s'il y en a)

Démarre maintenant par l'étape 1.
