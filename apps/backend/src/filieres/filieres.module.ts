import { Module } from '@nestjs/common';
import { FilieresController } from './filieres.controller';
import { FilieresService } from './filieres.service';

/**
 * FilieresModule (LOT 2 V02 B.9) — CRUD réservé au RP.
 */
@Module({
  controllers: [FilieresController],
  providers: [FilieresService],
  exports: [FilieresService],
})
export class FilieresModule {}
