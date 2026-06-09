# Registre des voeux

> Fichier versionnable pour consigner les souhaits, idees et besoins apparus pendant
> les sessions PLANIT. Les suivis locaux `*.log` restent non commites; ce registre peut
> etre commite.

## Statuts

| Statut      | Sens                             |
| ----------- | -------------------------------- |
| `A evaluer` | Besoin note, pas encore arbitre. |
| `Retenu`    | Decision prise, a planifier.     |
| `En cours`  | Travail demarre.                 |
| `Livre`     | Disponible et valide.            |
| `Differe`   | Conserve, mais pas prioritaire.  |
| `Abandonne` | Ne sera pas traite en l'etat.    |

## Voeux

| ID       | Date et heure    | Contexte            | Voeu                                               | Raison / description                                                                                                                                                                                            | Priorite | Statut    | Suite / notes                                                                                                                                                                                                                                                  |
| -------- | ---------------- | ------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VOEU-001 | 2026-06-09 07:15 | Beta / exploitation | Dashboard web admin temps reel des sessions PLANIT | Voir les utilisateurs connectes dans l'application, leur derniere activite, et idealement leur page courante. Cloudflare Access montre les sessions au rideau externe, mais pas la presence applicative PLANIT. | Moyenne  | Retenu    | Decision Salim: dashboard dans l'interface web en usage normal, avec CLI de secours pour les incidents/maintenance. Preferer une implementation interne avec Socket.IO existant plutot qu'un service externe pour cette V1.                                    |
| VOEU-002 | 2026-06-09 07:15 | Auth / exploitation | Revocation admin des sessions applicatives         | Permettre a un admin de deconnecter un utilisateur PLANIT ou toutes les sessions apres un reseed beta, un incident, ou un changement d'acces.                                                                   | Haute    | En cours  | **Partiel livre 2026-06-09** : CLI `revoke-all-sessions` (revoque TOUS les refresh tokens, cf. vm-self-host.md §9ter) + bouton flottant de deco self-service. Reste : revocation **ciblee par utilisateur** cote admin (lie au dashboard temps reel VOEU-001). |
| VOEU-003 | 2026-06-09 07:15 | Beta / produit      | Analytics et replay de session beta                | Comprendre les parcours testeurs, les blocages UX et les erreurs non remontees spontanement. Outils possibles: PostHog, LogRocket, Sentry Replay.                                                               | Moyenne  | A evaluer | Exiger masquage des champs sensibles et consentement clair des beta-testeurs.                                                                                                                                                                                  |
| VOEU-004 | 2026-06-09 07:15 | Auth / architecture | Ne pas remplacer l'auth PLANIT pendant la beta     | Eviter un gros chantier IAM pendant l'ouverture beta. Cloudflare Access suffit pour le rideau externe; PLANIT garde ses roles internes RP/AC/enseignant/etudiant.                                               | Haute    | Retenu    | Reconsiderer Logto/Keycloak/Auth0/Clerk uniquement si le besoin depasse la beta.                                                                                                                                                                               |
