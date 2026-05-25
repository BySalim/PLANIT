---
description: Crée un nouvel ADR (Architecture Decision Record) pré-rempli. Argument = titre court de la décision.
allowed-tools: Read, Write, Glob, Bash
---

Crée un ADR pour : **$ARGUMENTS**.

## Étape 1 — Lire le contexte

1. `ls docs/architecture/adr/` pour trouver le prochain numéro
2. Lis les 3 derniers ADR pour t'aligner sur le style
3. `git log --oneline -10` pour comprendre le contexte récent
4. `git diff main...HEAD` pour voir si la décision résulte du code en cours

> Format ADR détaillé à l'étape 3 ci-dessous — pas de doc externe à charger.

## Étape 2 — Pose-moi 4 questions

1. **Contexte** : pourquoi cette décision maintenant ? Quel est le déclencheur (incident, mesure, demande utilisateur, refactor) ?
2. **Options envisagées** : combien et lesquelles ? (Au moins 2, idéalement 3 dont "ne rien faire")
3. **Préférée** : laquelle tu veux retenir ?
4. **Coût/risque** : qui est impacté ? Quel effort de mise en œuvre ?

## Étape 3 — Génère le fichier

Crée `docs/architecture/adr/<NNNN>-<slug-kebab>.md` au format :

```markdown
# ADR-<NNNN> — <Titre>

**Date** : <YYYY-MM-DD>
**Statut** : Proposed
**Décideurs** : <prénoms>

## Contexte

<2-4 paragraphes>

## Options envisagées

### Option A — ...

- Description / Pour / Contre / Effort

### Option B — ...

### Option C — Ne rien faire

- Conséquences si statu quo

## Décision

On retient l'option <X> parce que <raison>.

## Conséquences

### Positives

- ...

### Négatives / coûts

- ...

### À surveiller

- ...

## Plan de migration / mise en œuvre

1. ...

## Décision révisable quand

- <quel signal devrait nous faire reconsidérer>
```

## Étape 4 — Suite

- Propose un commit `docs(adr): ADR-<NNNN> <titre>`
- Recommande de discuter avec l'équipe avant de passer le statut à `Accepted`
- Si la décision modifie une convention → propose la mise à jour du fichier concerné
