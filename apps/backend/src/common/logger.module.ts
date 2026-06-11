import { Global, Module } from '@nestjs/common';
import pino from 'pino';
import type { Logger } from 'pino';
import { getRequestId } from './request-context';

/**
 * Token DI pour récupérer l'instance pino partagée.
 * Usage : `constructor(@Inject(PINO_LOGGER) private readonly logger: Logger) {}`
 */
export const PINO_LOGGER = 'PINO_LOGGER';

/**
 * Champs systématiquement masqués dans les logs (auth, secrets, tokens).
 * Couvre les conventions REST (`authorization`, `cookie`) et les variantes
 * applicatives (`password`, `passwordHash`, `mfaSecret`, etc.). Le redacter
 * s'applique en profondeur via la notation par chemin `*.field`.
 */
const REDACT_PATHS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'cookie',
  'mfaSecret',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.authorization',
  '*.cookie',
  '*.mfaSecret',
  'req.headers.authorization',
  'req.headers.cookie',
];

/**
 * Construit l'instance pino unique du backend.
 * - Dev : transport `pino-pretty` (humain) si dispo, JSON sinon.
 * - Prod / test : JSON pur (plus performant, machine-readable).
 */
function createLogger(): Logger {
  const isProd = process.env['NODE_ENV'] === 'production';
  const isTest = process.env['NODE_ENV'] === 'test';
  const level = process.env['LOG_LEVEL'] ?? (isProd ? 'info' : 'debug');

  const baseOptions: pino.LoggerOptions = {
    level,
    redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
    base: { service: 'planit-backend' },
    // Injecte le requestId courant (AsyncLocalStorage) dans chaque ligne de log
    // pour corréler toutes les traces d'une même requête (ADR-0009 Phase 1).
    mixin() {
      const requestId = getRequestId();
      return requestId !== undefined ? { requestId } : {};
    },
  };

  if (isProd || isTest) {
    return pino(baseOptions);
  }

  // Dev : pino-pretty en transport. On essaie de le charger sans planter
  // si le binaire n'est pas dispo (édge case CI).
  try {
    return pino({
      ...baseOptions,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss.l',
          ignore: 'pid,hostname,service',
          singleLine: false,
        },
      },
    });
  } catch {
    return pino(baseOptions);
  }
}

@Global()
@Module({
  providers: [
    {
      provide: PINO_LOGGER,
      useFactory: createLogger,
    },
  ],
  exports: [PINO_LOGGER],
})
export class LoggerModule {}
