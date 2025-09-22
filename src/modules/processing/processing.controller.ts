import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpStatus,
  HttpCode,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ProcessingService } from './processing.service';
import { QueueService } from '../queue/queue.service';
import { CallbackService } from '../callback/callback.service';
import { LoggingService } from '../logging/logging.service';
import { MetricsService } from '../metrics/metrics.service';
import { PersistenceService } from '../persistence/persistence.service';
import { LoggingInterceptor } from '../logging/logging.interceptor';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import {
  ProcessRequestDto,
  ProcessResponseDto,
  StatusResponseDto,
  ErrorResponseDto,
  CallbackTestDto,
} from '../../common/dto';

@ApiTags('processing')
@Controller()
@UseInterceptors(LoggingInterceptor)
export class ProcessingController {
  constructor(
    private processingService: ProcessingService,
    private queueService: QueueService,
    private callbackService: CallbackService,
    private loggingService: LoggingService,
    private metricsService: MetricsService,
    private persistenceService: PersistenceService,
  ) {}

  @Post('process-content')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiKeyGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 req/min
  @ApiOperation({
    summary: 'Process content with IA (sync or async)',
    description: 'Recebe conteúdo bruto + metadados + política. Pode operar em modo sync (bloqueante) ou async via fila/callback.',
  })
  @ApiResponse({
    status: 200,
    description: 'Completed (sync result returned)',
    type: ProcessResponseDto,
  })
  @ApiResponse({
    status: 202,
    description: 'Accepted (async processing started)',
    schema: {
      type: 'object',
      properties: {
        workflowId: { type: 'string' },
        status: { type: 'string', example: 'accepted' },
        message: { type: 'string', example: 'Request accepted and queued for processing' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request (validation error)',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: 'Service unavailable (throttled or queue full)',
    type: ErrorResponseDto,
  })
  @ApiBearerAuth()
  @ApiSecurity('ApiKeyAuth')
  async processContent(@Body() request: ProcessRequestDto): Promise<ProcessResponseDto | any> {
    const context = this.loggingService.extractRequestContext({});
    context.workflowId = request.workflowId;

    this.loggingService.logRequest(context, `Processando conteúdo para workflowId: ${request.workflowId}`);

    try {
      if (request.mode === 'sync') {
        // Processamento síncrono
        this.metricsService.incrementRequestCounter('POST', '/process-content', 'processing');
        const result = await this.processingService.processContent(request);
        this.metricsService.incrementRequestCounter('POST', '/process-content', 'completed');
        return result;
      } else {
        // Processamento assíncrono
        await this.queueService.addProcessingJob({
          workflowId: request.workflowId,
          request,
          callbackUrl: request.callbackUrl,
        });

        this.metricsService.incrementRequestCounter('POST', '/process-content', 'accepted');
        
        return {
          workflowId: request.workflowId,
          status: 'accepted',
          message: 'Request accepted and queued for processing',
        };
      }
    } catch (error) {
      this.metricsService.incrementRequestCounter('POST', '/process-content', 'error');
      this.metricsService.incrementErrorCounter('request_error', '/process-content');
      throw error;
    }
  }

  @Get('status/:workflowId')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({
    summary: 'Get processing status',
    description: 'Retorna o status atual do workflow e metas básicas (raw/adapted ids).',
  })
  @ApiResponse({
    status: 200,
    description: 'Status do workflow',
    type: StatusResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Not found',
    type: ErrorResponseDto,
  })
  @ApiBearerAuth()
  @ApiSecurity('ApiKeyAuth')
  async getStatus(@Param('workflowId') workflowId: string): Promise<StatusResponseDto> {
    const execution = await this.persistenceService.getExecution(workflowId);
    
    if (!execution) {
      throw new Error('Workflow não encontrado');
    }

    return {
      workflowId: execution.workflowId,
      status: execution.status,
      rawId: execution.output?.payload?.meta?.rawId,
      adaptedId: execution.output?.payload?.meta?.adaptedId,
      lastUpdated: execution.updatedAt,
    };
  }

  @Post('callback-test')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({
    summary: 'Test callback (internal)',
    description: 'Endpoint para testar envio de callbacks (apenas admin).',
  })
  @ApiResponse({
    status: 200,
    description: 'Callback sent / OK',
    schema: {
      type: 'object',
      properties: {
        delivered: { type: 'boolean' },
      },
    },
  })
  @ApiSecurity('ApiKeyAuth')
  async testCallback(@Body() testData: CallbackTestDto): Promise<{ delivered: boolean }> {
    const result = await this.callbackService.testCallback(testData.callbackUrl, testData.payload);
    return { delivered: result.success };
  }

  // Endpoint de debug para testar autenticação
  @Get('debug-auth')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({
    summary: 'Debug authentication',
    description: 'Endpoint para testar se a autenticação está funcionando.',
  })
  async debugAuth(): Promise<any> {
    return {
      message: 'Autenticação funcionando!',
      timestamp: new Date().toISOString(),
      status: 'success'
    };
  }
}