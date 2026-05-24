import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { SessionDto } from '@planit/contracts';
import { corsOrigin } from '../common/cors';

/**
 * Realtime gateway. Clients identify themselves at connection time with
 * `io(url, { auth: { userId } })`; the gateway joins them to a per-user room
 * so events can be emitted to concerned actors only (V1-D2: no auth yet).
 *
 * CORS partagé avec HTTP via `common/cors.ts` — éviter qu'un fix HTTP n'oublie
 * le WS et inversement (régression vue avec preview MCP sur port dynamique).
 */
@WebSocketGateway({
  cors: { origin: corsOrigin() },
})
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  /** Socket.IO room name for a given user id. */
  private static room(userId: string): string {
    return `user:${userId}`;
  }

  handleConnection(client: Socket): void {
    const userId: unknown = client.handshake.auth['userId'];
    if (typeof userId === 'string' && userId.length > 0) {
      void client.join(WsGateway.room(userId));
      console.log(`[WS] client connected: ${client.id} (user ${userId})`);
    } else {
      console.log(`[WS] client connected: ${client.id} (anonymous)`);
    }
  }

  handleDisconnect(client: Socket): void {
    console.log(`[WS] client disconnected: ${client.id}`);
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
