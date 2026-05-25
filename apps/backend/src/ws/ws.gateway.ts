import { Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import type { Logger } from 'pino';
import type { Server, Socket } from 'socket.io';
import type { SessionDto } from '@planit/contracts';
import { ACCESS_COOKIE_NAME } from '../auth/cookies';
import { corsOrigin } from '../common/cors';
import { PINO_LOGGER } from '../common/logger.module';

/**
 * Realtime gateway. Handshake **authentifié** depuis V02 LOT 1 (ADR-0005 §8) :
 * le cookie HttpOnly `access` est lu via `handshake.headers.cookie`, vérifié
 * avec `JwtService` (signature + expiration). Le user joint `user:<id>`
 * server-side ; aucun client ne peut prétendre être un autre user via
 * `handshake.auth`.
 *
 * CORS partagé avec HTTP via `common/cors.ts` — éviter qu'un fix HTTP n'oublie
 * le WS et inversement (régression vue avec preview MCP sur port dynamique).
 */
@WebSocketGateway({
  cors: { origin: corsOrigin(), credentials: true },
})
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    @Inject(PINO_LOGGER) private readonly logger: Logger,
  ) {}

  /** Socket.IO room name for a given user id. */
  private static room(userId: string): string {
    return `user:${userId}`;
  }

  handleConnection(client: Socket): void {
    const cookieHeader = client.handshake.headers.cookie;
    const accessToken = parseCookie(cookieHeader, ACCESS_COOKIE_NAME);

    if (!accessToken) {
      this.logger.warn({ clientId: client.id }, '[WS] connection refused: no access cookie');
      client.disconnect(true);
      return;
    }

    const secret = process.env['JWT_ACCESS_SECRET'];
    if (!secret) {
      this.logger.error(
        { clientId: client.id },
        '[WS] connection refused: JWT_ACCESS_SECRET missing',
      );
      client.disconnect(true);
      return;
    }

    let payload: unknown;
    try {
      payload = this.jwt.verify(accessToken, { secret });
    } catch (err) {
      this.logger.warn({ clientId: client.id, err }, '[WS] connection refused: invalid token');
      client.disconnect(true);
      return;
    }

    if (
      payload === null ||
      typeof payload !== 'object' ||
      typeof (payload as { sub?: unknown }).sub !== 'string'
    ) {
      this.logger.warn({ clientId: client.id }, '[WS] connection refused: malformed payload');
      client.disconnect(true);
      return;
    }

    const userId = (payload as { sub: string }).sub;
    void client.join(WsGateway.room(userId));
    this.logger.info({ clientId: client.id, userId }, '[WS] client connected');
  }

  handleDisconnect(client: Socket): void {
    this.logger.info({ clientId: client.id }, '[WS] client disconnected');
  }

  /**
   * Emit `session:published` to the given users only (one room per user id).
   * No-op when there is no recipient.
   */
  emitSessionPublished(userIds: string[], sessions: SessionDto[]): void {
    if (userIds.length === 0) return;
    const rooms = userIds.map((id) => WsGateway.room(id));
    this.server.to(rooms).emit('session:published', { sessions });
  }
}

/**
 * Mini-parser cookie pour le handshake — on évite d'ajouter une dépendance
 * sur `cookie` côté gateway. Sépare `cookie: a=1; b=2; c=3` et retourne la
 * valeur recherchée, en décodant en URL.
 */
function parseCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  const parts = header.split(';');
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key === name) {
      const value = part.slice(eq + 1).trim();
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }
  return null;
}
