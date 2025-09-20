import { Injectable, Logger } from '@nestjs/common';
import { ProcessRequestDto, ProcessResponseDto, ExecutionMetadataDto } from '../../common/dto';

export interface ExecutionRecord {
  id: string;
  workflowId: string;
  authorId?: string;
  mode: 'sync' | 'async';
  status: 'pending' | 'processing' | 'completed' | 'error';
  input: ProcessRequestDto;
  output?: ProcessResponseDto;
  execution?: ExecutionMetadataDto;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
}

@Injectable()
export class PersistenceService {
  private readonly logger = new Logger(PersistenceService.name);
  private executions: Map<string, ExecutionRecord> = new Map();

  /**
   * Salva registro inicial de execução
   */
  async saveInitialExecution(
    workflowId: string,
    request: ProcessRequestDto,
    status: 'pending' | 'processing' = 'pending'
  ): Promise<ExecutionRecord> {
    const record: ExecutionRecord = {
      id: this.generateId(),
      workflowId,
      authorId: request.authorId,
      mode: request.mode,
      status,
      input: request,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.executions.set(workflowId, record);
    this.logger.log(`Registro inicial salvo para workflowId: ${workflowId}`);
    
    return record;
  }

  /**
   * Atualiza status de execução
   */
  async updateExecutionStatus(
    workflowId: string,
    status: 'processing' | 'completed' | 'error',
    output?: ProcessResponseDto,
    execution?: ExecutionMetadataDto,
    error?: string
  ): Promise<ExecutionRecord | null> {
    const record = this.executions.get(workflowId);
    if (!record) {
      this.logger.warn(`Registro não encontrado para workflowId: ${workflowId}`);
      return null;
    }

    record.status = status;
    record.updatedAt = new Date();
    
    if (output) {
      record.output = output;
    }
    
    if (execution) {
      record.execution = execution;
    }
    
    if (error) {
      record.error = error;
    }
    
    if (status === 'completed' || status === 'error') {
      record.completedAt = new Date();
    }

    this.executions.set(workflowId, record);
    this.logger.log(`Status atualizado para workflowId: ${workflowId} - ${status}`);
    
    return record;
  }

  /**
   * Obtém registro de execução
   */
  async getExecution(workflowId: string): Promise<ExecutionRecord | null> {
    return this.executions.get(workflowId) || null;
  }

  /**
   * Lista execuções por status
   */
  async getExecutionsByStatus(status: string): Promise<ExecutionRecord[]> {
    return Array.from(this.executions.values()).filter(record => record.status === status);
  }

  /**
   * Lista execuções por autor
   */
  async getExecutionsByAuthor(authorId: string): Promise<ExecutionRecord[]> {
    return Array.from(this.executions.values()).filter(record => record.authorId === authorId);
  }

  /**
   * Obtém estatísticas de execução
   */
  async getExecutionStats(): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    error: number;
    averageDuration?: number;
  }> {
    const records = Array.from(this.executions.values());
    const completed = records.filter(r => r.status === 'completed' && r.completedAt);
    
    const totalDuration = completed.reduce((sum, record) => {
      if (record.completedAt) {
        return sum + (record.completedAt.getTime() - record.createdAt.getTime());
      }
      return sum;
    }, 0);

    return {
      total: records.length,
      pending: records.filter(r => r.status === 'pending').length,
      processing: records.filter(r => r.status === 'processing').length,
      completed: records.filter(r => r.status === 'completed').length,
      error: records.filter(r => r.status === 'error').length,
      averageDuration: completed.length > 0 ? totalDuration / completed.length : undefined,
    };
  }

  /**
   * Limpa registros antigos
   */
  async cleanOldRecords(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    let removedCount = 0;
    for (const [workflowId, record] of this.executions.entries()) {
      if (record.createdAt < cutoffDate) {
        this.executions.delete(workflowId);
        removedCount++;
      }
    }
    
    this.logger.log(`${removedCount} registros antigos removidos`);
    return removedCount;
  }

  /**
   * Gera ID único
   */
  private generateId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
