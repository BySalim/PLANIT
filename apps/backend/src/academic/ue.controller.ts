import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { createModuleSchema, createUeSchema, updateUeSchema } from '@planit/contracts';
import type {
  CreateModuleDto,
  CreateUEDto,
  ModuleV2Dto,
  UEDto,
  UpdateUEDto,
} from '@planit/contracts';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ModulesService } from './modules.service';
import { UeService } from './ue.service';

@ApiTags('UE')
@ApiCookieAuth('access')
@Controller('ues')
@Roles('RESPONSABLE_PROGRAMME')
export class UeController {
  constructor(
    private readonly ues: UeService,
    private readonly modules: ModulesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liste des UE avec leurs modules' })
  @ApiResponse({ status: 200, description: 'Liste UE + modules nested' })
  list(): Promise<UEDto[]> {
    return this.ues.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail UE' })
  @ApiResponse({ status: 200, description: 'UE trouvée' })
  @ApiResponse({ status: 404, description: 'UE introuvable' })
  findOne(@Param('id') id: string): Promise<UEDto> {
    return this.ues.findOne(id);
  }

  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Créer une UE' })
  @ApiResponse({ status: 201, description: 'UE créée' })
  @ApiResponse({ status: 409, description: 'Code UE déjà utilisé' })
  create(@Body(new ZodValidationPipe(createUeSchema)) dto: CreateUEDto): Promise<UEDto> {
    return this.ues.create(dto);
  }

  @Put(':id')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Mettre à jour une UE' })
  @ApiResponse({ status: 200, description: 'UE mise à jour' })
  @ApiResponse({ status: 404, description: 'UE introuvable' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUeSchema)) dto: UpdateUEDto,
  ): Promise<UEDto> {
    return this.ues.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Supprimer une UE (refus si modules)' })
  @ApiResponse({ status: 204, description: 'UE supprimée' })
  @ApiResponse({ status: 404, description: 'UE introuvable' })
  @ApiResponse({ status: 409, description: 'UE contient des modules' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.ues.remove(id);
  }

  /**
   * B.8 — création d'un module sous l'UE parent (FK `ueId` injectée depuis l'URL).
   * Pas de page détail Module (V2-D14), donc on n'expose pas GET ici.
   */
  @Post(':ueId/modules')
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Créer un module sous l'UE parente" })
  @ApiResponse({ status: 201, description: 'Module créé' })
  @ApiResponse({ status: 404, description: 'UE introuvable' })
  @ApiResponse({ status: 409, description: 'Code module déjà utilisé' })
  createModule(
    @Param('ueId') ueId: string,
    @Body(new ZodValidationPipe(createModuleSchema)) dto: CreateModuleDto,
  ): Promise<ModuleV2Dto> {
    return this.modules.create(ueId, dto);
  }
}
