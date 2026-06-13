import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AuditLogDto } from '@planit/contracts';
import { PrismaService } from '../common/prisma.service';

/**
 * Entrée du journal d'audit (V5-D8 / ADR-0020). `action` suit la convention
 * `<domaine>.<verbe>` (ex. `ecole.create`, `user.suspend`, `ecole.direction.create`).
 */
export interface AuditEntry {
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  ecoleId?: string | null;
  meta?: Prisma.InputJsonValue;
}

interface ListQuery {
  page?: number;
  pageSize?: number;
  ecoleId?: string;
  action?: string;
  actorId?: string;
  q?: string;
}

export interface PaginatedAuditLogs {
  items: AuditLogDto[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Écriture mutualisée du journal d'audit. Le `log()` accepte un client de
 * transaction pour écrire la trace **dans la même transaction** que l'action
 * sensible (cohérence action ↔ trace, ADR-0020 §6). On passe `this.prisma` hors
 * transaction quand l'atomicité n'est pas requise.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persiste une entrée d'audit. `client` = un `tx` Prisma (dans une
   * `$transaction`) ou le `PrismaService` lui-même (écriture autonome).
   */
  async log(client: Prisma.TransactionClient, entry: AuditEntry): Promise<void> {
    await client.auditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId ?? null,
        ecoleId: entry.ecoleId ?? null,
        ...(entry.meta !== undefined ? { meta: entry.meta } : {}),
      },
    });
  }

  /** `GET /api/journal` — liste paginée, tri antéchronologique, filtres optionnels. */
  async list(query: ListQuery): Promise<PaginatedAuditLogs> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, query.pageSize ?? 50));

    const where: Prisma.AuditLogWhereInput = {};
    if (query.ecoleId) where.ecoleId = query.ecoleId;
    if (query.actorId) where.actorId = query.actorId;
    if (query.action) where.action = { contains: query.action, mode: 'insensitive' };
    if (query.q) {
      where.OR = [
        { action: { contains: query.q, mode: 'insensitive' } },
        { targetType: { contains: query.q, mode: 'insensitive' } },
        { targetId: { contains: query.q, mode: 'insensitive' } },
        { actor: { fullName: { contains: query.q, mode: 'insensitive' } } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { actor: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items: rows.map(toDto), total, page, pageSize };
  }
}

type AuditLogRow = Prisma.AuditLogGetPayload<{
  include: { actor: { select: { id: true; fullName: true } } };
}>;

function toDto(row: AuditLogRow): AuditLogDto {
  return {
    id: row.id,
    actorId: row.actorId,
    actor: row.actor ? { id: row.actor.id, fullName: row.actor.fullName } : null,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    ecoleId: row.ecoleId,
    meta: row.meta ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
