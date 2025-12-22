import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check', description: 'Full health check with database and Redis status' })
  @ApiResponse({ status: 200, description: 'Service health status' })
  async check() {
    return this.healthService.check();
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe', description: 'Simple liveness check for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  liveness() {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe', description: 'Check if service is ready to accept traffic' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  async readiness() {
    return this.healthService.checkReadiness();
  }
}


