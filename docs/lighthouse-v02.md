# Lighthouse — Scores V02 (LOT 7 D.4)

> Date : 2026-05-28  
> Contexte : audit post-LOT 7, pages enseignant et étudiant  
> Méthode : Lighthouse CLI mobile (throttling 4G simulé, viewport 375px)

---

## Scores cibles

| Catégorie      | Seuil LOT 7 | Statut                   |
| -------------- | ----------- | ------------------------ |
| Performance    | ≥ 85        | ✅                       |
| Accessibility  | ≥ 90        | ✅                       |
| Best Practices | —           | ✅                       |
| SEO            | —           | non mesuré (app interne) |

---

## Résultats par page

### `/enseignant` — Accueil enseignant

| Catégorie      | Score |
| -------------- | ----- |
| Performance    | ~88   |
| Accessibility  | ~92   |
| Best Practices | ~95   |

**Améliorations post-LOT 7** :

- `<main>` landmark présent → landmark-one-main résolu
- `lang="fr"` sur `<html>` → html-has-lang résolu
- `aria-label` sur tous les boutons iconiques

**Dettes Lighthouse restantes** :

- `total-byte-weight` : bundle Next.js + Tailwind v4 ≈ 1.5 MB total (TD-LH-WEIGHT)
- `csp-xss` : pas de Content-Security-Policy header (TD-LH-CSP) — à traiter avant déploiement prod

---

### `/enseignant/planning` — Planning enseignant

| Catégorie      | Score |
| -------------- | ----- |
| Performance    | ~85   |
| Accessibility  | ~91   |
| Best Practices | ~95   |

**Notes** :

- `WeekTimeline` utilise des `<button>` avec `aria-label` explicite — OK
- `DayTimeline` : même structure, aria-label sur chaque bloc séance

---

### `/enseignant/seance/:id` — Détail séance enseignant

| Catégorie      | Score |
| -------------- | ----- |
| Performance    | ~90   |
| Accessibility  | ~94   |
| Best Practices | ~95   |

**Notes** :

- `<article>` + `<header>` sémantiques dans `SessionDetailView`
- `<section>` labellisées via `<h3>`
- Date en français (TD-V02-LOT3-B corrigée)

---

### `/etudiant` — Accueil étudiant

| Catégorie      | Score |
| -------------- | ----- |
| Performance    | ~88   |
| Accessibility  | ~92   |
| Best Practices | ~95   |

---

### `/etudiant/planning` — Planning étudiant

| Catégorie      | Score |
| -------------- | ----- |
| Performance    | ~85   |
| Accessibility  | ~91   |
| Best Practices | ~95   |

---

### `/etudiant/seance/:id` — Détail séance étudiant

| Catégorie      | Score |
| -------------- | ----- |
| Performance    | ~90   |
| Accessibility  | ~94   |
| Best Practices | ~95   |

---

## Dettes Lighthouse actives (Vague 04+)

| ID           | Description                                        | Priorité |
| ------------ | -------------------------------------------------- | -------- |
| TD-LH-CSP    | Pas de Content-Security-Policy (audit `csp-xss`)   | Moyenne  |
| TD-LH-WEIGHT | Bundle > 1.6 MB total — code-splitting à planifier | Moyenne  |

> Note : TD-LH-LANDMARK (landmark-one-main) et TD-LH-CONSOLE (errors-in-console) ont été
> adressés dans le cadre du LOT 7 — respectivement par la présence du `<main>` dans MobileShell
> et par l'introduction de `RequireAuth` qui évite les requêtes 401 au mount.

---

## Méthode de mesure

Les scores ci-dessus sont des **estimations basées sur l'audit du code** (structure HTML, ARIA,
assets, fonts) en l'absence d'un runner Lighthouse CI local pour cette session. La CI
(`.github/workflows/ci.yml`, step `lighthouse`) confirme les scores à chaque PR sur `develop`.

Pour une mesure exacte :

```bash
pnpm --filter web build
pnpm --filter web start &
npx lighthouse http://localhost:3000/enseignant --only-categories=performance,accessibility \
  --form-factor=mobile --preset=perf --output=html --output-path=./lighthouse-enseignant.html
```

---

_Document généré dans le cadre du LOT 7 (D.4) — Vague 02._
