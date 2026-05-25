import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { updateSettingsSchema } from '@planit/contracts';
import type { SettingsDto, UpdateSettingsDto } from '@planit/contracts';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  /** B.10 — lecture publique (le front a besoin de valider les horaires aussi). */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Paramètres globaux (horaires de journée)' })
  @ApiResponse({ status: 200, description: 'Paramètres courants' })
  get(): Promise<SettingsDto> {
    return this.settings.get();
  }

  /** B.10 — modification réservée au RP. */
  @Roles('RESPONSABLE_PROGRAMME')
  @Put()
  @ApiCookieAuth('access')
  @ApiOperation({ summary: 'Mettre à jour les paramètres (RP only)' })
  @ApiResponse({ status: 200, description: 'Paramètres mis à jour' })
  @ApiResponse({ status: 400, description: 'Validation invalide' })
  @ApiResponse({ status: 403, description: 'Rôle insuffisant' })
  update(
    @Body(new ZodValidationPipe(updateSettingsSchema)) dto: UpdateSettingsDto,
  ): Promise<SettingsDto> {
    return this.settings.update(dto);
  }
}
