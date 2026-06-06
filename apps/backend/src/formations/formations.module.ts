import { Module } from '@nestjs/common';
import { AnneesModule } from '../annees/annees.module';
import { FormationsController } from './formations.controller';
import { FormationsService } from './formations.service';

/**
 * FormationsModule (LOT 1 A.6). Importe AnneesModule pour rattacher les
 * créations à l'année courante. `FormationsService` exporté : les classes
 * (LOT 2) vérifient que la formation de rattachement existe.
 */
@Module({
  imports: [AnneesModule],
  controllers: [FormationsController],
  providers: [FormationsService],
  exports: [FormationsService],
})
export class FormationsModule {}
