import { IsString, IsOptional, IsEnum, IsObject, IsArray, ValidateNested, IsUUID, IsUrl, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ComponentDto {
  @ApiProperty({ description: 'ID do componente' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Nome do componente' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Título do componente' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Descrição do componente' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Público-alvo' })
  @IsOptional()
  @IsString()
  targetAudience?: string;

  @ApiProperty({ description: 'Nível educacional' })
  @IsString()
  educationalLevel: string;

  @ApiProperty({ description: 'Disciplina/Assunto' })
  @IsString()
  subject: string;

  @ApiPropertyOptional({ description: 'Duração estimada em minutos' })
  @IsOptional()
  @IsNumber()
  estimatedDuration?: number;

  @ApiPropertyOptional({ description: 'Objetivos de aprendizagem', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningObjectives?: string[];
}

export class TemplateDto {
  @ApiProperty({ description: 'ID do template' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Nome do template' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Diretrizes para criação dos capítulos' })
  @IsString()
  guidelines: string;

  @ApiPropertyOptional({ description: 'Dados extraídos do template' })
  @IsOptional()
  @IsObject()
  extractedData?: any;
}

export class PhilosophyDto {
  @ApiProperty({ description: 'Conteúdo da filosofia' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Dados extraídos da filosofia' })
  @IsOptional()
  @IsObject()
  extractedData?: any;
}

export class BibliographyDto {
  @ApiProperty({ description: 'ID da bibliografia' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Título da bibliografia' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Autor da bibliografia' })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiProperty({ description: 'Assunto da bibliografia' })
  @IsString()
  subject: string;

  @ApiPropertyOptional({ description: 'URL do PDF (alternativa ao upload)' })
  @IsOptional()
  @IsUrl()
  pdfUrl?: string;

  @ApiPropertyOptional({ description: 'Conteúdo do PDF em base64 (alternativa à URL)' })
  @IsOptional()
  @IsString()
  pdfContent?: string;

  @ApiPropertyOptional({ description: 'Dados extraídos da bibliografia' })
  @IsOptional()
  @IsObject()
  extractedData?: any;
}

export class AiOptionsDto {
  @ApiPropertyOptional({ description: 'Modelo de IA a ser usado', example: 'gpt-4' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: 'Temperatura para geração', example: 0.7 })
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiPropertyOptional({ description: 'Número máximo de tokens', example: 4000 })
  @IsOptional()
  @IsNumber()
  maxTokens?: number;

  @ApiPropertyOptional({ description: 'Quebrar em capítulos para economizar', example: true })
  @IsOptional()
  @IsBoolean()
  breakIntoChapters?: boolean;

  @ApiPropertyOptional({ description: 'Incluir atividades', example: true })
  @IsOptional()
  @IsBoolean()
  includeActivities?: boolean;

  @ApiPropertyOptional({ description: 'Incluir avaliações', example: true })
  @IsOptional()
  @IsBoolean()
  includeAssessments?: boolean;

  // Campos legados para compatibilidade
  @ApiPropertyOptional({ description: 'Número máximo de tokens de resposta - LEGADO', example: 800 })
  @IsOptional()
  @IsNumber()
  maxResponseTokens?: number;

  @ApiPropertyOptional({ description: 'Modelo preferido - LEGADO', example: 'gpt-4o' })
  @IsOptional()
  @IsString()
  modelHint?: string;

  @ApiPropertyOptional({ description: 'Limita a quantidade de capítulos gerados - LEGADO' })
  @IsOptional()
  @IsNumber()
  maxChapters?: number;
}

export class MetadataDto {
  @ApiPropertyOptional({ description: 'Fonte da requisição', example: 'eduflow-backend' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: 'Timestamp da requisição' })
  @IsOptional()
  @IsString()
  timestamp?: string;

  @ApiPropertyOptional({ description: 'Versão da API', example: '1.0' })
  @IsOptional()
  @IsString()
  version?: string;

  // Campos legados para compatibilidade
  @ApiPropertyOptional({ description: 'Título do conteúdo - LEGADO' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Disciplina - LEGADO' })
  @IsOptional()
  @IsString()
  discipline?: string;

  @ApiPropertyOptional({ description: 'ID do curso - LEGADO' })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Idioma do conteúdo - LEGADO', example: 'pt-BR' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Tags do conteúdo - LEGADO', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class PolicyDto {
  @ApiPropertyOptional({ description: 'Termos obrigatórios', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredTerms?: string[];

  @ApiPropertyOptional({ description: 'Termos proibidos', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  forbiddenTerms?: string[];

  @ApiPropertyOptional({ description: 'Diretrizes de estilo', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  styleGuidelines?: string[];
}

export class OptionsDto {
  @ApiPropertyOptional({ description: 'Número máximo de tokens de resposta', example: 800 })
  @IsOptional()
  maxResponseTokens?: number;

  @ApiPropertyOptional({ description: 'Temperatura para geração', example: 0.2 })
  @IsOptional()
  temperature?: number;

  @ApiPropertyOptional({ description: 'Modelo preferido', example: 'gpt-4o' })
  @IsOptional()
  @IsString()
  modelHint?: string;

  @ApiPropertyOptional({ description: 'Limita a quantidade de capítulos gerados (somente modo livro)' })
  @IsOptional()
  maxChapters?: number;
}

export class ProcessRequestDto {
  @ApiProperty({ description: 'UUID de correlação (use o mesmo em todo o fluxo)' })
  @IsUUID()
  workflowId: string;

  @ApiPropertyOptional({ description: 'ID do autor' })
  @IsOptional()
  @IsString()
  authorId?: string;

  @ApiProperty({ description: 'Modo de execução', enum: ['sync', 'async'], default: 'sync' })
  @IsEnum(['sync', 'async'])
  mode: 'sync' | 'async' = 'sync';

  @ApiPropertyOptional({ description: 'URL de callback (apenas para async)' })
  @IsOptional()
  @IsUrl()
  callbackUrl?: string;

  @ApiPropertyOptional({ description: 'Dados do componente educacional' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ComponentDto)
  component?: ComponentDto;

  @ApiPropertyOptional({ description: 'Template com diretrizes para criação dos capítulos' })
  @IsOptional()
  @ValidateNested()
  @Type(() => TemplateDto)
  template?: TemplateDto;

  @ApiPropertyOptional({ description: 'Filosofia educacional (fixa em todos)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PhilosophyDto)
  philosophy?: PhilosophyDto;

  @ApiPropertyOptional({ description: 'Bibliografias para embasamento da IA', type: [BibliographyDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BibliographyDto)
  bibliographies?: BibliographyDto[];

  @ApiPropertyOptional({ description: 'Opções de IA' })
  @IsOptional()
  @ValidateNested()
  @Type(() => AiOptionsDto)
  options?: AiOptionsDto;

  @ApiPropertyOptional({ description: 'Metadados da requisição' })
  @IsOptional()
  @ValidateNested()
  @Type(() => MetadataDto)
  metadata?: MetadataDto;

  // Campos legados para compatibilidade
  @ApiPropertyOptional({ description: 'Conteúdo bruto (texto extraído do arquivo) - LEGADO' })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({ description: 'Políticas de conteúdo - LEGADO' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PolicyDto)
  policy?: PolicyDto;

  @ApiPropertyOptional({ description: 'Opções de execução - LEGADO' })
  @IsOptional()
  @ValidateNested()
  @Type(() => OptionsDto)
  legacyOptions?: OptionsDto;
}
