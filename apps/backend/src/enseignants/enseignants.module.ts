import { Module } from '@nestjs/common';
import { EnseignantsController } from './enseignants.controller';
import { EnseignantsService } from './enseignants.service';

/**
 * EnseignantsModule (LOT 2 V02 B.6) — CRUD réservé au RP.
 * Crée atomiquement User (rôle ENSEIGNANT, argon2id) + Enseignant (1-1).
 */
@Module({
  controllers: [EnseignantsController],
  providers: [EnseignantsService],
  exports: [EnseignantsService],
})
export class EnseignantsModule {}
