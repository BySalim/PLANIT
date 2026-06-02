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

### 5. Quelle URL est auditée — et pourquoi `/login`

Le job audite **uniquement `http://localhost:3000/login`**.

Depuis l'auth V02, le `middleware.ts` (edge) redirige en **307** toute route applicative (`/etudiant`, `/enseignant`, `/rp`…) vers `/login` tant qu'il n'y a pas de cookie de session. Le run Lighthouse CI est **anonyme** (pas de cookie) → auditer ces routes faisait suivre la 307 à Lighthouse et **échouer l'audit `redirects`** (score 0), un **faux négatif** : le redirect d'auth est le comportement attendu, pas une régression perf.

`/login` est le **shell public commun aux 3 acteurs** (même layout, mêmes polices/CSS/JS de base) → ses scores perf/a11y sont représentatifs du chargement initial. On audite donc la seule page réellement atteignable en anonyme.

> **Limite assumée + tech-debt `TD-LH-AUTH-AUDIT`** : on n'audite pas le contenu réel des pages connectées (`/etudiant`, `/enseignant`). Pour ça il faut un **run authentifié** : `lighthouse-ci-action` accepte un `puppeteerScript` qui seed un user + pose le cookie avant l'audit (cf. « Évolutions futures »). À faire quand la perf des vues connectées devient un sujet (sprint perf V03+).

---

## Seuils actuels (`.github/lighthouserc.json`)

Les catégories globales :

| Catégorie      | Niveau | Seuil  |
| -------------- | ------ | ------ |
| Performance    | error  | ≥ 0.85 |
| Accessibility  | error  | ≥ 0.9  |
| Best Practices | warn   | ≥ 0.8  |
| SEO            | off    | —      |

Le preset `lighthouse:no-pwa` ajoute par-dessus une cinquantaine d'assertions individuelles (audits unitaires), toutes à niveau `error` par défaut. **Onze de ces audits sont explicitement downgrade à `warn`** dans la config — ce sont des audits qui demandent un chantier dédié (sécurité prod, sprint perf) ou qui mesurent un comportement légitime (401 audit sans cookie). Liste et justification :

| Audit downgrade à `warn`                                                                                   | Pourquoi                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `csp-xss`                                                                                                  | Notre CSP utilise `'unsafe-inline'` sur `script-src` (Next.js + React 19 hydration). LH exige `'strict-dynamic'` + nonce par requête — chantier `next.config` + middleware = sprint sécurité prod (TD-LH-CSP-NONCE).                                           |
| `errors-in-console`                                                                                        | Chrome log les `fetch` 401 en console. Notre `/api/auth/me` retourne 401 pour visite anonyme — comportement légitime de l'app, pas un bug. Pour repasser en `error`, changer le contrat backend (`/auth/me` → 200 + `{user: null}`) ou auditer LH avec cookie. |
| `total-byte-weight`                                                                                        | App interne campus ; 305 KiB observés bien sous le seuil critique mais le scoring strict LH veut < 100 KiB. Sprint perf dédié = TD-LH-PERF.                                                                                                                    |
| `prioritize-lcp-image`                                                                                     | Logo wordmark = LCP de /login. Preload posé via `<link rel="preload">` ; reste en warn pendant qu'on observe l'effet réel.                                                                                                                                     |
| `bootup-time`, `dom-size`, `mainthread-work-breakdown`, `server-response-time`, `largest-contentful-paint` | Audits perf au scoring strict. Catégorie `performance` ≥ 0.85 reste en `error` (on score 0.97 actuellement) ; les audits individuels sont des indicateurs de tendance.                                                                                         |
| `unused-javascript`, `render-blocking-resources`, `uses-long-cache-ttl`                                    | Sub-optimal mais hors scope V02 (sprint perf et déploiement Caddy à venir).                                                                                                                                                                                    |

> ⚠️ **Important** : `landmark-one-main`, `image-alt`, `unsized-images`, `html-has-lang`, `meta-viewport`, `color-contrast`, et tous les autres audits a11y critiques **restent à `error`**. C'est le levier qui empêche les régressions sur la base accessibilité.

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

Normal — Lighthouse tourne sur toutes les PRs et peut exhumer des dettes existantes. Vérifier d'abord si l'audit est listé dans le tableau des `warn` ci-dessus (si oui, ça génère seulement un warning, pas un fail). Sinon, c'est probablement une nouvelle dette → la tracer dans `docs/tech-debt.md` (entrée `TD-LH-NN`) avant de re-push.

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
- **Audit authentifié** (`TD-LH-AUTH-AUDIT`) : configurer `lighthouse-ci-action` avec un `puppeteerScript` qui pose le cookie auth, pour auditer les pages protégées (`/etudiant`, `/enseignant`) avec leur vrai contenu (plus représentatif du chargement réel utilisateur). Tant que ce n'est pas fait, seul `/login` est audité (cf. § « Quelle URL est auditée »)
- **Catégories par environnement** : seuil différent en dev vs staging (V04+ quand on aura les deux)
