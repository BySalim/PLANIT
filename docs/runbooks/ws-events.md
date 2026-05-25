# Runbook — Catalogue des events WebSocket

> Source de vérité des évènements Socket.IO PLANIT. Chaque event doit
> être documenté ici **avant** d'être émis en prod.
> Cf. [ADR-0004](../architecture/adr/0004-websocket-realtime-strategy.md) pour la stratégie globale.

---

## Conventions générales

- **Namespace** : par défaut (`/`). Pas de namespaces multiples en V01.
- **Format des events** : `<domaine>:<action-au-passé>` — minuscules,
  kebab-case, sans accent (`session:published`, pas `session:Publier`).
- **Rooms** : `user:${userId}` par utilisateur (cf. ADR-0004).
- **Payload** : toujours un objet JSON, jamais une primitive. Typé via
  `@planit/contracts`.
- **Direction** : V01 = serveur → client uniquement. Tout event
  client → serveur sera introduit en V02+ avec auth handshake.

---

## Vague 01 — events actifs

### `session:published`

| Champ         | Valeur                                                      |
| ------------- | ----------------------------------------------------------- |
| Direction     | serveur → client                                            |
| Déclencheur   | `SeanceService.publish()` après bascule `isPublished=true`  |
| Source        | `apps/backend/src/ws/ws.gateway.ts::emitSessionPublished()` |
| Room cible    | `user:${userId}` pour chaque acteur concerné                |
| Payload (TS)  | `{ sessions: SessionDto[] }`                                |
| Type contract | `SessionDto` depuis `@planit/contracts`                     |
| Idempotent ?  | Oui (le client invalide une query TanStack, refetch)        |

**Calcul des destinataires** (côté `SeanceService.publish`) :

- Tous les enseignants dont au moins une `Seance` vient d'être publiée
  (`teacherId` distincts).
- Tous les étudiants des `Classe` dont au moins une `Seance` vient
  d'être publiée.
- Pas de RP dans les destinataires (le RP voit ses propres modifs
  via l'invalidation de query post-mutation).

**Comportement client attendu** :

1. Réception → `useRealtimeSessions` invalide `planningKeys.all`.
2. TanStack Query refetch automatique (pas de patch ciblé).
3. Toast in-app « Le planning a été mis à jour ».
4. Pas de notification système (push/desktop) — V01 = in-app only.

**Garanties** :

- Pas de broadcast global : si `userIds.length === 0`, no-op.
- Pas de retry serveur si la livraison échoue (Socket.IO best-effort).
- Ordering non garanti entre deux publish rapprochés — le client
  recalcule depuis l'API à chaque event.

**Hook web** : `apps/web/src/hooks/use-realtime-sessions.ts`

```ts
useRealtimeSessions(userId, { enabled: true });
```

---

## Faille V1 documentée

Le `userId` envoyé au handshake (`io(url, { auth: { userId } })`) **n'est
pas vérifié serveur**. Un client peut s'abonner à la room d'un autre
utilisateur en falsifiant ce champ.

- **Acceptée en V01** : pas d'auth, données semi-publiques au sein de
  l'école.
- **Fix V02** : handshake JWT, room joinée serveur-side après
  vérification (cf. ADR-0005 § Sécurité WebSocket et tech-debt
  `WS-AUTH`).

---

## Modèle pour les futurs events (V02+)

Quand tu ajoutes un nouvel event, copier le template ci-dessous **avant**
le commit qui l'introduit :

### `<domaine>:<action>`

| Champ         | Valeur                                                |
| ------------- | ----------------------------------------------------- |
| Direction     | serveur → client \| client → serveur                  |
| Déclencheur   | `<ServiceName>.<methodName>()`                        |
| Source        | `apps/backend/src/...`                                |
| Room cible    | `user:${userId}` \| `classe:${classeId}` \| `<autre>` |
| Payload (TS)  | `{ ... }`                                             |
| Type contract | `<XxxDto>` depuis `@planit/contracts`                 |
| Idempotent ?  | Oui \| Non, voir séquence                             |

**Calcul des destinataires** : …

**Comportement client attendu** : …

**Garanties** : …

---

## Events planifiés (non implémentés)

À titre indicatif, anticipations Vague 02+ — **non actifs** pour l'instant :

| Event                  | Vague | Note                                          |
| ---------------------- | ----- | --------------------------------------------- |
| `session:created`      | V02   | Notif AC/RP quand une nouvelle séance arrive  |
| `session:updated`      | V02   | Notif granulaire avant publish (preview live) |
| `conflict:detected`    | V02   | Push RP quand un conflit salle/prof apparaît  |
| `demand:received`      | V03   | Espace AC : nouvelle demande étudiant         |
| `presence:user-joined` | V02   | Présence en édition collaborative             |
| `notification:push`    | V04   | Pont WebSocket ↔ FCM/Expo Notifications       |

Chaque ligne devra être promue en section complète à son implémentation.

---

## Debug

### Vérifier la connexion côté client

DevTools → Network → WS → filtrer sur `socket.io`. Une connexion saine
montre :

1. Handshake HTTP `polling` (statut 200).
2. Upgrade WebSocket `socket.io/?EIO=4&transport=websocket` (statut 101).
3. Frames `40` (CONNECT), `2`/`3` (PING/PONG), `42[...]` (events).

### Vérifier l'émission côté serveur

Le gateway loggue chaque connexion / déconnexion via pino :

```
[WS] client connected      { clientId, userId }
[WS] client disconnected   { clientId }
```

Lors d'un publish, ajouter ponctuellement un log via le logger pino
injecté — **jamais `console.log`** (cf. CLAUDE.md § Conventions code).

### Test manuel rapide

```bash
# Terminal 1 : backend en dev
pnpm --filter @planit/backend dev

# Terminal 2 : wscat (npm i -g wscat)
wscat -c "ws://localhost:3001/socket.io/?EIO=4&transport=websocket"

# Coller "40" pour CONNECT
# Coller "42[\"session:published\",{...}]" pour simuler côté client
```

Pour un test bout-en-bout : ouvrir 2 onglets `/rp` + `/enseignant`,
publier depuis le RP, vérifier que le toast arrive côté enseignant.

---

## Liens

- ADR-0004 (stratégie WebSocket) : [`../architecture/adr/0004-websocket-realtime-strategy.md`](../architecture/adr/0004-websocket-realtime-strategy.md)
- ADR-0005 (auth et sécurisation handshake V02) : [`../architecture/adr/0005-authentication-strategy.md`](../architecture/adr/0005-authentication-strategy.md)
- Gateway : `apps/backend/src/ws/ws.gateway.ts`
- Hook client : `apps/web/src/hooks/use-realtime-sessions.ts`
- Contracts : `packages/contracts/src/planning/`
- Tech-debt : `WS-AUTH`, `WS-SCALE`
