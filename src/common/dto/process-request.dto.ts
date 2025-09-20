import { IsString, IsOptional, IsEnum, IsObject, IsArray, ValidateNested, IsUUID, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MetadataDto {
  @ApiProperty({ description: 'Título do conteúdo' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Disciplina' })
  @IsString()
  discipline: string;

  @ApiProperty({ description: 'ID do curso' })
  @IsString()
  courseId: string;

  @ApiProperty({ description: 'Idioma do conteúdo', example: 'pt-BR' })
  @IsString()
  language: string;

  @ApiPropertyOptional({ description: 'Tags do conteúdo', type: [String] })
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

  @ApiProperty({ description: 'Conteúdo bruto (texto extraído do arquivo)' })
  @IsString()
  text: string;

  @ApiProperty({ description: 'Metadados do conteúdo' })
  @ValidateNested()
  @Type(() => MetadataDto)
  metadata: MetadataDto;

  @ApiPropertyOptional({ description: 'Políticas de conteúdo' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PolicyDto)
  policy?: PolicyDto;

  @ApiPropertyOptional({ description: 'Opções de execução' })
  @IsOptional()
  @ValidateNested()
  @Type(() => OptionsDto)
  options?: OptionsDto;
}
