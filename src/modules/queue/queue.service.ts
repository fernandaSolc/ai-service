import { Injectable, Logger } from '@nestjs/common';
// import { InjectQueue } from '@nestjs/bullmq';
// import type { Queue } from 'bullmq';
import { ProcessRequestDto } from '../../common/dto';

export interface QueueJobData {
  workflowId: string;
  request: ProcessRequestDto;
  callbackUrl?: string;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  // Mock para desenvolvimento sem Redis
  private mockJobs = new Map<string, any>();

  constructor(
    // @InjectQueue('content-processing')
    // private contentProcessingQueue: Queue<QueueJobData>,
  ) {}

  /**
   * Adiciona job à fila de processamento (MOCK para desenvolvimento)
   */
  async addProcessingJob(data: QueueJobData): Promise<void> {
    try {
      // Mock: simular adição de job
      this.mockJobs.set(data.workflowId, {
        id: Date.now().toString(),
        workflowId: data.workflowId,
        status: 'waiting',
        progress: 0,
        createdAt: new Date(),
        processedAt: null,
        failedReason: null,
      });

      this.logger.log(`Job mock adicionado à fila para workflowId: ${data.workflowId}`);
    } catch (error) {
      this.logger.error('Erro ao adicionar job mock à fila:', error);
      throw error;
    }
  }

  /**
   * Obtém status de um job (MOCK para desenvolvimento)
   */
  async getJobStatus(workflowId: string): Promise<any> {
    const job = this.mockJobs.get(workflowId);
    
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      workflowId: job.workflowId,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      processedAt: job.processedAt,
      failedReason: job.failedReason,
    };
  }

  /**
   * Obtém estatísticas da fila (MOCK para desenvolvimento)
   */
  async getQueueStats(): Promise<any> {
    const jobs = Array.from(this.mockJobs.values());
    const waiting = jobs.filter(j => j.status === 'waiting').length;
    const active = jobs.filter(j => j.status === 'active').length;
    const completed = jobs.filter(j => j.status === 'completed').length;
    const failed = jobs.filter(j => j.status === 'failed').length;

    return {
      waiting,
      active,
      completed,
      failed,
      total: jobs.length,
    };
  }

  /**
   * Limpa jobs antigos da fila (MOCK para desenvolvimento)
   */
  async cleanQueue(): Promise<void> {
    // Mock: limpar jobs antigos (mais de 1 hora)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [workflowId, job] of this.mockJobs.entries()) {
      if (job.createdAt < oneHourAgo) {
        this.mockJobs.delete(workflowId);
      }
    }
    this.logger.log('Fila mock limpa de jobs antigos');
  }
}
