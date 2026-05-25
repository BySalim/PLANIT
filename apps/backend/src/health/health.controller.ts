import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';

interface HealthResponse {
  status: 'ok';
  service: string;
  version: string;
  ts: string;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  check(): HealthResponse {
    return {
      status: 'ok',
      service: 'planit-backend',
      version: '0.1.0',
      ts: new Date().toISOString(),
    };
  }
}
