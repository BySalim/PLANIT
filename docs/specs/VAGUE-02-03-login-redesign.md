# SPEC — VAGUE-02-03 · Refonte UI page `/login` (LOT 6.1)

**Vague :** 02 · **Lot officiel :**67.1 (Refonte UI login, tâches L.1–L.4)
**Auteur :** Agent IA spec-writer (UI login) · **Relecture :** Salim · **Date :** 2026-05-30 · **Statut :** À valider · **Branche :** `feat/salim` (spec) puis `feat/oumy` (implémentation)

> Référence planning : `PLANIT-Strategie-VibeCode/vagues/vague-02-lots.md` (LOT 6.1, tâches L.1–L.4).
> Code existant à refondre : `apps/web/src/app/login/page.tsx` (livré LOT 6 par Oumy) + `apps/web/src/app/login/layout.tsx`.
> Décision V2-D2 : page `/login` unique pour les 3 acteurs ; le rôle issu de `POST /auth/login` détermine la home (`ROLE_HOME` dans `auth-context.tsx`).
> Pas de référence visuelle PLANIT-IA (aucune maquette login dans `../PLANIT-IA/`).

---

## Objectif

Refondre la page `/login` (livrée fonctionnelle au LOT 6) pour atteindre un niveau visuel **professionnel, sobre et institutionnel** cohérent avec le contexte ISM Dakar, tout en restant **mobile-first** (375 → 768 → 1280) et **accessible** (Lighthouse a11y ≥ 90 / perf ≥ 85).

L'objectif n'est **pas** de refaire l'auth (les contrats, le flow `login → /auth/me`, la redirection `ROLE_HOME`, la gestion d'erreur serveur restent identiques), mais de produire une UI **présentable au tech-lead et au commanditaire ISM**, qui inspire confiance dès l'écran d'entrée. L'auth backend (LOT 1) et le contexte `useAuth` (LOT 6) sont consommés tels quels.

---

## Périmètre

**IN** :

- Refonte visuelle complète de la page `/login` (page + layout)
- Extraction d'un composant `<LoginForm>` réutilisable et testable (séparé du wrapper page)
- Composant `<PasswordInput>` avec bouton afficher/masquer mot de passe accessible
- Ajout des icônes `EyeIcon` / `EyeOffIcon` dans `@planit/ui` (`packages/ui/src/icons/index.tsx`)
- Hiérarchie visuelle revue : logo + wordmark + tagline ISM + formulaire centré avec carte premium
- États error / loading / focus / hover / disabled cohérents avec les tokens PLANIT
- Responsive vrai mobile-first (375 d'abord, élargissement progressif jusqu'à 1280)
- Tests unitaires Vitest + Testing Library (rendu + interaction toggle password)

**OUT** :

- ❌ Modification du flow auth (contrats, endpoints, redirection, intercepteur 401/403)
- ❌ Fonctionnalité « Mot de passe oublié » (V03, pas dans les contrats LOT 1)
- ❌ Fonctionnalité « Se souvenir de moi » (cookies httpOnly gérés serveur, pas besoin client)
- ❌ SSO / OAuth / MFA (V03+)
- ❌ Onboarding / inscription publique (pas dans le modèle ISM — comptes provisionnés par AC)
- ❌ Thème sombre (V03 si demande)
- ❌ Internationalisation (français uniquement V02)

---

## État actuel — analyse rapide

**Ce qui marche bien** (à conserver) :

- Stack form : `react-hook-form` + `@hookform/resolvers/zod` + `loginSchema` de `@planit/contracts`
- Flow : `await login(email, pwd)` puis `router.replace(ROLE_HOME[user.role] ?? '/rp')`
- Redirection auto si déjà authentifié (`useEffect` sur `state.status === 'authenticated'`)
- Gestion `serverError` via `state` local et `setServerError`
- Layout centré viewport (`min-h-screen items-center justify-center bg-bg`)

**Ce qui ne va pas** (à refondre) :

- Champs `<input>` natifs (au lieu du primitive `<Input>` partagé `apps/web/src/components/ui/input.tsx`) → incohérence visuelle avec le reste du produit, focus ring divergent
- Pas de bouton afficher/masquer mot de passe (exigence utilisateur explicite)
- Aucun split de composant : tout est dans la page → non testable isolément
- Carte plate (`rounded-2xl border shadow-sm`) sans relief, pas d'identité visuelle marquée — manque le côté « entrée officielle ISM »
- Aucune respiration visuelle : tagline rikiki sous le wordmark, pas de hiérarchie de poids tipo (`h1` invisible, `h2` faible)
- Pas de bandeau / illustration / fond travaillé → on dirait un formulaire admin générique
- Mobile : la carte `max-w-sm` avec `p-8` n'a pas de breakpoint dédié, pas de réduction des paddings/typo sur 375
- `autoFocus` sur le champ email viole l'a11y (jsx-a11y/no-autofocus disabled) — à conserver mais via `useEffect` propre ou un focus géré conditionnellement (au minimum justifié dans le code)
- Erreur serveur : `role="alert"` correct mais pas de `aria-live` explicite, et les erreurs de champ Zod n'ont pas d'`aria-describedby` reliant input ↔ message
- Pas d'aperçu visuel de marque (gradient PLANIT marron→orange disponible via `bg-brand-gradient` mais non utilisé)

---

## Mapping route ↔ fichier

| Élément              | Fichier                                                          | Statut                                                                                              |
| -------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Page `/login`        | `apps/web/src/app/login/page.tsx`                                | À refondre — devient un wrapper léger qui rend `<LoginForm>`                                        |
| Layout               | `apps/web/src/app/login/layout.tsx`                              | À refondre — décor visuel (bandeau brand desktop, fond sobre mobile)                                |
| Composant formulaire | `apps/web/src/components/auth/login-form.tsx`                    | **À créer** — `'use client'`, contient toute la logique form + onSubmit + serverError               |
| Composant password   | `apps/web/src/components/auth/password-input.tsx`                | **À créer** — `<Input>` avec bouton œil intégré, prop forwardée pour `react-hook-form` (`register`) |
| Icônes               | `packages/ui/src/icons/index.tsx`                                | **Ajouter** `EyeIcon` + `EyeOffIcon` (stroke style Lucide, cohérent avec icônes existantes)         |
| Tests                | `apps/web/src/components/auth/__tests__/login-form.test.tsx`     | **À créer** — rendu + toggle interaction                                                            |
| Tests password       | `apps/web/src/components/auth/__tests__/password-input.test.tsx` | **À créer** — toggle type + aria-label                                                              |

---

## Structure visuelle cible

### Wireframe mobile (375px — vue par défaut)

```
┌─────────────────────────────────┐
│ ▒▒▒▒▒▒▒▒ (bg-bg) ▒▒▒▒▒▒▒▒▒▒▒▒ │  ← fond sobre, pas de bandeau
│                                 │
│         [LOGO PLANIT 56px]     │  ← logo-wordmark-color.svg
│       ISM Dakar — Planning      │  ← tagline text-text-muted
│                                 │
│  ┌───────────────────────────┐ │
│  │ Connexion                 │ │  ← h1 font-display text-xl
│  │ Accédez à votre planning  │ │  ← sous-titre text-text-sec text-sm
│  │                           │ │
│  │ Adresse e-mail            │ │  ← label text-sm font-medium
│  │ [✉ prenom.nom@ism.sn   ] │ │  ← <Input> primitive, icône leading
│  │                           │ │
│  │ Mot de passe              │ │
│  │ [🔒 ••••••••••••     👁] │ │  ← <PasswordInput>, icône leading + toggle trailing
│  │                           │ │
│  │ ┌─────────────────────┐   │ │
│  │ │  Se connecter   →   │   │ │  ← button primary h-11, full width
│  │ └─────────────────────┘   │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

### Wireframe desktop (≥ 1024px — split-screen)

```
┌──────────────────────────────────────────────────────────────────┐
│ ┌──────────────────────┐  ┌─────────────────────────────────────┐│
│ │                      │  │                                     ││
│ │ bg-brand-gradient    │  │       [LOGO PLANIT 56px]            ││
│ │ -deep                │  │     ISM Dakar — Planning            ││
│ │                      │  │                                     ││
│ │  [LOGO blanc 80px]   │  │  ┌─────────────────────────────┐   ││
│ │                      │  │  │ Connexion                   │   ││
│ │  PLANIT              │  │  │ Accédez à votre planning    │   ││
│ │                      │  │  │                             │   ││
│ │  L'emploi du temps   │  │  │ Adresse e-mail              │   ││
│ │  de l'ISM, en clair  │  │  │ [✉ ___________________]    │   ││
│ │                      │  │  │                             │   ││
│ │  • Planning live     │  │  │ Mot de passe                │   ││
│ │  • Validation rapide │  │  │ [🔒 ___________________ 👁] │   ││
│ │  • Notif WhatsApp    │  │  │                             │   ││
│ │                      │  │  │ [    Se connecter    →    ] │   ││
│ │                      │  │  └─────────────────────────────┘   ││
│ └──────────────────────┘  └─────────────────────────────────────┘│
│        ~50% width                       ~50% width               │
└──────────────────────────────────────────────────────────────────┘
```

### Wireframe tablette (768px — vue intermédiaire)

Identique au mobile mais avec :

- carte élargie à `max-w-md` (au lieu de `max-w-sm`)
- paddings carte `p-8` (vs `p-6` mobile)
- typo titre `text-2xl` (vs `text-xl` mobile)
- bandeau gauche **caché** (apparaît uniquement à `lg:` 1024+)

---

## Comportements et interactions

### Champ email

- Type `email`, `autoComplete="email"`, `inputMode="email"`, `spellCheck={false}`, `autoCapitalize="none"`
- Placeholder : `Entrer le login`
- Icône leading `<MailIcon size={18} />` à gauche, intérieur du champ (padding `pl-10`)
- **Focus initial** : email reçoit le focus au mount via `useEffect(() => emailRef.current?.focus(), [])` plutôt que `autoFocus` natif → cohérent a11y, désactivable si `prefers-reduced-motion` (optionnel)
- Validation Zod : email valide, requis → erreur affichée sous le champ via `<FormField>` primitive ou pattern équivalent. Lien input ↔ erreur via `aria-describedby` + id unique (`useId`)

### Champ mot de passe (`<PasswordInput>`)

- Type initial `password`, `autoComplete="current-password"`
- Placeholder : `Entrer le mot de passe`
- Icône leading `<LockIcon size={18} />` à gauche (intérieur, `pl-10`) — ⚠️ `LockIcon` à créer en même temps que `EyeIcon`/`EyeOffIcon` dans `@planit/ui` ; design stroke style Lucide cohérent
- **Bouton toggle** trailing : icône `<EyeIcon>` (mot de passe masqué) ↔ `<EyeOffIcon>` (mot de passe visible)
  - `type="button"` (pas submit !)
  - `aria-label="Afficher le mot de passe"` / `aria-label="Masquer le mot de passe"` selon l'état
  - `aria-pressed={visible}` pour signaler l'état toggle aux lecteurs d'écran
  - `tabIndex={0}` (par défaut sur `<button>`, à ne pas surcharger à -1)
  - Position absolue à droite du champ, centré vertical, padding interne `p-2`, hover `text-primary` sur l'icône
  - Le clic toggle `type` localement via `useState<'password' | 'text'>('password')`, sans perdre le focus du champ
- Pas de bouton « Mot de passe oublié » (hors scope, V03)

### Bouton « Se connecter »

- `<Button variant="primary" size="lg" className="w-full">` (size lg = h-12, lisibilité tactile mobile)
- État loading : texte « Connexion… » + spinner inline (utilisable : SVG inline 16x16 avec `animate-spin`)
- Disabled si `isSubmitting` (déjà géré par `react-hook-form`)
- Icône trailing `→` (ChevronRightIcon) optionnelle pour signaler l'action « avancer »

### Erreurs

- **Erreurs de validation client (Zod)** : sous chaque champ, `text-xs text-err`, lien `aria-describedby` vers l'id du message. Pas de toast.
- **Erreur serveur** (`serverError`) : zone en haut du formulaire (ou juste au-dessus du bouton submit), `role="alert"` + `aria-live="polite"`, icône `<AlertIcon>` (déjà dans `@planit/ui`), bordure `border-err`, fond `bg-err-100`, texte `text-err`, padding cohérent. Disparaît dès qu'un champ est modifié (reset via `onChange`).
- **Mapping erreurs serveur attendues** (du backend LOT 1) :
  - 401 « Identifiants incorrects » → message générique (ne pas révéler si l'email existe — sécurité)
  - 429 (throttle 5/min/IP en prod) → « Trop de tentatives, réessayez dans une minute »
  - 503 / réseau → « Service indisponible, vérifiez votre connexion »
  - Fallback : `err.message` ou « Une erreur est survenue »

### États visuels (résumé)

| État             | Comportement visuel                                                              |
| ---------------- | -------------------------------------------------------------------------------- |
| Idle             | Inputs `bg-surface`, border `border` (gris), texte `text-text`                   |
| Focus            | Ring `ring-2 ring-primary`, transition 150ms (déjà dans `<Input>` primitive)     |
| Invalide         | `border-err`, message d'erreur visible, `aria-invalid="true"`                    |
| Loading (submit) | Bouton disabled, opacity-60, spinner inline, texte « Connexion… »                |
| Auto-redirection | `state.status === 'authenticated'` → écran flash spinner centré puis `replace()` |
| Page chargée     | Focus auto sur champ email, pas d'animation d'entrée intrusive                   |

### Micro-interactions

- Hover bouton primary : `bg-primary-hover` (déjà dans `<Button>` primitive), transition 150ms
- Toggle œil : transition douce de l'icône (fade ou rotate 180° via `transition-transform`, optionnel, ≤ 150ms)
- Focus visible : ring orange/marron (token `--color-primary`), jamais supprimé (no `outline:none` sans `focus-visible:ring`)
- Submit → success : pas de feedback explicite (la redirection elle-même est le feedback)
- Submit → error : shake léger de la carte ou simplement apparition de l'erreur (préférence : apparition simple, pas de shake — sobriété ISM)
- `prefers-reduced-motion` : transitions désactivées (via `motion-reduce:transition-none` Tailwind) — exigence a11y

---

## Responsivité — règles précises

| Breakpoint       | Comportement                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| **375** (mobile) | Carte `w-full max-w-sm`, paddings `p-6`, typo titre `text-xl`, layout vertical, **pas de bandeau**    |
| **768** (tablet) | Carte `max-w-md`, paddings `p-8`, typo titre `text-2xl`, layout toujours vertical, **pas de bandeau** |
| **1024** (lg)    | Layout split-screen 50/50, bandeau gauche `bg-brand-gradient-deep` avec logo blanc + tagline étendue  |
| **1280** (xl)    | Bandeau 45% / formulaire 55%, paddings élargis, max-width formulaire `max-w-md` centré dans sa moitié |

**Règles** :

- Mobile-first : écrire d'abord les classes sans préfixe, ajouter `md:`, `lg:`, `xl:` pour élargir.
- Visualiser l'interface pour adjuster.
- Aucun `min-width` fixe en pixel sur les inputs (sauf icônes/bouton toggle)
- Logo : `h-12 sm:h-14` (responsive), `w-auto`
- Footer informationnel toujours visible (mobile + desktop), pas masqué

### Tactile (mobile)

- Hauteur min des cibles tactiles : **44px** (recommandation WCAG / Apple HIG)
- `<Input>` primitive est `h-10` (40px) → **passer à `h-11` (44px) sur la page login uniquement** via `className` (ne pas modifier la primitive globale)
- Bouton submit `size="lg"` → `h-12` (48px), confortable mobile
- Bouton toggle œil : zone tactile `p-2` (≈ 36px effectif) — acceptable mais optimiser à `p-2.5` (40px) si possible

---

## Accessibilité — exigences

- ✅ **Labels visibles** pour chaque champ (`<label htmlFor>` lié au `id` via `useId()`)
- ✅ **`aria-describedby`** sur chaque input vers son message d'erreur (id unique)
- ✅ **`aria-invalid="true"`** si erreur présente
- ✅ **`aria-live="polite"`** sur la zone d'erreur serveur (changement annoncé)
- ✅ **`aria-pressed`** sur le bouton toggle password (état toggle)
- ✅ **`aria-label`** dynamique sur le bouton toggle (« Afficher… » / « Masquer… »)
- ✅ **Focus trap** non nécessaire (page entière, pas un modal)
- ✅ **Ordre de tabulation** logique : email → password → toggle œil → submit
- ✅ **Contraste** : texte placeholder `text-text-muted` (#78716C) sur `bg-surface` (#FFF) = 4.6:1 ✓ AA. Texte erreur `text-err` (#DC2626) sur `bg-err-100` = 4.7:1 ✓ AA.
- ✅ **Pas de couleur seule pour signifier l'erreur** : icône `<AlertIcon>` + texte explicite
- ✅ **`<main>`** : la page est dans son propre `<main>` (le layout login en sera responsable, pas de header/sidebar partagés)
- ✅ **`lang="fr"`** : hérité du `<html>` racine (à vérifier — sinon ajouter dans le layout root)
- ✅ **Logo** : balise `<Image>` Next.js si possible (pas `<img>` brut, sinon `alt="PLANIT — retour à l'accueil"`)
- ✅ **Pas de `tabindex` positif**, pas de `outline: none` sans `focus-visible` remplacement
- ✅ **Cible Lighthouse** : a11y ≥ 90, perf ≥ 85 sur mobile (exigence Done LOT 7')

---

## Tests — plan

### Test unitaire `<LoginForm>` (`login-form.test.tsx`)

1. **Rendu initial** :
   - Présence du champ email avec `<label>` « Adresse e-mail »
   - Présence du champ password avec `<label>` « Mot de passe »
   - Présence du bouton submit « Se connecter »
   - Pas de message d'erreur visible au mount

2. **Validation client** :
   - Submit avec email vide → message d'erreur Zod sous le champ
   - Submit avec email invalide (`foo`) → message d'erreur Zod
   - Submit avec password vide → message d'erreur Zod

3. **Loading state** :
   - Pendant `isSubmitting`, le bouton est disabled et affiche « Connexion… »

4. **Erreur serveur** :
   - Mock `useAuth().login` rejette avec `new Error('Identifiants incorrects')` → message dans zone `role="alert"`
   - Modifier un champ → erreur serveur disparaît

5. **Submit success** :
   - Mock login résout avec `{ role: 'RESPONSABLE_PROGRAMME', ... }` → `router.replace('/rp')` appelé
   - Mock login résout avec `{ role: 'ENSEIGNANT', ... }` → `router.replace('/enseignant')` appelé
   - Mock login résout avec `{ role: 'ETUDIANT', ... }` → `router.replace('/etudiant')` appelé

### Test unitaire `<PasswordInput>` (`password-input.test.tsx`)

1. **Rendu initial** :
   - Input présent avec `type="password"`
   - Bouton toggle présent avec `aria-label="Afficher le mot de passe"` et `aria-pressed="false"`

2. **Interaction toggle** :
   - Clic sur le bouton toggle → input devient `type="text"` + `aria-label="Masquer le mot de passe"` + `aria-pressed="true"`
   - Re-clic → revient à `type="password"` + `aria-label="Afficher le mot de passe"` + `aria-pressed="false"`

3. **Focus management** :
   - Après toggle, le focus reste sur le bouton toggle (ne saute pas dans le champ)

### Lighthouse CI

- Job `lighthouse` déjà actif (cf. CLAUDE.md). À la PR vers `develop`, vérifier dans les artefacts que `/login` atteint a11y ≥ 90 et perf ≥ 85 sur mobile (preset `lighthouse:no-pwa`). Si en dessous → corriger avant merge.

---

## Conventions PLANIT — checklist conformité

- [x] **Tokens uniquement** — `bg-primary`, `text-text`, `border`, `bg-bg-warm`, etc. Aucun hex en dur. `bg-brand-gradient-deep` pour le bandeau desktop (déjà disponible).
- [x] **Labels français** — « Adresse e-mail », « Mot de passe », « Se connecter », « Afficher le mot de passe »
- [x] **Code anglais** — composants `LoginForm`, `PasswordInput`, hooks, variables (`handleSubmit`, `passwordVisible`, etc.)
- [x] **kebab-case fichiers** — `login-form.tsx`, `password-input.tsx`
- [x] **Pas d'export default** sauf `page.tsx` et `layout.tsx` (Next.js App Router obligatoire) — `LoginForm` et `PasswordInput` en **export nommé**
- [x] **TypeScript strict** — pas de `any`, pas de `as`, props avec interfaces explicites
- [x] **`exactOptionalPropertyTypes`** — props optionnelles `T | undefined` explicite si elles peuvent recevoir `undefined`
- [x] **Pas de `console.*`** — pas de log côté web (linter `no-console` actif backend, bonne pratique web)
- [x] **Validation Zod** — `loginSchema` de `@planit/contracts` réutilisé tel quel (pas de schéma local)
- [x] **Icônes** — depuis `@planit/ui`. `EyeIcon`, `EyeOffIcon`, `LockIcon` à ajouter (stroke style 24×24, cohérent existant)

---

## Decisions sensibles à arbitrer pendant l'implémentation

| Sujet                                                 | Recommandation                                                                                                                                                                        | Qui décide |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Bandeau desktop : illustration vs gradient uniquement | **Gradient PLANIT** (`bg-brand-gradient-deep`) + logo blanc + tagline + liste de 3 features. Sobre, rapide.                                                                           | Oumy       |
| Animation d'entrée                                    | **Aucune** (sobriété ISM). Au pire `fade-in` 200ms sur la carte si Oumy le juge utile.                                                                                                | Oumy       |
| Footer informationnel (« Compte créé par votre AC »)  | **Conserver** — utile pour rappeler aux étudiants comment obtenir leurs identifiants                                                                                                  | Salim acté |
| Icônes leading (mail/lock) à l'intérieur des inputs   | **Oui** — gain de hiérarchie visuelle, pattern standard login moderne. `pl-10` sur l'input                                                                                            | Oumy       |
| `<Input>` primitive modifié pour supporter `leading`  | **Non** — surcouche locale dans `<LoginForm>` (wrapper relative + icône absolute + padding input). Plus simple, pas d'impact global. Évolution primitive en V03 si pattern récurrent. | Salim acté |
| `prefers-reduced-motion`                              | **Oui** — `motion-reduce:transition-none` sur les transitions du toggle + focus ring                                                                                                  | Oumy       |
| Lien « Mot de passe oublié »                          | **Pas dans LOT 7'** — V03. Pas afficher de lien factice qui ne fait rien.                                                                                                             | Salim acté |
| `<Image>` Next.js vs `<img>` pour le logo             | **`<Image>`** si possible (perf Lighthouse). Sinon `<img>` avec dimensions explicites (`width`/`height`).                                                                             | Oumy       |
| Composant `<LoginForm>` : Client Component            | **Oui** (`'use client'`) — il consomme `useAuth`, `useRouter`, `useForm` qui sont tous client-only                                                                                    | Salim acté |

---

## Definition of Done (L.1 → L.4)

**Fonctionnel** :

- [ ] Page `/login` rendue selon les wireframes (mobile 375, tablet 768, desktop 1024+)
- [ ] Formulaire fonctionne identiquement au LOT 6 (login → redirect par rôle, erreur serveur affichée, validation Zod)
- [ ] Bouton toggle password fonctionne (clic → type change, aria-label change, aria-pressed change, focus reste sur le bouton)
- [ ] Page passe le smoke navigateur sur les 3 viewports (DevTools responsive mode)

**Qualité** :

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test --filter=web`, `pnpm build` verts en local
- [ ] Tests `<LoginForm>` et `<PasswordInput>` verts (≥ 5 tests cumulés)
- [ ] Lighthouse mobile sur `/login` : a11y ≥ 90, perf ≥ 85 (artefact CI dispo sur PR)
- [ ] Aucune erreur ni warning dans la console au chargement de `/login`
- [ ] Pas de régression sur les autres pages (vérifier `pnpm test --filter=web` complet)

**Documentation** :

- [ ] Journal d'agent Oumy `docs/agent-journal/oumy/2026-MM-DD-vague02-lot7p-login-redesign.md` rédigé
- [ ] PR ouverte vers `develop` avec captures avant/après mobile + desktop dans la description
- [ ] `tech-debt.md` mis à jour si éléments reportés (ex. `<Input>` primitive avec slot leading, lien « mot de passe oublié »)

---

## Hors scope (rappel)

- ❌ Refonte du flow auth (contrats, endpoints, intercepteurs, redirection logique)
- ❌ Page « Mot de passe oublié » (V03)
- ❌ « Se souvenir de moi » (cookies httpOnly serveur, pas besoin client)
- ❌ SSO / OAuth / MFA
- ❌ Inscription publique
- ❌ Thème sombre
- ❌ Internationalisation
- ❌ Modification de la primitive `<Input>` globale (créer le pattern leading-icon localement)

---

## Risques et points d'attention

| Risque                                                                   | Mitigation                                                                                                                                                   |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Régression sur le focus auto email (a11y vs UX)                          | Implémenter via `useEffect(() => emailRef.current?.focus())`, désactivable si `prefers-reduced-motion` ou via prop                                           |
| Conflit avec `<Input>` primitive si surcharge `className` (h-10 vs h-11) | Conserver `<Input>` primitive intact ; surcharger uniquement via `className="h-11 pl-10"` localement dans `<LoginForm>`                                      |
| Lighthouse perf < 85 à cause du logo SVG ou du gradient                  | Vérifier que le logo est compressé (`logo-wordmark-color.svg` existant), pas d'image lourde. Gradient CSS ne pèse rien.                                      |
| Toggle password : perte de focus / submit accidentel                     | `type="button"` explicite (non submit), `event.preventDefault()` si nécessaire dans le handler                                                               |
| Auto-redirect (`state.status === 'authenticated'`) pendant la frappe     | Vérifier que la redirection ne se déclenche pas en cours de submit (déjà géré par l'`useEffect` initial — pas de modification du contexte pendant `login()`) |
| Bandeau desktop trop chargé visuellement                                 | Tester sur écran ISM (probablement 1366×768) — réduire le contenu si nécessaire                                                                              |
| Cookies tiers bloqués (Safari ITP) → `useAuth` ne se met pas à jour      | Hors scope login (problème global infra), à signaler à Djibril si reproduit                                                                                  |

---

## Annexe — Snippets de référence (non normatifs)

### Structure de fichier suggérée pour `<LoginForm>`

```ts
// apps/web/src/components/auth/login-form.tsx
'use client';
// imports...
export function LoginForm() {
  // useId pour ids stables (email, password, errors)
  // useForm + zodResolver(loginSchema)
  // useAuth().login + useRouter.replace(ROLE_HOME[role])
  // serverError state, reset onChange
  // return form JSX
}
```

### Structure de fichier suggérée pour `<PasswordInput>`

```ts
// apps/web/src/components/auth/password-input.tsx
'use client';
// Props : étend InputHTMLAttributes<HTMLInputElement>, forwardRef pour react-hook-form
// useState<boolean> visible
// Wrapper <div className="relative">
//   <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2" />
//   <input ref={ref} type={visible ? 'text' : 'password'} className="pl-10 pr-10 h-11..." />
//   <button type="button" aria-pressed={visible} aria-label={visible ? 'Masquer…' : 'Afficher…'} onClick={...} className="absolute right-2 top-1/2 -translate-y-1/2">
//     {visible ? <EyeOffIcon /> : <EyeIcon />}
//   </button>
// </div>
```

### Icônes à ajouter dans `packages/ui/src/icons/index.tsx`

```ts
export function EyeIcon(props: IconProps) {
  return (
    <StrokeIcon {...props} defaultSize={20}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </StrokeIcon>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <StrokeIcon {...props} defaultSize={20}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </StrokeIcon>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <StrokeIcon {...props} defaultSize={20}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </StrokeIcon>
  );
}
```

(Snippets indicatifs — Oumy ajuste l'implémentation, respecter le pattern `StrokeIcon` existant.)
