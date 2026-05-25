import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { createFiliereSchema, updateFiliereSchema } from '@planit/contracts';
import type { CreateFiliereDto, FiliereDto, UpdateFiliereDto } from '@planit/contracts';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { FilieresService } from './filieres.service';

@ApiTags('Filières')
@ApiCookieAuth('access')
@Controller('filieres')
@Roles('RESPONSABLE_PROGRAMME')
export class FilieresController {
  constructor(private readonly filieres: FilieresService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des filières' })
  @ApiResponse({ status: 200, description: 'Liste filières' })
  list(): Promise<FiliereDto[]> {
    return this.filieres.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail filière' })
  @ApiResponse({ status: 200, description: 'Filière trouvée' })
  @ApiResponse({ status: 404, description: 'Filière introuvable' })
  findOne(@Param('id') id: string): Promise<FiliereDto> {
    return this.filieres.findOne(id);
  }

  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Créer une filière' })
  @ApiResponse({ status: 201, description: 'Filière créée' })
  @ApiResponse({ status: 409, description: 'Sigle déjà utilisé' })
  create(
    @Body(new ZodValidationPipe(createFiliereSchema)) dto: CreateFiliereDto,
  ): Promise<FiliereDto> {
    return this.filieres.create(dto);
  }

  @Put(':id')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Mettre à jour une filière' })
  @ApiResponse({ status: 200, description: 'Filière mise à jour' })
  @ApiResponse({ status: 404, description: 'Filière introuvable' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateFiliereSchema)) dto: UpdateFiliereDto,
  ): Promise<FiliereDto> {
    return this.filieres.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Supprimer une filière (refus si classes la référencent)' })
  @ApiResponse({ status: 204, description: 'Filière supprimée' })
  @ApiResponse({ status: 404, description: 'Filière introuvable' })
  @ApiResponse({ status: 409, description: 'Filière référencée par des classes' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.filieres.remove(id);
  }
}
