---
description: Écrit ou complète le fichier de journal d'agent pour la feature en cours (phase JOURNAL du workflow). Auto-invoqué à la fin de /feat-start. Argument optionnel = description courte si journal hors-feature.
allowed-tools: Read, Write, Edit, Bash, Glob
---

Phase JOURNAL du workflow.

# Identification

1. `git branch --show-current` → identifier le membre (feat/salim → salim)
2. Date du jour : YYYY-MM-DD
3. Slug feature : depuis le contexte de la session OU depuis $ARGUMENTS si fourni

# Chemin du fichier

`docs/agent-journal/<membre>/<YYYY-MM-DD>-<feature-slug>.md`

Si le fichier existe déjà → ajouter une section « Reprise <HH:MM> » à la fin et continuer. Sinon → créer en partant du format complet.

# Format strict (cf. strategies/11-TRACABILITE-AUTONOME.md)

```markdown
---
membre: <prénom>
date: <YYYY-MM-DD>
feature: VAGUE-XX-NN-<slug>
vague: XX
spec: docs/specs/VAGUE-XX-NN-<slug>.md (ou "aucune")
pr: #<numéro> (ou "à ouvrir")
duree-session: ~Xh
statut: en-cours / livré / bloqué
---

# <YYYY-MM-DD> — <Titre> (VAGUE-XX-NN)

## 1. Directives reçues du membre

> Paraphrase / citations des consignes.

## 2. Décisions techniques prises (de manière autonome)

| #   | Décision | Pourquoi | Réversible ? |
| --- | -------- | -------- | ------------ |

## 3. Décisions soumises au membre pour validation

> Si aucune : "Aucune."

## 4. Modifications effectuées

### Fichiers créés

- ...

### Fichiers modifiés

- chemin (+X / -Y, raison)

### Migration BD

- nom ou "Aucune"

### Tests ajoutés

- chemin (+N tests, type)

## 5. Phase CHECK — résultats

\`\`\`
pnpm lint ...
pnpm typecheck ...
pnpm test ...
Smoke navigateur ...
\`\`\`

## 6. Surprises / blocages

- ⚠️ ...
- ❓ ...

## 7. Suite

- PR : ...
- Prochaine tâche : ...
- Soft-locks : ...
- Avertissements aux autres : ...

## 8. Mises à jour annexes

- [ ] CLAUDE.md racine
- [ ] ADR créé (lien)
- [ ] docs/tech-debt.md
- [ ] Slash command custom
```

# Règles d'écriture

- Compact mais explicite : 1 page max
- Le « pourquoi » prime sur le « quoi » (le quoi est dans git)
- Toujours en français
- Si session sans livrable → écrire quand même un journal court avec « Statut: exploration »
- Anti-patterns à éviter (cf. strategies/11-TRACABILITE-AUTONOME.md) :
  - Journal vide
  - Journal qui répète le diff
  - Journal de 5 pages
  - Journal écrit jours après

# Après écriture

- Annonce : « Journal écrit : <chemin> »
- Si commit à faire ensuite : inclure dans le commit message :
  `Journal: docs/agent-journal/<membre>/<date>-<slug>.md`
- Si PR à ouvrir : inclure le lien dans la description PR (section « Journal »)
