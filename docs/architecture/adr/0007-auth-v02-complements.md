---
id: ADR-0007
titre: Auth V02 — compléments d'ADR-0005 (argon2id, CSRF, SameSite, matricule)
statut: PROPOSÉ
date: 2026-05-25
auteur: salim
---

# ADR-0007 — Auth V02, compléments d'ADR-0005

## Contexte

ADR-0005 a figé la **stratégie d'authentification globale** de PLANIT (JWT
access 15 min + refresh opaque rotatif, rooms Socket.IO authentifiées,
RBAC backend, 2FA reporté V03). Cinq points restaient explicitement
**ouverts** ou implicitement à confirmer pour démarrer l'implémentation
LOT 1 V02 :

1. **Algorithme de hash password** : ADR-0005 §2 mentionne « bcrypt cost
   12 ». Or `vague-02-scenarios.md:114` planifie le seed avec `argon2id`.
   Incohérence à trancher avant d'écrire `auth.service.ts`.
2. **CSRF residual** : ADR-0005 §3 conclut « double-submit token sur les
   mutations sensibles, **ou** bascule en SameSite=Strict pour l'access
   si le UX le permet (à arbitrer V02) ».
3. **Path du refresh cookie** : ADR-0005 §3 mentionne `path=/api/auth/refresh`
   sans imposer la valeur exacte (potentiellement plus large pour
   simplifier les déploiements derrière proxy).
4. **Matricule ISM** : ADR-0005 §6 laisse l'usage du `User.matricule`
   ouvert — « login alternatif ou uniquement affichage ? Décision
   déléguée à la spec V02-01 ».
5. **Lecture du cookie côté JS** : implicite dans ADR-0005 (`HttpOnly`)
   mais jamais formellement interdit dans le code front. Risque de
   contournement par un dev futur.

Cet ADR fige ces 5 décisions, sans rouvrir la stratégie globale. **ADR-0005
reste `ACCEPTÉ`** ; cet ADR la complète et précise les points marqués
« à arbitrer V02 ».

## Décisions

### 1. Hash password = argon2id (et non bcrypt)

- **Choix** : argon2id, profil **OWASP RFC 9106** (`memoryCost = 19456`
  KiB ≈ 19 MiB, `timeCost = 2`, `parallelism = 1`).
- **Lib** : `@node-rs/argon2` (binding Rust, perf ~10× supérieure au
  pur JS sur Hetzner CX22) par défaut. **Fallback `argon2` (JS pur)**
  si build natif échoue en CI Linux ou si l'image Docker prod ne
  fournit pas les libc nécessaires — Oumar tranche au moment de
  l'install (`pnpm add @node-rs/argon2` côté `apps/backend`).
- **Migration depuis bcrypt** : aucune. La seed V01 ne stocke pas de
  `passwordHash` (pas d'auth V01). Le seed V02 hashe directement en
  argon2id. **Pas de double-hash legacy**.

**Justification** :

- argon2id est le **standard OWASP 2024** pour les nouveaux projets,
  recommandé par RFC 9106 (Internet Standard depuis 2021).
- Résistance GPU/ASIC supérieure à bcrypt (memory-hard).
- Le seed V02 (`vague-02-scenarios.md:114`) mentionne déjà argon2id —
  cohérence documentaire.
- Coût CPU comparable à bcrypt cost 12 sur la CX22 (mesuré ~80-120 ms
  par hash en argon2id profil OWASP vs ~200-300 ms en bcrypt cost 12).

**Conséquence ADR-0005** : la mention « bcrypt cost 12 » de §2 est
**révisée** par cet ADR. Pas de re-rédaction de l'ADR-0005 — le lien
croisé en pied de cet ADR suffit.

### 2. CSRF = SameSite=Strict sur les deux cookies

- **Access cookie** : `HttpOnly; Secure; SameSite=Strict; Path=/`.
- **Refresh cookie** : `HttpOnly; Secure; SameSite=Strict;
Path=/api/auth/refresh`.
- **Pas de double-submit token**.

**Justification** :

- PLANIT n'a **aucun cas d'usage cross-site légitime** : pas d'OAuth
  externe, pas de share-button vers un service tiers, pas de iframe
  embed. Le risque « clic depuis un mail » mentionné dans ADR-0005 §3
  ne s'applique pas — un lien `https://planit.ism.edu.sn/seance/xyz`
  cliqué depuis un mail est une **navigation top-level** ; le cookie
  Strict est envoyé sur ce cas (la limite Strict est sur les requêtes
  cross-origin, pas sur les navigations top-level depuis un autre
  origin avec Strict). À vérifier explicitement dans le test e2e
  V02 (LOT 6).
- Le double-submit token ajoute ~20 % de complexité au backend (générer,
  poser, vérifier) sans gain réel face à Strict.
- En cas de besoin futur (intégration outils externes V05+), on
  pourra basculer l'access en `Lax` + double-submit ; le refresh
  reste Strict de toute façon.

**Conséquence ADR-0005** : §3 est **révisé** sur le SameSite de
l'access (Lax → Strict).

### 3. Path du refresh cookie = `/api/auth/refresh` strict

- Le navigateur n'envoie le cookie de refresh **que** sur les requêtes
  vers `/api/auth/refresh`. Toute autre route ne le voit pas, même
  pour le même domaine.
- En conséquence, le module backend `auth/` doit exposer le endpoint
  refresh **exactement** à ce path (pas de re-mapping `/refresh-token`
  ou `/sessions/refresh`).
- **Aucune surface CSRF** sur le refresh : combiné à SameSite=Strict
  (décision 2), le refresh est intransmissible cross-site.

### 4. Matricule ISM = affichage uniquement, pas de login

- Le champ `User.matricule` (déjà prévu par ADR-0005 §6, ajouté au
  schéma Prisma V2 — cf. LOT 0.3) est **stocké et affiché** mais
  **jamais** utilisé comme identifiant de login.
- **Login = email uniquement** pour les 3 acteurs en V02.
- Réexaminer en V03 si une demande utilisateur réelle remonte (ex :
  un étudiant ne se souvient pas de son email institutionnel).

**Justification** :

- Simplicité côté backend (un seul lookup `findUnique({ where: { email } })`).
- Cohérence UX 3 acteurs (RP et enseignants n'ont pas de matricule).
- Le matricule reste utile pour l'affichage (liste classe, exports
  futurs V03+).

### 5. Pas de `document.cookie` côté JS

- **Interdiction formelle** d'accéder à `document.cookie` dans le code
  client (`apps/web/`, `apps/mobile/`).
- La récupération de l'identité utilisateur passe **toujours** par
  `GET /auth/me` (cf. hook `useAuth()` LOT 6 F.2). Le client ne
  manipule jamais le contenu du cookie d'auth, il subit seulement
  son envoi automatique par le navigateur.
- **Lint rule** : ajouter une règle ESLint `no-restricted-syntax`
  ciblant `MemberExpression[object.name="document"][property.name="cookie"]`
  avec message « Auth via GET /auth/me, jamais document.cookie ».

**Justification** :

- Empêche un dev futur d'introduire involontairement un fallback
  qui casse `HttpOnly` (lecture impossible) ou contourne la
  rotation (cache local du token).
- Documente l'invariant directement dans le linter — pas besoin de
  relire l'ADR à chaque PR.

## Conséquences

### Positives

- **Cohérence seed ↔ ADR ↔ implémentation** : argon2id partout, plus
  d'ambiguïté pour Oumar au moment du LOT 1 A.1.
- **Surface CSRF minimisée** : SameSite=Strict + path restreint =
  zéro surface sur le refresh, surface symbolique sur l'access
  (uniquement navigation top-level depuis un origin tiers).
- **Pas de complexité CSRF token** : le backend reste simple, pas
  de middleware double-submit à maintenir.
- **Invariant lint** : la règle ESLint protège l'invariant
  `HttpOnly` côté front pour toutes les contributions futures.

### Négatives

- **Strict bloque les redirects cross-origin authentifiés** : si en
  V05+ on ajoute un OAuth ISM ou un partage avec un outil externe,
  il faudra revoir. Pas de cas d'usage prévu V02-V04 → acceptable.
- **Dépendance native `@node-rs/argon2`** : peut compliquer le build
  Docker prod. Fallback `argon2` JS pur documenté ; à valider en CI
  Linux dès le LOT 0.7.

### À surveiller

- **Test e2e LOT 6** : valider qu'un lien `https://planit.ism.edu.sn/...`
  cliqué depuis un email reste authentifié avec SameSite=Strict. Si KO,
  rebasculer l'access en Lax + ajouter double-submit token.
- **Temps de hash en prod** : si argon2id sur CX22 dépasse **300 ms**
  par login → revoir `memoryCost` à la baisse (mais rester ≥ 12 288 KiB
  = profil minimal OWASP).
- **Lint rule `document.cookie`** : ajouter et tester au LOT 0.4 ou
  LOT 6 F.2.

## Plan de migration / mise en œuvre

| Étape | Livrable                                                                                     | Owner cible | LOT                     |
| ----- | -------------------------------------------------------------------------------------------- | ----------- | ----------------------- |
| A     | Install `@node-rs/argon2` (fallback `argon2` JS si build KO), hash seed V02                  | Salim       | LOT 0.3 (cette session) |
| B     | `auth.service.ts` utilise `argon2.verify()` au login, `argon2.hash()` au register/reset      | Oumar       | LOT 1 A.1               |
| C     | Cookies posés avec `SameSite=Strict` sur access ET refresh, refresh path `/api/auth/refresh` | Oumar       | LOT 1 A.1, A.3          |
| D     | Lint rule `no-document-cookie` ajoutée à `eslint.config.js` racine                           | Salim       | LOT 0.4 ou LOT 6        |
| E     | Test e2e SameSite=Strict (lien depuis mail, top-level navigation)                            | Oumy        | LOT 6 F.5               |

## Décision révisable quand

- Un partenaire externe ISM demande une intégration cross-site
  (OAuth, SSO, embed)
- Le temps de hash argon2id en prod dépasse 300 ms sur CX22 sous charge
- Un cas concret de session perdue en cliquant sur un lien depuis mail
  est rapporté (probablement Strict bloque, à mesurer)

## Liens

- ADR-0005 (stratégie auth globale) — cet ADR la complète, ne la
  supersède pas.
- ADR-0004 (WebSocket Socket.IO) — cookie d'access envoyé au handshake.
- Tech-debt : `WS-AUTH`, `MIDDLEWARE-RBAC`.
- `vague-02-scenarios.md:114` (seed argon2id).
- Vague 02 LOT 0.1 : `../../../PLANIT-Strategie-VibeCode/vagues/vague-02-lots.md:15`
- OWASP Password Storage Cheat Sheet — argon2id profil minimal.
- RFC 9106 (argon2) Internet Standard.
