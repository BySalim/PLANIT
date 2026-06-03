import { Module } from '@nestjs/common';
import { AcModule } from '../ac/ac.module';
import { InscriptionsController } from './inscriptions.controller';
import { InscriptionsService } from './inscriptions.service';

/**
 * InscriptionsModule (LOT 2 B.3/B.4) — flux d'inscription partagé RP + AC.
 * Importe AcModule pour scoper les inscriptions d'un AC à ses classes.
 */
@Module({
  imports: [AcModule],
  controllers: [InscriptionsController],
  providers: [InscriptionsService],
  exports: [InscriptionsService],
})
export class InscriptionsModule {}
