import { Body, Controller, Delete, HttpCode, Param, Put } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { updateModuleSchema } from '@planit/contracts';
import type { ModuleV2Dto, UpdateModuleDto } from '@planit/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ModulesService } from './modules.service';

@ApiTags('Modules')
@ApiCookieAuth('access')
@Controller('modules')
@Roles('RESPONSABLE_PROGRAMME')
export class ModulesController {
  constructor(private readonly modules: ModulesService) {}

  @Put(':id')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Mettre à jour un module' })
  @ApiResponse({ status: 200, description: 'Module mis à jour' })
  @ApiResponse({ status: 404, description: 'Module introuvable' })
  @ApiResponse({ status: 409, description: 'Code module déjà utilisé' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateModuleSchema)) dto: UpdateModuleDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ModuleV2Dto> {
    return this.modules.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Supprimer un module (refus si séances le réfèrent)' })
  @ApiResponse({ status: 204, description: 'Module supprimé' })
  @ApiResponse({ status: 404, description: 'Module introuvable' })
  @ApiResponse({ status: 409, description: 'Module utilisé par des séances' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload): Promise<void> {
    await this.modules.remove(id, user);
  }
}
