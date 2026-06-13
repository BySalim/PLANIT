import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { createEcoleSchema, updateEcoleSchema, z } from '@planit/contracts';
import type { CreateEcoleDto, EcoleDto, UpdateEcoleDto, UserAdminDto } from '@planit/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { EcolesService } from './ecoles.service';

// Corps de création de la Direction (inline — pas un DTO partagé : usage unique).
const createDirectionSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(120),
  password: z.string().min(12).max(72),
});
type CreateDirectionDto = z.infer<typeof createDirectionSchema>;

const ADMIN_THROTTLE = { default: { limit: 10, ttl: 60_000 } } as const;

@ApiTags('Écoles (Admin)')
@ApiCookieAuth('access')
@Controller('ecoles')
@Roles('ADMIN', 'SUPER_ADMIN')
export class EcolesController {
  constructor(private readonly ecoles: EcolesService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des écoles actives' })
  @ApiResponse({ status: 200, description: 'Écoles actives' })
  @ApiResponse({ status: 403, description: 'Réservé ADMIN / SUPER_ADMIN' })
  list(): Promise<EcoleDto[]> {
    return this.ecoles.list();
  }

  @Post()
  @HttpCode(201)
  @Throttle(ADMIN_THROTTLE)
  @ApiOperation({ summary: 'Créer une école' })
  @ApiResponse({ status: 201, description: 'École créée' })
  @ApiResponse({ status: 409, description: 'Nom d’école déjà pris' })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(createEcoleSchema)) dto: CreateEcoleDto,
  ): Promise<EcoleDto> {
    return this.ecoles.create(user, dto);
  }

  @Put(':id')
  @Throttle(ADMIN_THROTTLE)
  @ApiOperation({ summary: 'Modifier une école' })
  @ApiResponse({ status: 200, description: 'École mise à jour' })
  @ApiResponse({ status: 404, description: 'École introuvable' })
  @ApiResponse({ status: 409, description: 'Nom d’école déjà pris' })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateEcoleSchema)) dto: UpdateEcoleDto,
  ): Promise<EcoleDto> {
    return this.ecoles.update(user, id, dto);
  }

  @Patch(':id/archive')
  @Throttle(ADMIN_THROTTLE)
  @ApiOperation({ summary: 'Archiver une école (sort des listes, jamais supprimée)' })
  @ApiResponse({ status: 200, description: 'École archivée' })
  @ApiResponse({ status: 404, description: 'École introuvable' })
  archive(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string): Promise<EcoleDto> {
    return this.ecoles.archive(user, id);
  }

  @Post(':id/direction')
  @HttpCode(201)
  @Throttle(ADMIN_THROTTLE)
  @ApiOperation({ summary: 'Créer le compte Direction d’une école' })
  @ApiResponse({ status: 201, description: 'Direction créée' })
  @ApiResponse({ status: 404, description: 'École introuvable' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  createDirection(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createDirectionSchema)) dto: CreateDirectionDto,
  ): Promise<UserAdminDto> {
    return this.ecoles.createDirection(user, id, dto);
  }
}
