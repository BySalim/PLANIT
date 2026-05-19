---
description: Phase CHECK du workflow. Lance lint + typecheck + tests + smoke test sur la feature en cours, puis résume l'état avant commit.
allowed-tools: Bash, Read
---

Vérifie que la feature en cours est prête à committer.

## Vérifications automatiques

Lance dans l'ordre (parallélise quand possible) :

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm build` (optionnel — si modif d'un app)

Pour chaque commande, capture l'exit code et résume :

- ✅ OK / ❌ KO + nombre d'erreurs/warnings

## Smoke test manuel

- Si la feature touche au backend : propose un curl ou un test Swagger
- Si la feature touche au frontend : propose la liste des écrans à vérifier dans le navigateur (URLs locales) avec le check minimum :
  - Pas d'erreur rouge dans la console
  - Golden path fonctionne
  - 1 cas d'erreur testé

## Verdict

À la fin, donne un verdict :

- 🟢 **PRÊT À COMMITTER** : toutes les vérifs auto passent et le smoke test est documenté
- 🟡 **À COMMITTER AVEC NOTES** : warnings ESLint mineurs, à fixer dans un prochain commit
- 🔴 **PAS PRÊT** : tests/typecheck en erreur — diagnostic root cause requis (lance le prompt de debug si besoin)

Si 🟢 ou 🟡, propose le message de commit Conventional Commits adapté à ce qui a été fait.
