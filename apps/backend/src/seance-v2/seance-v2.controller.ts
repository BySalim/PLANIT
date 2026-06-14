import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { createSessionV2Schema, updateSessionV2Schema, z } from '@planit/contracts';
import type { CreateSessionV2Dto, SessionV2Dto, UpdateSessionV2Dto } from '@planit/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import type { PublishV2Query, WeekV2Query } from './seance-v2.service';
import { SeanceV2Service } from './seance-v2.service';

// ── Query schemas ──────────────────────────────────────────────────

const weekQuerySchema = z.object({
  weekStart: z.string().date(),
  classeId: z.string().min(1).optional(),
  teacherId: z.string().min(1).optional(), // référentiel Enseignant (Enseignant.id V02)
  studentId: z.string().min(1).optional(),
  // V05 LOT 6 (ADR-0022 §4) — référentiel Salle (occupation école + masquage).
  salleId: z.string().min(1).optional(),
  // V05 LOT 7 — vue byroom : occupation de toute l'école (masquée).
  scope: z.literal('ecole').optional(),
  take: z.coerce.number().int().min(1).max(500).default(100),
  skip: z.coerce.number().int().min(0).default(0),
});

const publishQuerySchema = z.object({
  classeId: z.string().min(1).optional(),
  // Accept either a comma-separated string or repeated query param.
  seanceIds: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      const arr = Array.isArray(v) ? v : v.split(',');
      return arr.map((s) => s.trim()).filter((s) => s.length > 0);
    }),
});

type WeekQueryDto = z.infer<typeof weekQuerySchema>;
type PublishQueryDto = z.infer<typeof publishQuerySchema>;

@ApiTags('Sessions V2')
@ApiCookieAuth('access')
@Controller('v2/sessions')
export class SeanceV2Controller {
  constructor(private readonly seances: SeanceV2Service) {}

  /** B.3 — list week sessions with multi-classes support. */
  @Get()
  @ApiOperation({ summary: "Liste des séances V2 d'une semaine" })
  @ApiResponse({ status: 200, description: 'Liste séances V02' })
  @ApiResponse({ status: 400, description: 'Paramètres invalides' })
  findWeek(
    @Query(new ZodValidationPipe(weekQuerySchema)) query: WeekQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<SessionV2Dto[]> {
    return this.seances.findWeek(query as WeekV2Query, user);
  }

  /** B.5 — stats par type V02 + sous-type. */
  @Get('stats')
  @ApiOperation({ summary: 'Compteurs hebdomadaires V02 par type / sous-type' })
  @ApiResponse({ status: 200, description: 'Compteurs' })
  @ApiResponse({ status: 400, description: 'Paramètres invalides' })
  stats(
    @Query(new ZodValidationPipe(weekQuerySchema)) query: WeekQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.seances.stats(query as WeekV2Query, user);
  }

  /** B.4 — détail. */
  @Get(':id')
  @ApiOperation({ summary: "Détail d'une séance V02" })
  @ApiResponse({ status: 200, description: 'Séance trouvée' })
  @ApiResponse({ status: 404, description: 'Séance introuvable' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload): Promise<SessionV2Dto> {
    return this.seances.findOne(id, user);
  }

  /** B.1 — création (discriminated union sur `type`). */
  @Post()
  @HttpCode(201)
  @Roles('RESPONSABLE_PROGRAMME')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Créer une séance V02' })
  @ApiResponse({ status: 201, description: 'Séance créée' })
  @ApiResponse({ status: 400, description: 'Body invalide ou horaire hors plage' })
  @ApiResponse({ status: 403, description: 'Rôle insuffisant' })
  create(
    @Body(new ZodValidationPipe(createSessionV2Schema)) dto: CreateSessionV2Dto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<SessionV2Dto> {
    return this.seances.create(dto, user.id);
  }

  /**
   * B.2 — update (refuse type change → 422 ; smart dirty recompute).
   *
   * Throttle 60/min : le PUT est appelé par le drag&drop / resize / undo /
   * redo du planning RP. Une séquence de quelques drags + Ctrl+Z + Ctrl+V
   * peut générer 20-30 PUT en moins d'une minute (multi-sélection en
   * particulier). 10/min était trop bas et provoquait des 429 en usage
   * normal. 60/min reste anti-abus (1 req/s soutenue) sans gêner l'UX.
   */
  @Put(':id')
  @Roles('RESPONSABLE_PROGRAMME')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Mettre à jour une séance V02' })
  @ApiResponse({ status: 200, description: 'Séance mise à jour' })
  @ApiResponse({ status: 400, description: 'Body invalide' })
  @ApiResponse({ status: 404, description: 'Séance introuvable' })
  @ApiResponse({ status: 422, description: 'Tentative de changement de type (immutable)' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSessionV2Schema)) dto: UpdateSessionV2Dto,
  ): Promise<SessionV2Dto> {
    return this.seances.update(id, dto);
  }

  /**
   * LOT 4 V2 — supprime une séance V02 si jamais publiée. Permet l'undo
   * des créations + le bouton supprimer dans le drawer côté front. Refuse
   * 400 si la séance a déjà été publiée au moins une fois.
   */
  @Delete(':id')
  @HttpCode(204)
  @Roles('RESPONSABLE_PROGRAMME')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Supprimer une séance V02 (non publiée)' })
  @ApiResponse({ status: 204, description: 'Séance supprimée' })
  @ApiResponse({ status: 400, description: 'Séance déjà publiée — non supprimable' })
  @ApiResponse({ status: 403, description: 'Rôle insuffisant' })
  @ApiResponse({ status: 404, description: 'Séance introuvable' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.seances.remove(id);
  }

  /** B.4 — publish (smart-dirty snapshot + B.11 multi-classes WS). */
  @Post('publish')
  @HttpCode(200)
  @Roles('RESPONSABLE_PROGRAMME')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Publier les séances V02 en attente' })
  @ApiResponse({ status: 200, description: 'Séances publiées' })
  @ApiResponse({ status: 403, description: 'Rôle insuffisant' })
  publish(
    @Query(new ZodValidationPipe(publishQuerySchema)) query: PublishQueryDto,
  ): Promise<SessionV2Dto[]> {
    return this.seances.publish(query as PublishV2Query);
  }
}
