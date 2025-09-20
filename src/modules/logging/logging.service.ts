import { Injectable, Logger } from '@nestjs/common';

export interface LogContext {
  requestId?: string;
  workflowId?: string;
  userId?: string;
  status?: string;
  duration?: number;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  error?: string;
}

@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);

  /**
   * Log estruturado para requisições
   */
  logRequest(context: LogContext, message: string): void {
    this.logger.log({
      ...context,
      message,
      timestamp: new Date().toISOString(),
      level: 'info',
    });
  }

  /**
   * Log estruturado para processamento
   */
  logProcessing(context: LogContext, message: string): void {
    this.logger.log({
      ...context,
      message,
      timestamp: new Date().toISOString(),
      level: 'info',
      type: 'processing',
    });
  }

  /**
   * Log estruturado para erros
   */
  logError(context: LogContext, message: string, error?: Error): void {
    this.logger.error({
      ...context,
      message,
      error: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      level: 'error',
      type: 'error',
    });
  }

  /**
   * Log estruturado para métricas
   */
  logMetrics(context: LogContext, metrics: any): void {
    this.logger.log({
      ...context,
      ...metrics,
      timestamp: new Date().toISOString(),
      level: 'info',
      type: 'metrics',
    });
  }

  /**
   * Log estruturado para auditoria
   */
  logAudit(context: LogContext, action: string, details?: any): void {
    this.logger.log({
      ...context,
      action,
      details,
      timestamp: new Date().toISOString(),
      level: 'info',
      type: 'audit',
    });
  }

  /**
   * Gera ID único para requisição
   */
  generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extrai contexto de uma requisição HTTP
   */
  extractRequestContext(req: any): LogContext {
    return {
      requestId: req.headers['x-request-id'] || this.generateRequestId(),
      userId: req.user?.id || req.headers['x-user-id'],
    };
  }
}
