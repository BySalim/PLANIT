---
description: Trace une dette technique identifiée pendant l'implémentation, sans la fixer maintenant. Crée une issue GitHub avec le contexte.
allowed-tools: Bash, Read, Write
---

Trace une dette technique : **$ARGUMENTS**.

## Étape 1 — Comprendre

Pose-moi 3 questions :

1. **Où** : quel fichier / module / endpoint est concerné ?
2. **Pourquoi c'est une dette** : qu'est-ce qui ne va pas (perf, sécurité, lisibilité, dette de spec) ?
3. **Quand la rembourser** : urgence (Sprint 2 / Sprint final / quand on touchera à ce code) ?

## Étape 2 — Capture

1. Crée ou append dans `docs/tech-debt.md` une entrée structurée :

   ```markdown
   ## TD-<NNN> — <Titre>

   - **Localisation** : <fichier:ligne ou module>
   - **Découvert le** : <date> dans contexte <PR/issue/feature>
   - **Symptôme** : <description courte>
   - **Cause supposée** : <…>
   - **Impact si non remboursé** : <…>
   - **Effort estimé** : <Xh>
   - **Priorité** : low / medium / high
   - **À traiter au plus tard** : <sprint ou condition>
   ```

2. Crée une issue GitHub via `gh issue create` avec :
   - Label : `tech-debt` + priorité (`p-low|p-medium|p-high`)
   - Titre : `[tech-debt] <Titre>`
   - Body : référencer `docs/tech-debt.md#TD-<NNN>`

3. Si la dette est urgente → ajouter au sprint suivant (proposer un commit qui modifie le fichier sprint)

## Étape 3 — Ne PAS la fixer maintenant

Sauf si trivial (< 5 min ET clairement dans le scope de la feature actuelle).

Rappel : la dette tracée vaut mieux que la dette ignorée. La dette fixée à l'arrache au milieu d'une autre feature crée du scope creep.
