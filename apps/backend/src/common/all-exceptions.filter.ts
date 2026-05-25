import { Catch, HttpException, HttpStatus, Inject } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Logger } from 'pino';
import { ZodError } from 'zod';
import { PINO_LOGGER } from './logger.module';

/**
 * Sous-ensemble minimum des objets Express dont on a besoin ici.
 * Définis localement pour éviter une dépendance directe à `@types/express`
 * (Nest le ré-exporte indirectement via `@nestjs/platform-express`).
 */
interface RequestLike {
  url: string;
  method: string;
}

interface ResponseLike {
  status(code: number): ResponseLike;
  json(body: unknown): ResponseLike;
}

/**
 * Payload normalisé renvoyé au client pour toutes les erreurs HTTP.
 * `errors` est optionnel : utilisé pour les détails de validation Zod.
 */
interface NormalizedError {
  statusCode: number;
  message: string;
  timestamp: string;
  path: string;
  errors?: unknown;
}

/**
 * Filtre global qui capture **toutes** les exceptions non gérées :
 * - `HttpException` (Nest) → relayée avec son code + message d'origine.
 * - `Prisma.PrismaClientKnownRequestError` → traduite :
 *     - P2025 (record not found) → 404
 *     - P2002 (unique constraint) → 409
 *     - P2003 (foreign key)       → 400
 * - `ZodError` → 400 avec `errors` détaillés (filet de sécurité, normalement
 *   intercepté par `ZodValidationPipe`).
 * - Tout le reste → 500 avec message générique côté client + stack côté logs.
 *
 * Toujours logué via pino côté serveur, avec masquage des champs sensibles
 * configuré dans `LoggerModule`.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(@Inject(PINO_LOGGER) private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<ResponseLike>();
    const request = ctx.getRequest<RequestLike>();

    const normalized = this.normalize(exception, request);

    // Log enrichi : path, méthode, status, et stack si présente.
    const logPayload = {
      path: normalized.path,
      method: request.method,
      statusCode: normalized.statusCode,
      err:
        exception instanceof Error
          ? { name: exception.name, message: exception.message, stack: exception.stack }
          : exception,
    };

    if (normalized.statusCode >= 500) {
      this.logger.error(logPayload, 'Unhandled exception');
    } else {
      this.logger.warn(logPayload, 'Handled exception');
    }

    response.status(normalized.statusCode).json(normalized);
  }

  /** Construit le payload normalisé selon le type d'erreur. */
  private normalize(exception: unknown, request: RequestLike): NormalizedError {
    const base = {
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const { message, errors } = this.extractHttpMessage(res, exception.message);
      return {
        ...base,
        statusCode: status,
        message,
        ...(errors !== undefined ? { errors } : {}),
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return { ...base, ...this.mapPrismaError(exception) };
    }

    if (exception instanceof ZodError) {
      return {
        ...base,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        errors: exception.flatten().fieldErrors,
      };
    }

    // Erreur non identifiée : on masque côté client, on log tout côté serveur.
    return {
      ...base,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }

  /** Traduit un code Prisma connu en couple { statusCode, message }. */
  private mapPrismaError(error: Prisma.PrismaClientKnownRequestError): {
    statusCode: number;
    message: string;
  } {
    switch (error.code) {
      case 'P2025':
        return { statusCode: HttpStatus.NOT_FOUND, message: 'Ressource introuvable' };
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'Conflit : une ressource avec ces valeurs uniques existe déjà',
        };
      case 'P2003':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Référence invalide : entité liée inexistante',
        };
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Erreur base de données',
        };
    }
  }

  /**
   * Extrait `message` (et éventuellement `errors`) du payload d'une HttpException.
   * Supporte les formes string, { message, errors }, ou plain object.
   */
  private extractHttpMessage(
    response: string | object,
    fallback: string,
  ): { message: string; errors?: unknown } {
    if (typeof response === 'string') {
      return { message: response };
    }

    if (response !== null && typeof response === 'object') {
      const obj = response as Record<string, unknown>;
      const rawMessage = obj['message'];
      const message =
        typeof rawMessage === 'string'
          ? rawMessage
          : Array.isArray(rawMessage)
            ? rawMessage.join(', ')
            : fallback;
      const errors = obj['errors'];
      return errors !== undefined ? { message, errors } : { message };
    }

    return { message: fallback };
  }
}
