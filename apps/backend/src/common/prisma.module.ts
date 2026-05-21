import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Global module: any module can inject PrismaService without importing
 * PrismaModule explicitly.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
