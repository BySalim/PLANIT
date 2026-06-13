import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { createPersonnelSchema, updatePersonnelSchema } from '@planit/contracts';
import type { CreatePersonnelDto, PersonnelDto, UpdatePersonnelDto } from '@planit/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { DirectionScopeService } from './direction-scope.service';
import { PersonnelService } from './personnel.service';

/**
 * `/api/personnel` — gestion RP + AC par la Direction (LOT 2 / V5-D2).
 *
 * Toutes les routes requièrent le rôle `DIRECTION` (`@Roles` au niveau
 * contrôleur). Le scope école est résolu depuis `user.ecoleId` (JWT, pas
 * de hit BD supplémentaire).
 */
@ApiTags('Personnel')
@ApiCookieAuth('access')
@Controller('personnel')
@Roles('DIRECTION')
export class PersonnelController {
  constructor(
    private readonly personnel: PersonnelService,
    private readonly scope: DirectionScopeService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liste RP + AC de mon école (Direction)' })
  @ApiResponse({ status: 200, description: 'Liste du personnel' })
  list(@CurrentUser() user: CurrentUserPayload): Promise<PersonnelDto[]> {
    return this.personnel.list(this.scope.requireEcoleId(user));
  }

  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Créer un RP ou AC dans mon école (Direction)' })
  @ApiResponse({ status: 201, description: 'Personnel créé' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(createPersonnelSchema)) dto: CreatePersonnelDto,
  ): Promise<PersonnelDto> {
    const ecoleId = this.scope.requireEcoleId(user);
    return this.personnel.create(dto, ecoleId, user.id);
  }

  @Put(':id')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Modifier nom/email d'un personnel (Direction)" })
  @ApiResponse({ status: 200, description: 'Personnel mis à jour' })
  @ApiResponse({ status: 404, description: 'Personnel introuvable' })
  @ApiResponse({ status: 403, description: 'Personnel hors périmètre école' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(updatePersonnelSchema)) dto: UpdatePersonnelDto,
  ): Promise<PersonnelDto> {
    const ecoleId = this.scope.requireEcoleId(user);
    return this.personnel.update(id, dto, ecoleId, user.id);
  }

  @Patch(':id/suspendre')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Suspendre un personnel (Direction) — révoque les sessions' })
  @ApiResponse({ status: 200, description: 'Personnel suspendu' })
  @ApiResponse({ status: 404, description: 'Personnel introuvable' })
  @ApiResponse({ status: 409, description: 'Déjà suspendu' })
  suspendre(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<PersonnelDto> {
    const ecoleId = this.scope.requireEcoleId(user);
    return this.personnel.suspendre(id, ecoleId, user.id);
  }

  @Patch(':id/reactiver')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Réactiver un personnel suspendu (Direction)' })
  @ApiResponse({ status: 200, description: 'Personnel réactivé' })
  @ApiResponse({ status: 404, description: 'Personnel introuvable' })
  @ApiResponse({ status: 409, description: 'Déjà actif' })
  reactiver(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<PersonnelDto> {
    const ecoleId = this.scope.requireEcoleId(user);
    return this.personnel.reactiver(id, ecoleId, user.id);
  }
}
