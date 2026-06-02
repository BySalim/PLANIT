import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

/**
 * Module Auth — expose `AuthService` (et le `JwtService` rattaché à
 * `JwtModule`) pour les autres modules (`WsGateway` notamment, qui
 * vérifie le cookie d'access au handshake).
 *
 * Les guards `JwtAuthGuard` et `RolesGuard` sont enregistrés en `APP_GUARD`
 * depuis `AppModule` pour rester globaux — pas besoin de les exporter ici.
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt-access' }),
    // Secret par défaut absent volontairement : chaque appel sign/verify
    // précise `secret` (access OU refresh). Ça évite tout risque de signer
    // un access avec le secret refresh ou inversement.
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAccessStrategy, JwtRefreshStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
