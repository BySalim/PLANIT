import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { SettingsDto, UpdateSettingsDto } from '@planit/contracts';
import { PrismaService } from '../common/prisma.service';

/**
 * Singleton settings — one row with id='singleton'. Cf. V2-D10.
 *
 * The row is created by the Prisma seed (`apps/backend/prisma/seed-data.ts`).
 * In production, the migration ensures the row exists before any read.
 *
 * Read endpoint is public (front needs to validate horaires before POST).
 * Write endpoint is RP-only (RBAC enforced by `@Roles()` on the controller).
 */
@Injectable()
export class SettingsService {
  private static readonly SINGLETON_ID = 'singleton';

  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<SettingsDto> {
    const row = await this.prisma.settings.findUnique({
      where: { id: SettingsService.SINGLETON_ID },
    });
    if (!row) {
      // Defensive : the seed creates this row. If it's missing in dev, the
      // RP can re-seed ; in test the resetDb helper restores it.
      throw new NotFoundException('Settings introuvables — réappliquer le seed');
    }
    return { dayStartHour: row.dayStartHour, dayEndHour: row.dayEndHour };
  }

  async update(dto: UpdateSettingsDto): Promise<SettingsDto> {
    const current = await this.get();
    const next: SettingsDto = {
      dayStartHour: dto.dayStartHour ?? current.dayStartHour,
      dayEndHour: dto.dayEndHour ?? current.dayEndHour,
    };
    // Cross-field validation (cannot be expressed cleanly on a Zod `.partial()`).
    if (next.dayStartHour >= next.dayEndHour) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { dayStartHour: ['dayStartHour doit être strictement < dayEndHour'] },
      });
    }
    const row = await this.prisma.settings.update({
      where: { id: SettingsService.SINGLETON_ID },
      data: next,
    });
    return { dayStartHour: row.dayStartHour, dayEndHour: row.dayEndHour };
  }
}
