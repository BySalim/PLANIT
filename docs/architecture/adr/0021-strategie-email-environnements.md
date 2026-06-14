---
id: ADR-0021
titre: Stratégie email par environnement (dev catcher → staging beta inbox → prod Resend)
statut: ACCEPTÉ
date: 2026-06-13
auteur: salim
vague: 06
---

# ADR-0021 — Stratégie email par environnement

> **Statut** : Accepté (préparé pour la Vague 06) · **Date** : 2026-06-13 · **Vague** : 06 · **Auteur** : Salim (Tech Lead)
>
> Companion de l'ADR « stratégie notifications multi-canal » (V06 LOT 0.1, à écrire) : celui-ci ne cadre **que la couche transport email et son comportement par environnement**. Le dispatcher, les préférences et le fallback relèvent de l'autre ADR.

## Contexte

PLANIT a besoin d'emails transactionnels : création de compte et reset de mot de passe (aujourd'hui en CLI / mot de passe affiché, **TD-003**), puis les notifications de la V06. L'existant se réduit à un **stub** [`apps/backend/src/mail/mail.service.ts`](../../../apps/backend/src/mail/mail.service.ts) qui ne fait que logger.

La V06 a déjà tranché le **quoi en production** : l'email est un canal du dispatcher multi-canal ([vague-06-index.md](../../../../PLANIT-Strategie-VibeCode/vagues/vague-06-index.md) V6-D2), provider **Resend**, branché sur la file BullMQ `notifications`. Mais elle n'a défini **aucune stratégie par environnement** : rien sur le test en dev, rien sur le palier VM/staging, rien sur la délivrabilité. Son scénario saute directement à « email réel Resend », même en local.

Il faut figer comment on **teste le service email de façon réaliste avant la prod** (dev + staging) et comment on **délivre pour de vrai** (prod), sans jamais spammer de vrais utilisateurs depuis un environnement non-prod.

## Décision

### 1. Une seule abstraction, transport choisi par l'environnement

On **étend** le `MailService` existant (on ne le réinvente pas). Le code applicatif appelle toujours `MailService.send()` ; le **transport est sélectionné par la variable d'env `MAIL_TRANSPORT`**. Le code applicatif ne change jamais d'un environnement à l'autre (pattern standard, cf. `MAIL_MAILER` Laravel / `EMAIL_BACKEND` Django / `MAILER_DSN` Symfony).

### 2. Les paliers

| Palier                  | `MAIL_TRANSPORT` | Cible                                                                                                     | Expérience                                                                                                                       | Tag image  |
| ----------------------- | ---------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **Dev (local)**         | `smtp`           | **Mailpit** (`docker-compose.dev.yml`, SMTP `:1025`, UI `:8025`)                                          | Le dev ouvre `http://localhost:8025` et voit l'email rendu. Test réaliste, zéro envoi réel.                                      | —          |
| **Staging / VM (beta)** | `smtp`           | **Mailpit déployé** (machinerie compose prod, `:staging`), UI exposée via Caddy (`mail.<staging>` + auth) | Les **beta-testeurs s'y connectent et reçoivent leurs emails comme un vrai service**. Aucune fuite vers de vrais inbox externes. | `:staging` |
| **Prod**                | `resend`         | **Resend** (API réelle, V6-D2)                                                                            | Délivrance réelle vers les vrais inbox. **SPF + DKIM + DMARC** sur `planit.sn`, `FROM_EMAIL`.                                    | `:main`    |
| CI / tests              | `log`            | no-op + log                                                                                               | Aucune I/O réseau dans les specs / la CI. Défaut sûr.                                                                            | —          |

### 3. Les transports

- **`smtp`** — `nodemailer` vers un serveur SMTP. En dev/staging il pointe vers **Mailpit** ; le même transport servira plus tard si l'on bascule sur un relai SMTP. Mailpit accepte tout, ne délivre rien à l'extérieur, et expose une UI web qui fait office de boîte de réception partagée.
- **`resend`** — provider HTTP réel en production (choix V6-D2). Clôt TD-003.
- **`log`** — no-op qui journalise `to`/`subject` (CI, tests, et défaut de repli si non configuré). Remplace l'actuel stub.

### 4. Configuration fail-fast

Étendre [`apps/backend/src/common/env.validation.ts`](../../../apps/backend/src/common/env.validation.ts) (validation Zod fail-fast, ADR-0013 §8) :

- `MAIL_TRANSPORT` ∈ `{ smtp, resend, log }` (défaut `log`).
- **Vars requises conditionnellement** selon le transport : `MAIL_SMTP_HOST` + `MAIL_SMTP_PORT` si `smtp` ; `RESEND_API_KEY` si `resend`. `FROM_EMAIL` requis hors `log`.
- `.env.example` documente déjà `RESEND_API_KEY` + `FROM_EMAIL` ; y ajouter le bloc `MAIL_TRANSPORT` / `MAIL_SMTP_*`.

Un backend mal configuré **refuse de démarrer** avec un message clair, plutôt que d'échouer au premier envoi.

### 5. Sécurité

- **Redacter pino** += `MAIL_SMTP_PASS` et `RESEND_API_KEY` (jamais de secret dans les logs).
- **Pas de secret en dur** : creds dans `.env` (dev), `cd.env` / `.env.prod` (VM/prod), `.env` gitignored, gitleaks actif.
- **Mailpit derrière auth + `noindex`** : sur staging, les emails de test peuvent contenir des mots de passe temporaires → l'UI est réservée aux beta-testeurs / à l'équipe (basic-auth Caddy ou auth Mailpit), non indexable.
- En prod : SPF/DKIM/DMARC sur `planit.sn` (sinon spam), suivi des bounces/plaintes côté Resend.

### 6. Conformité ADR-0017 (prod = 2ᵉ instance de la machinerie VM)

La **seule** différence staging ↔ prod est l'environnement : `MAIL_TRANSPORT=smtp` (+ `MAIL_SMTP_*`) sur la VM vs `MAIL_TRANSPORT=resend` (+ `RESEND_API_KEY`, DNS) en prod, posés dans `cd.env` / `.env.prod`. **Jamais dans le code ni le playbook.** La bascule prod-réelle = un changement d'env + la config DNS, zéro réécriture.

## Intégration V06

- `MailService` devient le **canal email** (`INotificationChannel`) du dispatcher V6-D1 ; l'envoi passe par la file **BullMQ `notifications`** (LOT 0.5). C'est l'objet du **LOT 1.2**.
- L'**idempotence**, les **préférences** et la **chaîne de fallback** sont la responsabilité du **dispatcher**, pas du transport. La couche email ne fait qu'« envoyer un email maintenant ».
- Cet ADR ne construit **pas** le modèle `Notification`, le dispatcher, BullMQ ni les autres canaux (FCM/WhatsApp/SMS) — cœur du périmètre V06.

## Conséquences

- **+** Test réaliste de bout en bout (rendu HTML, liens, chemin d'envoi complet) dès le dev, et une vraie boîte beta sur la VM — avant tout envoi réel.
- **+** Provider-agnostique : passage Mailpit → Resend (ou relai SMTP) = config, pas de refonte. Le `MailService` reste l'unique point d'envoi.
- **+** Aligné sur les choix déjà actés (Resend V6-D2, env-only ADR-0017) ; clôture TD-003 au LOT 1.2.
- **−** Une dépendance d'exécution (`nodemailer`) et un service docker (Mailpit) à introduire en V06 — décision sensible à valider à l'implémentation.
- **−** Sur staging, l'inbox Mailpit est partagée et expose des mots de passe temporaires → accès à protéger (auth + noindex), à ne pas confondre avec une vraie délivrance.

## Alternatives écartées

- **`log`-only partout (y compris dev/staging)** : ne permet pas de voir le rendu réel ni de valider liens/templates → ne répond pas au besoin « test réaliste avant prod ». Conservé seulement pour CI/tests.
- **Mailtrap (sandbox hébergé) en dev** : hébergé, pas « en local » comme demandé, et dépendance/quota externe. Mailpit (self-host) couvre dev **et** staging avec la même brique.
- **Envoi réel (Resend) dès dev/staging** : risque de spammer de vrais utilisateurs (copies de base avec adresses réelles) et de brûler la réputation du domaine. Rejeté hors prod.
- **SMTP self-hosté (Postfix) en prod** : délivrabilité difficile à tenir seul (réputation, listes de blocage). Resend assume SPF/DKIM/bounces.
