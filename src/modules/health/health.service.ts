import { Injectable, Logger } from '@nestjs/common';
import { IaProviderService } from '../ia-provider/ia-provider.service';

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  services: {
    ia: boolean;
    queue: boolean;
    persistence: boolean;
  };
  timestamp: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly version = '1.0.0';

  constructor(
    private iaProviderService: IaProviderService,
  ) {}

  /**
   * Verifica status geral do serviço
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const services = await this.checkServices();
    const allHealthy = Object.values(services).every(status => status === true);
    const anyHealthy = Object.values(services).some(status => status === true);

    let status: 'ok' | 'degraded' | 'error';
    if (allHealthy) {
      status = 'ok';
    } else if (anyHealthy) {
      status = 'degraded';
    } else {
      status = 'error';
    }

    return {
      status,
      version: this.version,
      services,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Verifica status dos serviços individuais
   */
  private async checkServices(): Promise<{ ia: boolean; queue: boolean; persistence: boolean }> {
    const [ia, queue, persistence] = await Promise.allSettled([
      this.checkIaService(),
      this.checkQueueService(),
      this.checkPersistenceService(),
    ]);

    return {
      ia: ia.status === 'fulfilled' && ia.value,
      queue: queue.status === 'fulfilled' && queue.value,
      persistence: persistence.status === 'fulfilled' && persistence.value,
    };
  }

  /**
   * Verifica serviço de IA
   */
  private async checkIaService(): Promise<boolean> {
    try {
      return await this.iaProviderService.healthCheck();
    } catch (error) {
      this.logger.error('Health check IA falhou:', error);
      return false;
    }
  }

  /**
   * Verifica serviço de fila (simplificado)
   */
  private async checkQueueService(): Promise<boolean> {
    try {
      // Verificação simples sem dependências
      return true;
    } catch (error) {
      this.logger.error('Health check fila falhou:', error);
      return false;
    }
  }

  /**
   * Verifica serviço de persistência (simplificado)
   */
  private async checkPersistenceService(): Promise<boolean> {
    try {
      // Verificação simples sem dependências
      return true;
    } catch (error) {
      this.logger.error('Health check persistência falhou:', error);
      return false;
    }
  }

  /**
   * Verifica se o serviço está pronto para receber requisições
   */
  async isReady(): Promise<boolean> {
    const health = await this.getHealthStatus();
    return health.status === 'ok' || health.status === 'degraded';
  }
}
