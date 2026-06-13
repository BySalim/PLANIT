import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { z } from '@planit/contracts';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuditService } from './audit.service';
import type { PaginatedAuditLogs } from './audit.service';

// Filtres + pagination du journal. Schéma de query inline (pattern établi
// `enseignants.controller.ts`) — les contracts ne portent que les DTOs.
const journalQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  ecoleId: z.string().min(1).optional(),
  action: z.string().min(1).max(120).optional(),
  actorId: z.string().min(1).optional(),
  q: z.string().min(1).max(120).optional(),
});

type JournalQueryDto = z.infer<typeof journalQuerySchema>;

@ApiTags('Journal d’audit')
@ApiCookieAuth('access')
@Controller('journal')
@Roles('ADMIN', 'SUPER_ADMIN')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Journal d’audit (Admin) — paginé, tri desc' })
  @ApiResponse({ status: 200, description: 'Liste paginée des actions tracées' })
  @ApiResponse({ status: 403, description: 'Réservé ADMIN / SUPER_ADMIN' })
  list(
    @Query(new ZodValidationPipe(journalQuerySchema)) query: JournalQueryDto,
  ): Promise<PaginatedAuditLogs> {
    return this.audit.list({
      page: query.page,
      pageSize: query.pageSize,
      ...(query.ecoleId !== undefined ? { ecoleId: query.ecoleId } : {}),
      ...(query.action !== undefined ? { action: query.action } : {}),
      ...(query.actorId !== undefined ? { actorId: query.actorId } : {}),
      ...(query.q !== undefined ? { q: query.q } : {}),
    });
  }
}
