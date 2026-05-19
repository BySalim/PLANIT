import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: process.env['FRONTEND_URL'] ?? 'http://localhost:3000' },
})
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket): void {
    console.log(`[WS] client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    console.log(`[WS] client disconnected: ${client.id}`);
  }
}
