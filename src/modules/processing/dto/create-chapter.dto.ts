import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsArray, IsBoolean, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateChapterDto {
    @ApiProperty({ description: 'UUID de correlação do curso' })
    @IsString()
    courseId: string;

    @ApiProperty({ description: 'Título do curso' })
    @IsString()
    courseTitle: string;

    @ApiProperty({ description: 'Descrição do curso' })
    @IsString()
    courseDescription: string;

    @ApiProperty({ description: 'Disciplina/Matéria' })
    @IsString()
    subject: string;

    @ApiProperty({ description: 'Nível educacional' })
    @IsString()
    educationalLevel: string;

    @ApiProperty({ description: 'Público-alvo' })
    @IsString()
    targetAudience: string;

    @ApiProperty({ description: 'Template escolhido' })
    @IsString()
    template: string;

    @ApiProperty({ description: 'Filosofia pedagógica' })
    @IsString()
    philosophy: string;

    @ApiPropertyOptional({ description: 'Capítulo anterior (para continuidade)' })
    @IsOptional()
    @IsString()
    previousChapter?: string;

    @ApiPropertyOptional({ description: 'Número do capítulo a ser criado' })
    @IsOptional()
    @IsNumber()
    chapterNumber?: number;

    @ApiPropertyOptional({ description: 'Bibliografias em PDF (base64)' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    pdfBibliographies?: string[];

    @ApiPropertyOptional({ description: 'URLs de PDFs para download e processamento' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    pdfUrls?: string[];

    @ApiPropertyOptional({ description: 'Opções de IA' })
    @IsOptional()
    @IsObject()
    aiOptions?: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
        includeActivities?: boolean;
        includeAssessments?: boolean;
    };

    @ApiPropertyOptional({ description: 'Contexto adicional' })
    @IsOptional()
    @IsString()
    additionalContext?: string;
}

export class ContinueChapterDto {
    @ApiProperty({ description: 'UUID do capítulo existente' })
    @IsString()
    chapterId: string;

    @ApiProperty({ description: 'Tipo de continuação', enum: ['expand', 'add_section', 'add_activities', 'add_assessments'] })
    @IsEnum(['expand', 'add_section', 'add_activities', 'add_assessments'])
    continueType: 'expand' | 'add_section' | 'add_activities' | 'add_assessments';

    @ApiPropertyOptional({ description: 'Seção específica para expandir' })
    @IsOptional()
    @IsString()
    sectionId?: string;

    @ApiPropertyOptional({ description: 'Contexto adicional' })
    @IsOptional()
    @IsString()
    additionalContext?: string;
}

export class ChapterResponseDto {
    @ApiProperty({ description: 'ID do capítulo' })
    id: string;

    @ApiProperty({ description: 'ID do curso' })
    courseId: string;

    @ApiProperty({ description: 'Número do capítulo' })
    chapterNumber: number;

    @ApiProperty({ description: 'Título do capítulo' })
    title: string;

    @ApiProperty({ description: 'Conteúdo principal do capítulo' })
    content: string;

    @ApiProperty({ description: 'Seções do capítulo' })
    sections: {
        id: string;
        title: string;
        content: string;
        type: string;
        subsections?: any[];
        activities?: any[];
        assessments?: any[];
    }[];

    @ApiProperty({ description: 'Status do capítulo' })
    status: 'draft' | 'generated' | 'edited' | 'completed';

    @ApiProperty({ description: 'Data de criação' })
    createdAt: string;

    @ApiProperty({ description: 'Data de atualização' })
    updatedAt: string;

    @ApiProperty({ description: 'Métricas de qualidade' })
    metrics: {
        readabilityScore: number;
        durationMin: number;
        coverage: number;
    };

    @ApiProperty({ description: 'Sugestões de melhoria' })
    suggestions: string[];

    @ApiProperty({ description: 'Pode continuar?' })
    canContinue: boolean;

    @ApiProperty({ description: 'Tipos de continuação disponíveis' })
    availableContinueTypes: string[];
}
