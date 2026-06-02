import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { createModuleSchema, createUeSchema, updateUeSchema, z } from '@planit/contracts';
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

const listQuerySchema = z.object({
  // `?withModules=true` retourne les UE avec leurs modules nested
  // (mode legacy utilisé par les formulaires séance). Sans le paramètre,
  // l'endpoint retourne en mode lite (UE seules + moduleCount).
  withModules: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
});
type ListQuery = z.infer<typeof listQuerySchema>;

@ApiTags('UE')
@ApiCookieAuth('access')
@Controller('ues')
@Roles('RESPONSABLE_PROGRAMME')
export class UeController {
  constructor(
    private readonly ues: UeService,
    private readonly modules: ModulesService,
  ) {}

  /**
   * Liste **lite** par défaut — chaque UE expose `moduleCount` mais pas
   * `modules`. Le front lazy-fetch les modules d'une UE quand
   * l'utilisateur la déploie via `GET /ues/:ueId/modules`.
   *
   * `?withModules=true` réactive le mode legacy (UE avec `modules`
   * nested), utilisé par les formulaires séance qui ont besoin de la
   * liste aplatie des modules pour leur select.
   */
  @Get()
  @ApiQuery({
    name: 'withModules',
    required: false,
    description: 'true → UE avec modules nested (legacy), sinon mode lite + moduleCount',
  })
  @ApiOperation({ summary: 'Liste des UE (lite par défaut)' })
  @ApiResponse({ status: 200, description: 'Liste UE' })
  list(@Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery): Promise<UEDto[]> {
    return this.ues.list(query.withModules === true ? { withModules: true } : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail UE (avec modules nested)' })
  @ApiResponse({ status: 200, description: 'UE trouvée' })
  @ApiResponse({ status: 404, description: 'UE introuvable' })
  findOne(@Param('id') id: string): Promise<UEDto> {
    return this.ues.findOne(id);
  }

  /** Lazy load des modules d'une UE pour la page UE & Modules. */
  @Get(':ueId/modules')
  @ApiOperation({ summary: "Modules d'une UE (lazy load)" })
  @ApiResponse({ status: 200, description: 'Liste des modules' })
  @ApiResponse({ status: 404, description: 'UE introuvable' })
  findModules(@Param('ueId') ueId: string): Promise<ModuleV2Dto[]> {
    return this.ues.findModulesForUe(ueId);
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
