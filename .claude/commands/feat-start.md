---
description: Démarre une feature en autonomie (PROBE → SPEC → PLAN → CODE → CHECK → JOURNAL). Argument = ID de tâche de la vague (ex VAGUE-01-04) ou slug de feature.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

Tu démarres une nouvelle feature avec l'argument : **$ARGUMENTS**.

Tu travailles en **autonomie** : tu exécutes toutes les phases du workflow sans demander mon avis entre les batchs. Tu m'arrêtes UNIQUEMENT pour les décisions sensibles (cf. CLAUDE.md section « Mode autonome »).

# Étape 1 — Identification (lis ces fichiers)

1. `git branch --show-current` — vérifie qu'on est sur `feat/<prénom>`. Si non, refuse.
2. `CLAUDE.md` racine
3. La vague active : `../PLANIT-Strategie-VibeCode/vagues/vague-*.md` (la plus récente non terminée)
4. Trouve la tâche correspondant à `$ARGUMENTS` :
   - Soit un ID de tâche (ex : C4)
   - Soit un nom approximatif (ex : "vue planning RP")
5. **Marque la tâche `[~]` IN PROGRESS** dans le fichier vague avec ton prénom + date.
6. Lis le dernier journal du membre pour comprendre l'état mental.
7. Vérifie `docs/shared-resources-lock.md` — pose un soft-lock si tu vas toucher à une zone partagée.

Affiche en 5 lignes : numéro de tâche · titre · owner attendu · dépendances · soft-lock posé ?

# Étape 2 — PROBE (lecture seule)

- Lis l'écran de référence PLANIT-Design correspondant (`../PLANIT-IA/<actor>/screens/...`)
- Grep dans PLANIT ce qui existe déjà sur le sujet
- Lis les ADR récents touchant au sujet
- Affiche un résumé en 5 lignes : ce qui existe · ce qui manque · fichiers concernés · contraintes · questions ouvertes

# Étape 3 — SPEC (si la spec n'existe pas encore)

Invoque le subagent **spec-writer** pour produire `docs/specs/VAGUE-XX-NN-<slug>.md`.

Si la spec existe déjà → la relire et la valider, sinon la produire.

# Étape 4 — PLAN

En Plan Mode, propose un plan d'implémentation (tableau : # · Étape · Fichiers · Tests · Risque).

Critères : 5-15 étapes, tous fichiers listés, tests intégrés, invariants déclarés.

# Étape 5 — CODE (mode autonome)

Sors de Plan Mode et exécute. Invoque le subagent approprié (**frontend-builder**, **backend-builder**, **db-architect**) en séquence si besoin.

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
- **Marque la tâche `[x]` DONE** dans le fichier vague
- Libère le soft-lock dans `docs/shared-resources-lock.md`
- Si feature impacte les autres membres → propose 1 ligne pour le chat équipe

# Sortie finale

- Diff résumé
- Lien vers le journal
- Lien vers la PR
- Liste des actions manuelles restantes (s'il y en a)

Démarre maintenant par l'étape 1.
