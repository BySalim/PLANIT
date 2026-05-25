---
id: ADR-0004
titre: Stratégie WebSocket temps réel (Socket.IO + rooms par user)
statut: ACCEPTÉ
date: 2026-05-24
auteur: salim
---

# ADR-0004 — Stratégie WebSocket temps réel

## Contexte

La Vague 01 livre un flux de **publication ciblée** : quand le RP clique
« Publier les modifications », chaque enseignant et étudiant **concerné** doit
voir son planning se rafraîchir immédiatement, sans recharger la page. Trois
options ont été évaluées au moment de coder le LOT 1 (B.6) :

- **Server-Sent Events (SSE)** : flux serveur → client unidirectionnel, simple,
  natif HTTP.
- **WebSocket brut (`ws` lib)** : bidirectionnel, mais sans rooms, sans
  reconnexion auto, sans fallback.
- **Socket.IO** : protocole sur WS avec rooms, reconnexion, fallback
  long-polling, client isomorphique web + mobile (`socket.io-client`).

Le besoin V1 est unidirectionnel (serveur pousse), **mais** :

- on prévoit dès la Vague 02 que les clients enverront des events (présence
  RP, frappe en cours dans un commentaire) → bidirectionnel souhaité ;
- l'app mobile Expo de la Vague 04 doit consommer la même API temps réel
  sans recoder la couche transport ;
- les déploiements ISM passent souvent derrière proxies / firewalls
  d'établissement → fallback HTTP long-polling indispensable.

## Décision

**Socket.IO** est la stack temps réel officielle de PLANIT, côté backend
(`@nestjs/platform-socket.io`) et côté client (`socket.io-client` partagé
web/mobile).

### Architecture livrée en Vague 01

- **Gateway unique** : `apps/backend/src/ws/ws.gateway.ts` (`WsGateway`,
  décoré `@WebSocketGateway`).
- **Rooms par utilisateur** : chaque socket rejoint la room `user:${userId}`
  au handshake. Format choisi pour rester lisible dans les logs Socket.IO
  (`adapter:add-all`).
- **Évènement** : un seul event public en V1 — `session:published`. Le
  payload est typé `{ sessions: SessionDto[] }`, transitivement validé par
  `@planit/contracts`.
- **API d'émission** : `WsGateway.emitSessionPublished(userIds, sessions)`.
  Le calcul des destinataires (enseignants impactés, étudiants de la classe)
  est fait dans `SeanceService.publish()` puis remonté au gateway. **Aucun
  broadcast global** : si `userIds` est vide, l'émission est no-op.
- **CORS partagé** : la liste d'origines autorisées vient de
  `apps/backend/src/common/cors.ts`, **partagée** avec le bootstrap HTTP
  (`main.ts`). Un fix CORS HTTP profite automatiquement au WS (régression
  vue avec le preview MCP sur port dynamique).
- **Transport** : Socket.IO laisse négocier WS ↔ long-polling. Aucun
  override côté serveur, le fallback est implicite.

### Convention client

```ts
const socket = io(API_BASE, { auth: { userId } });
socket.on('session:published', (payload) => {
  /* ... */
});
```

Le hook web `apps/web/src/hooks/use-realtime-sessions.ts` encapsule cette
mécanique et invalide les queries TanStack à chaque event. Le mobile
reprendra ce même contrat en Vague 04.

## Conséquences

### Positives

- **Reconnexion automatique** côté client (Socket.IO embarque le retry
  exponentiel) — important pour les étudiants en 3G/4G campus.
- **Rooms natives** : pas de map `userId → socket` à maintenir, Socket.IO
  s'en charge et nettoie au disconnect.
- **Fallback long-polling** : un firewall qui bloque le upgrade WS ne casse
  pas la feature.
- **Client isomorphe** : `socket.io-client` fonctionne identiquement sur
  Next.js (LOT 3) et sur Expo (Vague 04). Une seule API à connaître pour
  toute l'équipe.
- **CORS centralisé** : `corsOrigin()` partagé HTTP + WS empêche les
  régressions silencieuses.

### Négatives

- **Pas scalable au-delà d'1 process backend** sans adapter Redis. Si la
  Vague 02+ déploie 2 réplicas du backend Nest, un client connecté au
  réplica A ne recevra pas un event émis par le réplica B. **Mitigation
  prévue** : ajouter `@socket.io/redis-adapter` dès qu'on passe à plus
  d'un process (cf. tech-debt `WS-SCALE`).
- **Pas une norme web** : SSE serait standard HTTP, Socket.IO est un
  protocole sur WS. Acceptable : on assume la dépendance.
- **Payload non-typé côté wire** : Socket.IO transporte du JSON sans
  validation côté client. Compensé par le type partagé `SessionDto` et,
  en V02, un parse Zod côté hook avant d'invalider la query.

### Faille V1 documentée et acceptée

```ts
// apps/backend/src/ws/ws.gateway.ts:27-30
handleConnection(client: Socket): void {
  const userId: unknown = client.handshake.auth['userId'];
  if (typeof userId === 'string' && userId.length > 0) {
    void client.join(WsGateway.room(userId));
    // ...
  }
}
```

Le client envoie son `userId` au handshake **sans aucune vérification
serveur**. Un attaquant peut donc s'abonner à la room d'un autre
utilisateur en falsifiant ce champ — et recevoir les events de planning
qui le concernent.

**Pourquoi acceptée en V1** :

- V1-D2 acte l'absence d'auth : il n'y a pas encore de JWT à vérifier.
- Pas de données ultra-sensibles dans le payload (séances de cours, déjà
  semi-publiques au sein de l'école).
- Fenêtre de risque limitée à la démo interne.

**Fix obligatoire en Vague 02** (cf. ADR-0005 et `WS-AUTH` dans
`tech-debt.md`) :

1. JWT vérifié au handshake (cookie HttpOnly côté web, header
   `Authorization` côté mobile).
2. Le serveur extrait `userId` du token, **jamais** du payload client.
3. Le join de room se fait **après** la vérification, server-side.
4. Tout socket non authentifié est `disconnect()` immédiatement.

## Alternatives rejetées

| Alternative              | Raison du rejet                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| Server-Sent Events (SSE) | Unidirectionnel (bloque les events client → serveur prévus V02), pas de rooms natives                 |
| WebSocket brut (`ws`)    | Pas de rooms, pas de reconnexion auto, pas de fallback proxy/firewall — re-coder Socket.IO à la main  |
| Pusher / Ably (SaaS)     | Dépendance externe payante, latence depuis Dakar (POPs distants), captive sur un vendor pour 1 event  |
| Polling HTTP (5 s)       | Trafic constant inutile, latence visible (max 5 s), pas adapté au feedback « publié » qu'on veut live |

## Liens

- Implémentation : `apps/backend/src/ws/ws.gateway.ts`
- Consommateur web : `apps/web/src/hooks/use-realtime-sessions.ts`
- Catalogue des events : `docs/runbooks/ws-events.md`
- Sécurisation V02 : ADR-0005 (auth) + tech-debt `WS-AUTH`
- Vague 01 LOT 1 B.6 : `../../../PLANIT-Strategie-VibeCode/vagues/vague-01-lots.md`
