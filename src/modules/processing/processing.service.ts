import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ProcessRequestDto, ProcessResponseDto, WorkflowFrontendPayloadDto } from '../../common/dto';
import { ValidationService } from '../validation/validation.service';
import { PromptBuilderService } from '../prompt-builder/prompt-builder.service';
import { IaProviderService } from '../ia-provider/ia-provider.service';
import { LoggingService } from '../logging/logging.service';
import { MetricsService } from '../metrics/metrics.service';
import { PersistenceService } from '../persistence/persistence.service';

@Injectable()
export class ProcessingService {
  private readonly logger = new Logger(ProcessingService.name);

  constructor(
    private validationService: ValidationService,
    private promptBuilderService: PromptBuilderService,
    private iaProviderService: IaProviderService,
    private loggingService: LoggingService,
    private metricsService: MetricsService,
    private persistenceService: PersistenceService,
  ) {}

  /**
   * Processa conteúdo de forma síncrona
   */
  async processContent(request: ProcessRequestDto): Promise<ProcessResponseDto> {
    const startTime = Date.now();
    const context = {
      workflowId: request.workflowId,
      userId: request.authorId,
    };

    try {
      this.loggingService.logProcessing(context, 'Iniciando processamento de conteúdo');

      // 1. Validar payload
      this.validationService.validateProcessRequest(request);
      this.validationService.validatePolicy(request.policy);

      // 2. Sanitizar texto
      const sanitizedText = this.validationService.sanitizeText(request.text);
      const sanitizedRequest = { ...request, text: sanitizedText };

      // 3. Salvar registro inicial
      await this.persistenceService.saveInitialExecution(
        request.workflowId,
        sanitizedRequest,
        'processing'
      );

      // 4. Construir prompt
      const prompt = this.promptBuilderService.buildPrompt(sanitizedRequest);

      // 5. Enviar para IA
      const iaResponse = await this.iaProviderService.processPrompt(prompt, {
        maxTokens: request.options?.maxResponseTokens || 2000,
        temperature: request.options?.temperature || 0.2,
        model: request.options?.modelHint || 'gpt-4o',
      });

      // 6. Validar e corrigir resposta se necessário
      const correctedResponse = await this.iaProviderService.validateAndCorrectResponse(
        iaResponse.content,
        this.promptBuilderService.buildSchemaCorrectionPrompt(
          iaResponse.content,
          this.getExpectedSchema()
        ),
        {
          maxTokens: 1000,
          temperature: 0.1,
          model: request.options?.modelHint || 'gpt-4o',
        }
      );

      // 7. Parsear resposta JSON
      let payload: WorkflowFrontendPayloadDto;
      try {
        payload = JSON.parse(correctedResponse.content);
      } catch (parseError) {
        this.logger.warn('Falha ao fazer parse da resposta da IA, usando fallback');
        payload = this.createFallbackPayload(sanitizedRequest);
      }

      // 8. Aplicar validações de política
      const violations = this.applyPolicyValidations(payload, sanitizedRequest.policy);
      payload.violations = violations;

      // 9. Criar resposta final
      const response: ProcessResponseDto = {
        workflowId: request.workflowId,
        status: 'completed',
        payload,
        execution: correctedResponse.metadata,
      };

      // 10. Salvar resultado
      await this.persistenceService.updateExecutionStatus(
        request.workflowId,
        'completed',
        response,
        correctedResponse.metadata
      );

      // 11. Registrar métricas
      const duration = Date.now() - startTime;
      this.metricsService.recordRequestDuration('POST', '/process-content', duration);
      this.metricsService.recordTokensUsed(
        correctedResponse.metadata.model,
        'input',
        correctedResponse.metadata.tokensIn
      );
      this.metricsService.recordTokensUsed(
        correctedResponse.metadata.model,
        'output',
        correctedResponse.metadata.tokensOut
      );
      this.metricsService.recordCost(correctedResponse.metadata.model, correctedResponse.metadata.costUsd);

      this.loggingService.logProcessing(
        {
          ...context,
          status: 'completed',
          duration,
          tokensIn: correctedResponse.metadata.tokensIn,
          tokensOut: correctedResponse.metadata.tokensOut,
          costUsd: correctedResponse.metadata.costUsd,
        },
        'Processamento concluído com sucesso'
      );

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.loggingService.logError(
        {
          ...context,
          status: 'error',
          duration,
          error: error.message,
        },
        'Erro no processamento de conteúdo'
      );

      this.metricsService.incrementErrorCounter('processing_error', '/process-content');

      // Salvar erro
      await this.persistenceService.updateExecutionStatus(
        request.workflowId,
        'error',
        undefined,
        undefined,
        error.message
      );

      throw new ServiceUnavailableException('Falha no processamento do conteúdo');
    }
  }

  /**
   * Aplica validações de política ao payload
   */
  private applyPolicyValidations(
    payload: WorkflowFrontendPayloadDto,
    policy?: any
  ): any[] {
    const violations: any[] = [];

    if (!policy) return violations;

    // Verificar termos obrigatórios
    if (policy.requiredTerms && policy.requiredTerms.length > 0) {
      const requiredViolations = this.validationService.checkRequiredTerms(
        payload.summary + ' ' + payload.improvedText.map(t => t.content).join(' '),
        policy.requiredTerms
      );
      violations.push(...requiredViolations);
    }

    // Verificar termos proibidos
    if (policy.forbiddenTerms && policy.forbiddenTerms.length > 0) {
      const forbiddenViolations = this.validationService.checkForbiddenTerms(
        payload.summary + ' ' + payload.improvedText.map(t => t.content).join(' '),
        policy.forbiddenTerms
      );
      violations.push(...forbiddenViolations);
    }

    return violations;
  }

  /**
   * Cria payload de fallback em caso de erro
   */
  private createFallbackPayload(request: ProcessRequestDto): WorkflowFrontendPayloadDto {
    return {
      summary: `Resumo básico do conteúdo: ${request.metadata.title}`,
      metrics: {
        readabilityScore: 50,
        durationMin: 5,
        coverage: 60,
      },
      violations: [],
      suggestions: [],
      quiz: [],
      improvedText: [
        {
          section: 'Conteúdo',
          content: request.text.substring(0, 500) + '...',
        },
      ],
      meta: {
        rawId: 'fallback',
        adaptedId: 'fallback',
      },
    };
  }

  /**
   * Retorna schema esperado para validação
   */
  private getExpectedSchema(): any {
    return {
      summary: 'string',
      metrics: {
        readabilityScore: 'number',
        durationMin: 'number',
        coverage: 'number',
      },
      violations: 'array',
      suggestions: 'array',
      quiz: 'array',
      improvedText: 'array',
      meta: {
        rawId: 'string',
        adaptedId: 'string',
      },
    };
  }
}
