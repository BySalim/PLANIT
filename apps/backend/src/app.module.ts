import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AcademicModule } from './academic/academic.module';
import { AcModule } from './ac/ac.module';
import { AnneesModule } from './annees/annees.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { ClassesModule } from './classes/classes.module';
import { LoggerModule } from './common/logger.module';
import { MetricsModule } from './metrics/metrics.module';
import { SallesModule } from './salles/salles.module';
import { PrismaModule } from './common/prisma.module';
import { EnseignantsModule } from './enseignants/enseignants.module';
import { EtudiantsModule } from './etudiants/etudiants.module';
import { FilieresModule } from './filieres/filieres.module';
import { FormationsModule } from './formations/formations.module';
import { HealthModule } from './health/health.module';
import { InscriptionsModule } from './inscriptions/inscriptions.module';
import { MaquettesModule } from './maquettes/maquettes.module';
import { SeanceModule } from './seance/seance.module';
import { SuiviModulesModule } from './suivi-modules/suivi-modules.module';
import { SeanceV2Module } from './seance-v2/seance-v2.module';
import { SettingsModule } from './settings/settings.module';
import { WsModule } from './ws/ws.module';

// En env `test`, on désactive de facto le rate limiting (limite très haute)
// pour éviter que des suites qui enchaînent des POST/PUT déclenchent du 429.
// La logique throttler reste exercée dans des tests dédiés si besoin.
const isTest = process.env['NODE_ENV'] === 'test';
const DEFAULT_LIMIT = isTest ? 10_000 : 100;

@Module({
  imports: [
    LoggerModule,
    MetricsModule,
    PrismaModule,
    ThrottlerModule.forRoot([
      // Quota global : 100 requêtes par IP / minute.
      // Les mutations sensibles ont leur propre @Throttle (voir SeanceController).
      { name: 'default', ttl: 60_000, limit: DEFAULT_LIMIT },
    ]),
    AuthModule,
    HealthModule,
    WsModule,
    SeanceModule,
    // LOT 2 V02 — nouveaux modules
    SettingsModule,
    EnseignantsModule,
    AcademicModule,
    FilieresModule,
    SeanceV2Module,
    // LOT 3 V02 — référentiel classes pour les formulaires séance V2
    ClassesModule,
    // V02 — référentiel salles (mirror de classes/), exposé pour combler
    // TD-V02-LOT3-A (select Salle restait vide tant que l'endpoint manquait)
    SallesModule,
    // V03 LOT 1 — référentiel académique : années, maquettes versionnées, formations
    AnneesModule,
    MaquettesModule,
    FormationsModule,
    // V03 LOT 2 — classes (refonte) + étudiants + inscriptions + suivi + scope AC
    AcModule,
    EtudiantsModule,
    InscriptionsModule,
    SuiviModulesModule,
  ],
  providers: [
    // Ordre important : throttler → auth → RBAC.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
