---
id: ADR-0005
titre: Stratégie d'authentification (JWT access + refresh, stockage par client)
statut: ACCEPTÉ
date: 2026-05-24
auteur: salim
---

# ADR-0005 — Stratégie d'authentification PLANIT

## Contexte

La Vague 01 a été livrée **sans authentification** (V1-D2). Le sélecteur
d'acteur en topbar et le `useCurrentTeacher()` hardcodé tiennent lieu de
session. C'est tenable pour la démo MVP mais bloque tout passage en
multi-utilisateur réel.

La Vague 02 introduit donc l'auth. Plusieurs décisions doivent être actées
**avant** d'écrire la spec, parce qu'elles structurent à la fois le
backend (modules `auth/`, `refresh-token/`), le web (cookies, middleware
Next), le mobile (stockage sécurisé, requêtes Expo) et le WS (handshake
sécurisé — cf. ADR-0004).

L'ISM est une école d'ingénieurs : la population utilisateur connaît un
rythme **semestriel** (rentrée septembre, examens janvier, semestre 2,
vacances été). Les étudiants n'ouvrent pas l'app tous les jours en juillet.
Cela influence directement les durées de session, en particulier mobile.

## Décisions

### 1. Modèle JWT access + refresh — pas de session serveur

- **Access token** : JWT signé (HS256 ou RS256, à confirmer dans la spec
  Vague 02), durée **15 min**, contient `{ sub, role, classeId?, iat, exp }`.
- **Refresh token** : opaque pour le client (UUID v4 + signature côté
  serveur), persisté côté backend pour permettre la révocation. Durée
  variable selon le client (cf. section 4).
- **Pas de session serveur** (`express-session` rejeté) : le backend reste
  stateless, ce qui simplifie le scaling Hetzner CX22 et la future
  parallélisation des process.

### 2. Hash des mots de passe

- **bcrypt cost 12** au minimum (à valider sur la CX22 — viser <300 ms par
  hash). Cost paramétrable via `BCRYPT_COST`.
- Hash systématique dès le seed (jamais de mot de passe en clair en BD,
  même en dev).
- Champ Prisma : `User.passwordHash: String` — jamais `password`.

### 3. Stockage des tokens par client

| Client | Access token                                  | Refresh token                                                            |
| ------ | --------------------------------------------- | ------------------------------------------------------------------------ |
| Web    | Cookie HttpOnly + Secure + SameSite=**Lax**   | Cookie HttpOnly + Secure + SameSite=**Strict**, path=`/api/auth/refresh` |
| Mobile | `expo-secure-store` (Keychain iOS / Keystore) | `expo-secure-store`                                                      |

**Interdits formellement** :

- `localStorage` / `sessionStorage` côté web → vulnérable XSS.
- `AsyncStorage` côté mobile → non chiffré sur Android, vulnérable backup.

Le `SameSite=Strict` sur le refresh-cookie limite son envoi à
`/api/auth/refresh` (avec `path` restreint), ce qui réduit drastiquement
la surface CSRF pour le refresh. Le cookie d'access reste `SameSite=Lax`
pour ne pas casser les liens de partage légitimes (clic depuis un mail).

### 4. Durées de vie

| Token   | Web standard | Web « Se souvenir » | Mobile                |
| ------- | ------------ | ------------------- | --------------------- |
| Access  | 15 min       | 15 min              | 15 min                |
| Refresh | 7 jours      | 30 jours            | **180 jours sliding** |

**Justification des 180 jours mobile sliding** :

- Le mobile est le canal **principal** pour étudiants et enseignants
  (cf. ADR-0006). On veut éviter de redemander un login en cours de
  semestre.
- 180 jours ≈ un semestre universitaire, couvre les vacances d'été pour
  les enseignants qui rouvrent en septembre.
- **Sliding** : chaque refresh régénère la durée. Un utilisateur actif
  n'expire jamais ; un compte inactif s'éteint au bout de 180 jours.
- Compensé par les protections supplémentaires : rotation à chaque
  usage (section 5), stockage Keychain/Keystore, révocation possible.

### 5. Rotation des refresh tokens

- **Rotation systématique** : à chaque appel de `/api/auth/refresh`, le
  refresh token est consommé et un nouveau est émis. L'ancien est
  marqué `revokedAt` mais conservé pour la détection de réutilisation.
- **Détection de réutilisation** : si un refresh token déjà `revokedAt`
  est rejoué, on **révoque toute la famille** (tous les tokens issus du
  même login initial) et on force un re-login. C'est le signal classique
  d'un vol de token.
- Modèle Prisma `RefreshToken` :

  ```prisma
  model RefreshToken {
    id          String   @id @default(cuid())
    hash        String   @unique           // SHA-256 du token (jamais en clair)
    userId      String
    familyId    String                     // partagé entre tokens issus du même login
    userAgent   String?
    ip          String?
    issuedAt    DateTime @default(now())
    expiresAt   DateTime
    revokedAt   DateTime?
    replacedBy  String?                    // id du token suivant dans la famille

    user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

    @@index([userId, revokedAt])
    @@index([familyId])
  }
  ```

### 6. Identifiants de connexion

- **Email** pour tous : champ obligatoire `User.email`, unique, normalisé
  en minuscules. Sert d'identifiant primaire de connexion.
- **Matricule ISM** en option pour les étudiants (champ `User.matricule`,
  unique nullable). Confirmation V02 sur l'usage : login alternatif ou
  uniquement affichage ? Décision déléguée à la spec V02-01.

### 7. Biométrie

**Non** pour PLANIT en l'état.

- Le rapport bénéfice/coût ne justifie pas : planning universitaire
  = données pédagogiques, pas de paiement, pas de notes officielles,
  pas de PII médicale.
- L'intégration `expo-local-authentication` ajoute un cas d'échec
  supplémentaire (capteur absent, désactivé, OS bridé) sans gain réel
  sur la sécurité du compte (un attaquant qui a le téléphone déverrouillé
  a déjà le Keychain).
- À **revoir** si Vague 05+ ajoute des features sensibles (signalements
  étudiants avec identité, exports avec données nominatives).

### 8. Sécurité WebSocket

- Le handshake Socket.IO devient **authentifié** :
  - **Web** : le cookie HttpOnly est envoyé automatiquement (Socket.IO
    accepte `withCredentials: true`).
  - **Mobile** : header `Authorization: Bearer <access>` au handshake
    via `io(url, { auth: { token } })`.
- Le gateway extrait l'identité du token (jamais du payload client),
  vérifie la signature et la non-révocation, **puis** joint la room
  `user:${verifiedUserId}` server-side.
- Tout socket non authentifié est `disconnect()` immédiatement.
- Détail dans ADR-0004 (section « Faille V1 documentée »).

### 9. RBAC

- **Backend** : décorateur `@Roles(UserRole.RP, UserRole.AC)` sur les
  endpoints sensibles, vérifié par un guard `RolesGuard` qui lit l'enum
  Prisma `UserRole`.
- **Web** : composant `<RoleGate role="RP">…</RoleGate>` pour masquer les
  CTAs ; middleware Next.js (`apps/web/src/middleware.ts`) pour les
  redirections de route selon le rôle (cf. tech-debt `MIDDLEWARE-RBAC`).
- **Mobile** : même `<RoleGate>` adapté à React Native.
- **Règle d'or** : la vérification RBAC **se fait toujours côté serveur**.
  Les guards UI sont un confort, pas une sécurité.

### 10. Reset password

- Lien magique par email, TTL **30 min**, single-use.
- Token stocké hashé (SHA-256) côté serveur, jamais en clair.
- Workflow : `POST /api/auth/forgot-password` (email) →
  email avec lien `https://planit.ism.edu.sn/reset?token=...` →
  `POST /api/auth/reset-password` (token + nouveau password).
- Provider email : à confirmer en V02 (Resend pressenti, cf. `.env.example`).

### 11. Multi-device

**Autorisé**. Un utilisateur peut être connecté simultanément sur web et
mobile (et plusieurs mobiles). Chaque login crée une **famille** de
refresh token distincte. Un logout sur un device ne révoque que sa
propre famille.

Un futur écran « Mes sessions actives » (Vague 03+) permettra de lister
les familles `RefreshToken` non révoquées et de les terminer une par
une — basé sur `userAgent` et `ip` stockés.

### 12. 2FA

- **Pas en V02**.
- **Optionnel pour Admin/RP** en V03+ : TOTP (authentificateur tiers,
  pas SMS — l'ISM n'a pas de fournisseur SMS robuste à ce stade pour le
  flux 2FA, et Orange SMS est budgété pour les notifications V04).
- Le schéma `User.mfaSecret` est déjà prévu et **masqué** dans le
  redacter pino.

## Conséquences

### Positives

- **Stateless backend** : scaling horizontal facile (sous réserve d'un
  Redis adapter pour WS, cf. ADR-0004).
- **Multi-client cohérent** : le même backend sert web et mobile avec une
  seule logique d'auth, deux stratégies de stockage.
- **Sécurité par défaut** : cookies HttpOnly, rotation des refresh,
  détection de réutilisation, hash bcrypt, pas de `localStorage`.
- **Révocation possible** malgré l'absence de session : la table
  `RefreshToken` autorise un kill switch global et un logout granulaire.
- **Durée mobile cohérente avec le rythme universitaire** : moins de
  friction pendant le semestre, sans tomber dans l'anti-pattern « refresh
  illimité ».

### Négatives

- **Complexité de la rotation + détection de réutilisation** : c'est
  20-30% du code auth. Le coût est assumé — c'est la principale
  protection contre le vol de refresh.
- **CSRF résiduel** : le cookie d'access en SameSite=Lax reste exposé
  aux attaques de navigation déclenchée. Mitigations : double-submit
  token sur les mutations sensibles, ou bascule en SameSite=Strict pour
  l'access si le UX le permet (à arbitrer V02).
- **Pas de SSO ISM** : un partenariat IAM avec l'école pourrait
  simplifier l'onboarding. Pas dispo aujourd'hui, à explorer Vague 06.

## Alternatives rejetées

| Alternative                                  | Raison du rejet                                                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Sessions serveur (`express-session` + Redis) | Alourdit le scaling, dépendance Redis pour l'auth (déjà nécessaire pour BullMQ, mais évite un point de panne supplémentaire) |
| Magic link only (sans password)              | Friction email côté étudiants Sénégal (boîtes saturées, Yahoo lent, Hotmail filtre Resend), pas de fallback hors-ligne       |
| OAuth Google / Microsoft externe             | Dépendance non maîtrisée par l'ISM, déploie une boucle de validation Google Workspace pas alignée avec les comptes étudiants |
| `localStorage` pour access token             | XSS = vol du token. Interdit formellement.                                                                                   |
| Refresh tokens sans rotation                 | Un vol de refresh = accès permanent jusqu'à expiration. Non négociable.                                                      |
| Biométrie obligatoire                        | Augmente la surface de friction (capteurs absents/désactivés) sans gain réel sur des données non critiques                   |

## Plan d'implémentation (résumé — détails dans spec V02)

| Étape | Livrable                                                                     | Owner cible   |
| ----- | ---------------------------------------------------------------------------- | ------------- |
| A     | Schéma Prisma : `User.passwordHash`, `User.role`, `RefreshToken`             | Oumar         |
| B     | Module `auth/` backend : signup, login, refresh, logout, forgot, reset       | Oumar         |
| C     | Contracts Zod : `LoginDto`, `RefreshDto`, `ResetPasswordDto`, etc.           | Salim         |
| D     | `RolesGuard` + décorateur `@Roles()`                                         | Oumar         |
| E     | Hooks web : `useAuth`, `useCurrentActor()` (remplace les hooks hardcodés V1) | Oumy          |
| F     | Middleware Next.js : redirections selon rôle (tech-debt MIDDLEWARE-RBAC)     | Oumy          |
| G     | Sécurisation WS handshake (tech-debt WS-AUTH)                                | Salim + Oumar |
| H     | Tests : intégration backend (10 cas min) + e2e Playwright (login flow)       | Tous          |

## Liens

- ADR-0004 (WebSocket) : sécurisation du handshake en V02
- Tech-debt : `WS-AUTH`, `MIDDLEWARE-RBAC`, `FACTOR-PAGES`
- Variables d'environnement déjà prévues dans `.env.example` :
  `JWT_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_SECRET`,
  `REFRESH_TOKEN_EXPIRES_IN`
- Vague 02 : à spec'er — voir `../../../PLANIT-Strategie-VibeCode/vagues/README.md`
