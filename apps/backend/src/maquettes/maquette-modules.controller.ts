import { Body, Controller, Delete, HttpCode, Param, Put } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { updateMaquetteModuleSchema } from '@planit/contracts';
import type { MaquetteModuleDto, UpdateMaquetteModuleDto } from '@planit/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { MaquettesService } from './maquettes.service';

/**
 * `/api/maquette-modules` (A.4 + A.7). PUT/DELETE par id. RP only.
 */
@ApiTags('Maquettes')
@ApiCookieAuth('access')
@Controller('maquette-modules')
@Roles('RESPONSABLE_PROGRAMME')
export class MaquetteModulesController {
  constructor(private readonly maquettes: MaquettesService) {}

  @Put(':id')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: "Composer : modifier les heures/semestre d'un module de version" })
  @ApiResponse({ status: 200, description: 'Module mis à jour (VHE/VHT dérivés)' })
  @ApiResponse({ status: 404, description: 'Module de maquette introuvable' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateMaquetteModuleSchema)) dto: UpdateMaquetteModuleDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<MaquetteModuleDto> {
    return this.maquettes.updateModule(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Composer : retirer un module de la version' })
  @ApiResponse({ status: 204, description: 'Module retiré' })
  @ApiResponse({ status: 404, description: 'Module de maquette introuvable' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload): Promise<void> {
    await this.maquettes.removeModule(id, user);
  }
}
