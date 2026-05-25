import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WsGateway } from './ws.gateway';

@Module({
  // AuthModule expose le `JwtService` ; le gateway l'utilise pour vérifier
  // le cookie `access` au handshake.
  imports: [AuthModule],
  providers: [WsGateway],
  exports: [WsGateway],
})
export class WsModule {}
