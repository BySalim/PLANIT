# Runbook — CI Lighthouse mobile

> Comment marche le job Lighthouse en CI, comment le rendre bloquant
> quand on en a besoin, comment lire les rapports.

---

## TL;DR

| Tu veux                                                        | Tu fais                                                                                                                                         |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Auditer ta PR (par défaut)                                     | Rien. Le job tourne sur chaque PR vers `develop`/`main`. Rapport dispo dans les artefacts                                                       |
| Que le job **bloque** ta PR feature → develop si elle régresse | Pose le label **`lighthouse-strict`** sur la PR                                                                                                 |
| Auditer strictement une **release** `develop → main`           | Rien — c'est **automatiquement strict** sur les PRs ciblant `main`                                                                              |
| Voir le rapport HTML détaillé                                  | Onglet **Actions** → run de la PR → step `Run Lighthouse CI` → liens `storage.googleapis.com/lighthouse-infrastructure...` postés dans les logs |
| Désactiver Lighthouse sur une PR ponctuelle                    | Tu ne peux pas (et tu ne dois pas). Sur les PR vers `develop`, il est déjà informationnel par défaut                                            |

---

## Politique

### 1. Le job tourne **sur toutes les PRs** ciblant `develop` ou `main`

Pas de condition sur la branche source, pas de label requis. L'idée : chaque dev voit l'impact perf/a11y/SEO/best-practices de ses changements **au moment où il ouvre sa PR**, pas trois sprints plus tard quand quelqu'un d'autre se prend les régressions accumulées.

Pas de Lighthouse sur les push directs sur `feat/*` (économie de temps CI — les push intermédiaires ne sont pas relus).

### 2. Le gating dépend de la cible de la PR

Concrètement, dans `.github/workflows/ci.yml` :

```yaml
- name: Run Lighthouse CI (mobile)
  continue-on-error: ${{ github.base_ref != 'main' && !contains(github.event.pull_request.labels.*.name, 'lighthouse-strict') }}
```

L'expression évalue à `true` (step non bloquant) **uniquement si** la PR cible `develop` ET n'a pas le label strict. Sinon le step est bloquant.

Matrice complète :

| Cible PR  | Label `lighthouse-strict` | Comportement                                       |
| --------- | ------------------------- | -------------------------------------------------- |
| `develop` | non                       | **Informationnel** — annotations warning, job vert |
| `develop` | oui                       | **Bloquant** — failure si assertions échouent      |
| `main`    | non                       | **Bloquant automatiquement** — pas besoin de label |
| `main`    | oui                       | **Bloquant** — redondant mais OK                   |

Quand le step est en mode informationnel, GitHub annote quand même les échecs avec une icône ⚠️ jaune dans l'UI — le signal reste visible, on ne le cache pas. Mais la branch protection ne bloque pas.

### 3. Pourquoi auto-strict sur `main`

Une PR `develop → main` est une **release officielle**. C'est le moment où on garantit la qualité du build avant de toucher la branche que la production suit. Pas de mode laxiste à ce niveau : si Lighthouse fail, on fixe avant de releaser.

Conséquence pratique : les 4 dettes Lighthouse existantes (`TD-LH-*`) doivent être adressées **avant la première release vers main**. Sinon impossible de cliquer Merge sur la PR de release. C'est le bon levier — sans ça, ces dettes traîneraient indéfiniment.

### 4. Quand utiliser `lighthouse-strict` sur une PR develop

- **Sprint perf dédié** : on veut forcer l'équipe à ne pas régresser pendant qu'on travaille sur l'optim
- **PR responsabilisante** : Salim peut le poser sur n'importe quelle PR feature s'il considère que l'auteur doit prendre les rapports au sérieux avant le merge
- **Pre-release** : sur une PR develop juste avant d'enchaîner avec une PR develop → main, pour anticiper

Ne pas l'utiliser comme défaut sur les PRs feature. Le défaut est volontairement permissif pour éviter le "Lighthouse rouge" récurrent qui fait que personne ne regarde plus.

---

## Seuils actuels (`.github/lighthouserc.json`)

Les catégories globales :

| Catégorie      | Niveau | Seuil  |
| -------------- | ------ | ------ |
| Performance    | error  | ≥ 0.85 |
| Accessibility  | error  | ≥ 0.9  |
| Best Practices | warn   | ≥ 0.8  |
| SEO            | off    | —      |

Le preset `lighthouse:no-pwa` ajoute par-dessus une cinquantaine d'assertions individuelles (audits unitaires). Quatre de ces audits échouent actuellement à cause de dettes pré-existantes — voir `docs/tech-debt.md` (entrées `TD-LH-*`).

> ⚠️ **Important** : on n'a **pas** downgrade ces 4 audits à `warn` dans `lighthouserc.json`. Ils restent à `error`. La raison : quand quelqu'un applique le label `lighthouse-strict`, on veut que ces audits soient bel et bien bloquants. C'est ce qui forcera l'équipe à les fixer un jour. Si on les passait à `warn` permanents, on aurait perdu le levier.

---

## Lire un rapport

### Depuis les logs du run

Le step `Run Lighthouse CI` log deux liens (un par URL auditée) :

```
Report: https://storage.googleapis.com/lighthouse-infrastructure.appspot.com/reports/<id>.report.html
```

Ces URLs sont publiques et durables ~30 jours (hébergement temporaire fourni par le `temporaryPublicStorage: true` côté action). Ouvre dans le browser → rapport Lighthouse complet (Performance + Accessibility + Best Practices + SEO + détails de chaque audit avec recommandations).

### Depuis les artefacts du run

L'onglet **Actions** → ton run → section **Artifacts** → télécharge le ZIP. Tu y trouves les rapports HTML et JSON locaux.

---

## Cas d'usage typiques

### « Ma PR est rouge à cause de Lighthouse »

Vérifie d'abord la cible de la PR :

- **PR → `develop` sans label** : elle n'est **pas** rouge à cause de Lighthouse. Le step est annoté warning mais le job final est vert. Vérifie le rollup global de la PR — c'est probablement un autre check.
- **PR → `develop` avec `lighthouse-strict`** : Lighthouse bloque. Regarde le rapport, fixe, repush. Si le seuil est intenable parce que ta PR est hors scope perf, **enlève le label** (Salim peut l'enlever) et ouvre une tech-debt dédiée.
- **PR → `main`** : Lighthouse est **toujours strict**. Tu ne peux pas l'esquiver — c'est une release. Si les 4 dettes Lighthouse pré-existantes ne sont pas résolues, ta PR develop → main est bloquée jusqu'à ce qu'elles le soient.

### « Je veux savoir si ma PR fait baisser les perfs »

Tu n'as rien à faire — le rapport est généré. Va dans Actions, ouvre le run de ta PR, lis les scores. Compare avec ce qu'avait `develop` au moment où tu as branché.

Pour une comparaison historique plus rigoureuse (LCP avant / après par exemple), un outil dédié genre `lhci server` serait mieux. À considérer si la perf devient un sujet prioritaire (V03+).

### « Je veux forcer un seuil strict sur cette PR »

Pose le label `lighthouse-strict` sur la PR (depuis l'UI GitHub : sidebar droite → **Labels** → `lighthouse-strict`).

Le label peut être créé une fois pour toutes via `gh label create lighthouse-strict --color "ee0701" --description "Active le gating bloquant du job Lighthouse CI"`.

### « Lighthouse échoue mais c'est de la dette qui n'est pas de mon fait »

Normal — Lighthouse tourne sur toutes les PRs maintenant et exhume les dettes existantes (CSP, console errors, missing `<main>`, bundle weight). Voir `TD-LH-*` dans `docs/tech-debt.md`.

Si tu vois un audit qui fail et qui n'est pas tracé en tech-debt, **trace-le toi-même** (ou pingue Salim) — c'est probablement une nouvelle dette à inscrire.

---

## Pourquoi pas d'autres approches

| Alternative envisagée                                                             | Pourquoi écartée                                                                                                                          |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Lighthouse uniquement sur `feat/libasse` (état précédent)                         | Distribution injuste de la responsabilité : seul Libasse voyait les régressions, les autres dev pouvaient dégrader la perf sans le savoir |
| Lighthouse bloquant sur toutes les PRs                                            | Trop sévère : les dettes pré-existantes (4 audits) bloquaient les PRs sans rapport avec elles                                             |
| Lighthouse bloquant manuel via label uniquement (sans auto-strict sur main)       | Risque d'oubli au moment d'une release develop → main. La PR de release pourrait passer sans audit strict si on oublie le label           |
| Downgrade des 4 audits problématiques à `warn` permanent dans `lighthouserc.json` | Perte du levier futur : impossible de gating strict sans repasser à `error` ailleurs                                                      |
| `continue-on-error: true` inconditionnel                                          | Aveuglement : impossible de gating strict tout court. La barre ne peut jamais monter sans modifier le workflow                            |
| Action custom avec post-step qui re-vérifie les assertions selon label            | Sur-ingénierie : le natif `continue-on-error` avec expression GitHub est plus simple et fait le job                                       |

---

## Évolutions futures

- **`lhci server`** : stocker l'historique des rapports pour comparaison delta entre commits (V03+)
- **Audit authentifié** : configurer `lighthouse-ci-action` avec un `puppeteerScript` qui pose le cookie auth, pour auditer les pages protégées avec leur vrai contenu (plus représentatif du chargement réel utilisateur)
- **Catégories par environnement** : seuil différent en dev vs staging (V04+ quand on aura les deux)
