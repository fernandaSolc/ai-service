import { Injectable } from '@nestjs/common';
import { register, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly requestCounter: Counter<string>;
  private readonly requestDuration: Histogram<string>;
  private readonly activeRequests: Gauge<string>;
  private readonly queueSize: Gauge<string>;
  private readonly tokensUsed: Counter<string>;
  private readonly costAccumulator: Counter<string>;
  private readonly errorCounter: Counter<string>;

  constructor() {
    // Contador de requisições
    this.requestCounter = new Counter({
      name: 'ia_service_requests_total',
      help: 'Total de requisições processadas',
      labelNames: ['method', 'endpoint', 'status'],
    });

    // Duração das requisições
    this.requestDuration = new Histogram({
      name: 'ia_service_request_duration_seconds',
      help: 'Duração das requisições em segundos',
      labelNames: ['method', 'endpoint'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
    });

    // Requisições ativas
    this.activeRequests = new Gauge({
      name: 'ia_service_active_requests',
      help: 'Número de requisições ativas',
    });

    // Tamanho da fila
    this.queueSize = new Gauge({
      name: 'ia_service_queue_size',
      help: 'Número de jobs na fila',
      labelNames: ['queue_name'],
    });

    // Tokens utilizados
    this.tokensUsed = new Counter({
      name: 'ia_service_tokens_total',
      help: 'Total de tokens utilizados',
      labelNames: ['model', 'type'],
    });

    // Custo acumulado
    this.costAccumulator = new Counter({
      name: 'ia_service_cost_usd_total',
      help: 'Custo total em USD',
      labelNames: ['model'],
    });

    // Contador de erros
    this.errorCounter = new Counter({
      name: 'ia_service_errors_total',
      help: 'Total de erros',
      labelNames: ['type', 'endpoint'],
    });

    // Registrar métricas
    register.registerMetric(this.requestCounter);
    register.registerMetric(this.requestDuration);
    register.registerMetric(this.activeRequests);
    register.registerMetric(this.queueSize);
    register.registerMetric(this.tokensUsed);
    register.registerMetric(this.costAccumulator);
    register.registerMetric(this.errorCounter);
  }

  /**
   * Incrementa contador de requisições
   */
  incrementRequestCounter(method: string, endpoint: string, status: string): void {
    this.requestCounter.inc({ method, endpoint, status });
  }

  /**
   * Registra duração de requisição
   */
  recordRequestDuration(method: string, endpoint: string, durationMs: number): void {
    this.requestDuration.observe({ method, endpoint }, durationMs / 1000);
  }

  /**
   * Atualiza contador de requisições ativas
   */
  setActiveRequests(count: number): void {
    this.activeRequests.set(count);
  }

  /**
   * Atualiza tamanho da fila
   */
  setQueueSize(queueName: string, size: number): void {
    this.queueSize.set({ queue_name: queueName }, size);
  }

  /**
   * Registra uso de tokens
   */
  recordTokensUsed(model: string, type: 'input' | 'output', count: number): void {
    this.tokensUsed.inc({ model, type }, count);
  }

  /**
   * Registra custo
   */
  recordCost(model: string, costUsd: number): void {
    this.costAccumulator.inc({ model }, costUsd);
  }

  /**
   * Incrementa contador de erros
   */
  incrementErrorCounter(type: string, endpoint: string): void {
    this.errorCounter.inc({ type, endpoint });
  }

  /**
   * Obtém métricas em formato Prometheus
   */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * Obtém métricas em formato JSON
   */
  async getMetricsAsJson(): Promise<any> {
    return register.getMetricsAsJSON();
  }

  /**
   * Limpa todas as métricas
   */
  clearMetrics(): void {
    register.clear();
  }
}
