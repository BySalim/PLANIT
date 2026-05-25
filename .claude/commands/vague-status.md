---
description: Vue d'ensemble de la vague en cours — tâches faites/en cours/restantes, PR en attente, ADR récents, soft-locks actifs. Idéal après une absence ou pour faire un point.
allowed-tools: Read, Bash, Glob
---

Donne-moi un état complet de la vague en cours.

# À lire

1. `git branch --show-current` puis identifie le membre
2. `../PLANIT-Strategie-VibeCode/vagues/vague-01-index.md` (titre, décisions, statut global) puis `vague-01-lots.md` (tableaux des tâches LOT 0→5)
3. `gh pr list --state open --limit 20`
4. `git log --oneline --all -20`
5. Liste les ADR récents : `ls -t docs/architecture/adr/ | head -5`
6. Lis `docs/shared-resources-lock.md`
7. Lis le dernier journal du membre : `ls -t docs/agent-journal/<membre>/ | head -1`

# Affiche un récap structuré

### 📋 Vague en cours

- Titre · Statut global
- % de tâches complétées (compte des cases `[x]` vs total)

### 👤 Pour <membre actuel>

- Tâches DONE `[x]`
- Tâches IN PROGRESS `[~]` (avec date de début)
- Tâches TODO `[ ]` avec dépendances satisfaites
- Prochaine tâche recommandée (sans bloqueur, matchant ma spécialité)

### 🔒 Soft-locks actifs (zones partagées)

- Liste des zones lockées + par qui + depuis quand

### 🔀 Pull Requests

- PR ouvertes par moi (à reviewer/merger)
- PR à reviewer (assignées ou non)
- PR mergées récemment

### 📐 ADR récents

- Liste des 5 derniers ADR avec leur titre et statut

### 📓 Mon dernier journal

- Date · Feature · Statut
- Suite proposée dans la section « Suite » du journal

### 🚨 Alertes (si applicable)

- Tâche en retard (`[~]` ancienne sans livraison)
- PR sans review depuis > 4h
- CI rouge sur main
- Soft-lock expiré (> 24h sans commit)

### Question finale

"Sur quoi tu veux travailler ?"

# Règles

- Ne fais rien d'autre que lire et résumer.
- N'écris pas de code, pas de commit.
- Si tu détectes une incohérence (branche main, PR conflicts) → mentionne dans le récap.
