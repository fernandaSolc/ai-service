import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MetricsDto {
  @ApiProperty({ description: 'Pontuação de legibilidade' })
  readabilityScore: number;

  @ApiProperty({ description: 'Duração em minutos' })
  durationMin: number;

  @ApiProperty({ description: 'Cobertura % em relação aos objetivos declarados' })
  coverage: number;
}

export class ViolationDto {
  @ApiProperty({ description: 'Regra violada' })
  rule: string;

  @ApiProperty({ description: 'Mensagem de violação' })
  message: string;

  @ApiProperty({ description: 'Severidade da violação', enum: ['low', 'medium', 'high'] })
  severity: 'low' | 'medium' | 'high';
}

export class SuggestionDto {
  @ApiProperty({ description: 'Seção do conteúdo' })
  section: string;

  @ApiProperty({ description: 'Mensagem de sugestão' })
  message: string;
}

export class QuizDto {
  @ApiProperty({ description: 'Pergunta' })
  q: string;

  @ApiProperty({ description: 'Opções de resposta', type: [String] })
  options: string[];

  @ApiProperty({ description: 'Índice (0-based) da alternativa correta' })
  correct: number;
}

export class ImprovedTextSectionDto {
  @ApiProperty({ description: 'Seção do texto' })
  section: string;

  @ApiProperty({ description: 'Conteúdo da seção' })
  content: string;
}

export class WorkflowMetaDto {
  @ApiPropertyOptional({ description: 'ID do conteúdo bruto' })
  rawId?: string;

  @ApiPropertyOptional({ description: 'ID do conteúdo adaptado' })
  adaptedId?: string;
}

export class WorkflowFrontendPayloadDto {
  @ApiProperty({ description: 'Resumo curto para exibição' })
  summary: string;

  @ApiProperty({ description: 'Métricas do conteúdo' })
  metrics: MetricsDto;

  @ApiProperty({ description: 'Violações encontradas', type: [ViolationDto] })
  violations: ViolationDto[];

  @ApiProperty({ description: 'Sugestões de melhoria', type: [SuggestionDto] })
  suggestions: SuggestionDto[];

  @ApiProperty({ description: 'Questões geradas', type: [QuizDto] })
  quiz: QuizDto[];

  @ApiProperty({ description: 'Texto revisado, dividido por seção', type: [ImprovedTextSectionDto] })
  improvedText: ImprovedTextSectionDto[];

  @ApiProperty({ description: 'Metadados do workflow' })
  meta: WorkflowMetaDto;
}

export class ExecutionMetadataDto {
  @ApiProperty({ description: 'Modelo utilizado' })
  model: string;

  @ApiProperty({ description: 'Tokens de entrada' })
  tokensIn: number;

  @ApiProperty({ description: 'Tokens de saída' })
  tokensOut: number;

  @ApiProperty({ description: 'Latência em milissegundos' })
  latencyMs: number;

  @ApiProperty({ description: 'Custo em USD' })
  costUsd: number;
}

export class ProcessResponseDto {
  @ApiProperty({ description: 'ID do workflow' })
  workflowId: string;

  @ApiProperty({ description: 'Status da execução', enum: ['completed', 'error', 'partial'] })
  status: 'completed' | 'error' | 'partial';

  @ApiProperty({ description: 'Payload para o frontend' })
  payload: WorkflowFrontendPayloadDto;

  @ApiProperty({ description: 'Metadados de execução' })
  execution: ExecutionMetadataDto;
}

export class ErrorResponseDto {
  @ApiProperty({ description: 'Código do erro' })
  code: string;

  @ApiProperty({ description: 'Mensagem de erro' })
  message: string;

  @ApiPropertyOptional({ description: 'Detalhes adicionais' })
  details?: any;
}

export class StatusResponseDto {
  @ApiProperty({ description: 'ID do workflow' })
  workflowId: string;

  @ApiProperty({ description: 'Status atual', example: 'in_progress' })
  status: string;

  @ApiPropertyOptional({ description: 'ID do conteúdo bruto' })
  rawId?: string;

  @ApiPropertyOptional({ description: 'ID do conteúdo adaptado' })
  adaptedId?: string;

  @ApiProperty({ description: 'Última atualização' })
  lastUpdated: Date;
}

export class CallbackTestDto {
  @ApiProperty({ description: 'URL de callback' })
  callbackUrl: string;

  @ApiProperty({ description: 'Payload para teste' })
  payload: any;
}
