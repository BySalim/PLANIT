import { Module } from '@nestjs/common';
import { AcModule } from '../ac/ac.module';
import { SallesController } from './salles.controller';
import { SallesService } from './salles.service';

/**
 * SallesModule — référentiel des salles (lecture seule), enrichi V03 avec
 * `rpResponsable` + scope AC (importe AcModule). Consommé par le formulaire
 * séance V02 (CreateSessionModal + drawer édition).
 */
@Module({
  imports: [AcModule],
  controllers: [SallesController],
  providers: [SallesService],
  exports: [SallesService],
})
export class SallesModule {}
