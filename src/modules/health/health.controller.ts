import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get('health')
  @ApiOperation({
    summary: 'Health check',
    description: 'Retorna status do serviço (liveness).',
  })
  @ApiResponse({
    status: 200,
    description: 'OK',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        version: { type: 'string', example: '1.0.0' },
      },
    },
  })
  async getHealth(@Res() res: Response): Promise<void> {
    const health = await this.healthService.getHealthStatus();
    
    if (health.status === 'error') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json(health);
    } else {
      res.status(HttpStatus.OK).json({
        status: health.status,
        version: health.version,
      });
    }
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness check',
    description: 'Verifica se o serviço está pronto para receber requisições.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service ready',
  })
  @ApiResponse({
    status: 503,
    description: 'Service not ready',
  })
  async getReadiness(@Res() res: Response): Promise<void> {
    const isReady = await this.healthService.isReady();
    
    if (isReady) {
      res.status(HttpStatus.OK).json({ status: 'ready' });
    } else {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({ status: 'not ready' });
    }
  }
}
