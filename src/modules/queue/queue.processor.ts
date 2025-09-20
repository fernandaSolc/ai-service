import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { QueueJobData } from './queue.service';
import { CallbackService } from '../callback/callback.service';
import { ValidationService } from '../validation/validation.service';
import { PromptBuilderService } from '../prompt-builder/prompt-builder.service';
import { IaProviderService } from '../ia-provider/ia-provider.service';
import { LoggingService } from '../logging/logging.service';
import { MetricsService } from '../metrics/metrics.service';
import { PersistenceService } from '../persistence/persistence.service';

@Processor('content-processing')
export class QueueProcessor extends WorkerHost {
  private readonly logger = new Logger(QueueProcessor.name);

  constructor(
    private validationService: ValidationService,
    private promptBuilderService: PromptBuilderService,
    private iaProviderService: IaProviderService,
    private loggingService: LoggingService,
    private metricsService: MetricsService,
    private persistenceService: PersistenceService,
    private callbackService: CallbackService,
  ) {
    super();
  }

  async process(job: Job<QueueJobData>): Promise<any> {
    const { workflowId, request, callbackUrl } = job.data;
    
    this.logger.log(`Processando conteúdo para workflowId: ${workflowId}`);

    try {
      // Atualizar progresso
      job.progress = 10;

      // Processar conteúdo (implementação simplificada para evitar dependência circular)
      const context = { workflowId, userId: request.authorId };
      this.loggingService.logProcessing(context, 'Iniciando processamento assíncrono');

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

      job.progress = 30;

      // 4. Construir prompt
      const prompt = this.promptBuilderService.buildPrompt(sanitizedRequest);

      // 5. Enviar para IA
      const iaResponse = await this.iaProviderService.processPrompt(prompt, {
        maxTokens: request.options?.maxResponseTokens || 2000,
        temperature: request.options?.temperature || 0.2,
        model: request.options?.modelHint || 'gpt-4o',
      });

      job.progress = 60;

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

      job.progress = 80;

      // 7. Parsear resposta JSON
      let payload;
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
      const result = {
        workflowId: request.workflowId,
        status: 'completed' as const,
        payload,
        execution: correctedResponse.metadata,
      };

      // 10. Salvar resultado
      await this.persistenceService.updateExecutionStatus(
        request.workflowId,
        'completed',
        result as any,
        correctedResponse.metadata
      );

      // Enviar callback se fornecido
      if (callbackUrl) {
        await this.callbackService.sendCallback(callbackUrl, {
          workflowId,
          status: 'completed',
          payload: result.payload,
          execution: result.execution,
        });
        
        job.progress = 90;
      }

      job.progress = 100;
      
      this.logger.log(`Conteúdo processado com sucesso para workflowId: ${workflowId}`);
      
      return result;
    } catch (error) {
      this.logger.error(`Erro ao processar conteúdo para workflowId: ${workflowId}`, error);
      
      // Salvar erro
      await this.persistenceService.updateExecutionStatus(
        request.workflowId,
        'error',
        undefined,
        undefined,
        error.message
      );
      
      // Enviar callback de erro se fornecido
      if (callbackUrl) {
        try {
          await this.callbackService.sendCallback(callbackUrl, {
            workflowId,
            status: 'error',
            error: error.message,
          });
        } catch (callbackError) {
          this.logger.error('Erro ao enviar callback de erro:', callbackError);
        }
      }
      
      throw error;
    }
  }

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

  private createFallbackPayload(request: any): any {
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

  private applyPolicyValidations(payload: any, policy?: any): any[] {
    const violations: any[] = [];

    if (!policy) return violations;

    // Verificar termos obrigatórios
    if (policy.requiredTerms && policy.requiredTerms.length > 0) {
      const requiredViolations = this.validationService.checkRequiredTerms(
        payload.summary + ' ' + payload.improvedText.map((t: any) => t.content).join(' '),
        policy.requiredTerms
      );
      violations.push(...requiredViolations);
    }

    // Verificar termos proibidos
    if (policy.forbiddenTerms && policy.forbiddenTerms.length > 0) {
      const forbiddenViolations = this.validationService.checkForbiddenTerms(
        payload.summary + ' ' + payload.improvedText.map((t: any) => t.content).join(' '),
        policy.forbiddenTerms
      );
      violations.push(...forbiddenViolations);
    }

    return violations;
  }
}
