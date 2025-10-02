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

export class ChapterDto {
  @ApiProperty({ description: 'ID do capítulo' })
  id: number;

  @ApiProperty({ description: 'Título do capítulo' })
  title: string;

  @ApiProperty({ description: 'Conteúdo do capítulo' })
  content: string;

  @ApiProperty({ description: 'Objetivos de aprendizagem do capítulo', type: [String] })
  learningObjectives: string[];

  @ApiProperty({ description: 'Atividades do capítulo', type: [String] })
  activities: string[];

  @ApiProperty({ description: 'Critérios de avaliação', type: [String] })
  evaluationCriteria: string[];

  @ApiProperty({ description: 'Exemplos práticos', type: [String] })
  practicalExamples: string[];

  @ApiProperty({ description: 'Recursos adicionais', type: [String] })
  resources: string[];

  @ApiProperty({ description: 'Duração estimada em minutos' })
  estimatedDuration: number;
}

export class QualityMetricsDto {
  @ApiProperty({ description: 'Score de qualidade (0-100)' })
  qualityScore: number;

  @ApiProperty({ description: 'Log de processamento' })
  processingLog: any;

  @ApiProperty({ description: 'Resultado detalhado' })
  result: any;

  @ApiProperty({ description: 'Sugestões de melhoria', type: [String] })
  suggestions: string[];

  @ApiProperty({ description: 'Modelo utilizado' })
  model: string;
}

export class WorkflowFrontendPayloadDto {
  @ApiProperty({ description: 'Indica se o processamento foi bem-sucedido' })
  success: boolean;

  @ApiProperty({ description: 'Capítulos gerados', type: [ChapterDto] })
  chapters: ChapterDto[];

  @ApiProperty({ description: 'Métricas de qualidade' })
  qualityScore: number;

  @ApiProperty({ description: 'Log de processamento' })
  processingLog: any;

  @ApiProperty({ description: 'Resultado detalhado' })
  result: any;

  @ApiProperty({ description: 'Métricas de IA (tokens, latência, custo)' })
  metrics: {
    tokensIn: number;
    tokensOut: number;
    latencyMs: number;
    costUsd: number;
  };

  @ApiProperty({ description: 'Sugestões de melhoria', type: [String] })
  suggestions: string[];

  @ApiProperty({ description: 'Modelo utilizado' })
  model: string;

  // Campos legados para compatibilidade
  @ApiPropertyOptional({ description: 'Resumo curto para exibição - LEGADO' })
  summary?: string;

  @ApiPropertyOptional({ description: 'Métricas do conteúdo - LEGADO' })
  legacyMetrics?: MetricsDto;

  @ApiPropertyOptional({ description: 'Violações encontradas - LEGADO', type: [ViolationDto] })
  violations?: ViolationDto[];

  @ApiPropertyOptional({ description: 'Questões geradas - LEGADO', type: [QuizDto] })
  quiz?: QuizDto[];

  @ApiPropertyOptional({ description: 'Texto revisado, dividido por seção - LEGADO', type: [ImprovedTextSectionDto] })
  improvedText?: ImprovedTextSectionDto[];

  @ApiPropertyOptional({ description: 'Metadados do workflow - LEGADO' })
  meta?: WorkflowMetaDto;

  @ApiPropertyOptional({ description: 'Livro completo gerado (outline + capítulos) - LEGADO' })
  book?: any;
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
