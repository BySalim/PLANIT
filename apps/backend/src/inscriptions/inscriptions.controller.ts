import { Body, Controller, Delete, HttpCode, Param, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { inscriptionRequestSchema } from '@planit/contracts';
import type { InscriptionDto, InscriptionRequestDto } from '@planit/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { InscriptionsService } from './inscriptions.service';

/**
 * Inscriptions (B.3/B.4) — **RP + AC** (un AC sur ses classes assignées).
 *
 * Sans préfixe de contrôleur : la création vit sous `classes/:classeId/...`
 * (ressource imbriquée) et la suppression sous `inscriptions/:id`.
 */
@ApiTags('Inscriptions')
@ApiCookieAuth('access')
@Controller()
@Roles('RESPONSABLE_PROGRAMME', 'ASSISTANT_PROGRAMME')
export class InscriptionsController {
  constructor(private readonly inscriptions: InscriptionsService) {}

  @Post('classes/:classeId/inscriptions')
  @HttpCode(201)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Inscrire un étudiant (flux email → existant/nouveau)' })
  @ApiResponse({ status: 201, description: 'Inscription créée' })
  @ApiResponse({ status: 403, description: 'Classe hors périmètre AC' })
  @ApiResponse({ status: 404, description: 'Classe / étudiant introuvable' })
  @ApiResponse({
    status: 409,
    description: 'Doublon ou règle double-diplôme (≤ 2/an, 1 par catégorie)',
  })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Param('classeId') classeId: string,
    @Body(new ZodValidationPipe(inscriptionRequestSchema)) dto: InscriptionRequestDto,
  ): Promise<InscriptionDto> {
    return this.inscriptions.create(user, classeId, dto);
  }

  @Delete('inscriptions/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Désinscrire un étudiant' })
  @ApiResponse({ status: 204, description: 'Inscription supprimée' })
  @ApiResponse({ status: 403, description: 'Classe hors périmètre AC' })
  @ApiResponse({ status: 404, description: 'Inscription introuvable' })
  async remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string): Promise<void> {
    await this.inscriptions.remove(user, id);
  }
}
