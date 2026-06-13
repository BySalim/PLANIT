import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PINO_LOGGER } from '../common/logger.module';
import type { Logger } from 'pino';
import { PrismaService } from '../common/prisma.service';

export interface AuditParams {
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  ecoleId?: string | null;
  meta?: Record<string, unknown>;
}

/**
 * Journalisation des actions sensibles (LOT 2 / V5-D2 / ADR-0020 §6).
 *
 * Écrit dans `AuditLog` (Prisma). En cas d'erreur d'écriture, on loggue
 * mais on ne lève pas — l'action principale ne doit pas être bloquée par
 * un échec d'audit (principe de resilience du journal). L'action principale
 * est déjà committée en BD quand on appelle `log`.
 *
 * Actions référencées :
 *  - `PERSONNEL_CREATED` / `PERSONNEL_UPDATED`
 *  - `PERSONNEL_SUSPENDED` / `PERSONNEL_REACTIVATED`
 *  - `ANNEE_STARTED` / `ANNEE_CLOSED`
 */
@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PINO_LOGGER) private readonly logger: Logger,
  ) {}

  async log(params: AuditParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: params.actorId,
          action: params.action,
          targetType: params.targetType,
          targetId: params.targetId ?? null,
          ecoleId: params.ecoleId ?? null,
          // Prisma Json? nullable : utiliser DbNull pour représenter l'absence de méta.
          meta: params.meta !== undefined ? (params.meta as Prisma.InputJsonValue) : Prisma.DbNull,
        },
      });
    } catch (err) {
      // Non-bloquant : log en erreur mais laisse l'action principale passer.
      this.logger.error({ err, params }, 'AuditService.log failed — audit entry lost');
    }
  }
}
