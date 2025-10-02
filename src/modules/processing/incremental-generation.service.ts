import { Injectable, Logger } from '@nestjs/common';
import { CreateChapterDto, ContinueChapterDto, ChapterResponseDto } from './dto/create-chapter.dto';
import { PromptBuilderService } from '../prompt-builder/prompt-builder.service';
import { IaProviderService } from '../ia-provider/ia-provider.service';
import { MetricsService } from '../metrics/metrics.service';
import { LoggingService } from '../logging/logging.service';
import { PdfProcessorService } from '../pdf-processor/pdf-processor.service';

@Injectable()
export class IncrementalGenerationService {
    private readonly logger = new Logger(IncrementalGenerationService.name);
    private readonly courseStorage = new Map<string, any>();
    private readonly chapterStorage = new Map<string, ChapterResponseDto>();

    constructor(
        private readonly promptBuilderService: PromptBuilderService,
        private readonly iaProviderService: IaProviderService,
        private readonly metricsService: MetricsService,
        private readonly loggingService: LoggingService,
        private readonly pdfProcessorService: PdfProcessorService,
    ) { }

    /**
     * Cria um novo capítulo para um curso
     */
    async createChapter(createChapterDto: CreateChapterDto): Promise<ChapterResponseDto> {
        const startTime = Date.now();
        const chapterId = this.generateId();
        const chapterNumber = createChapterDto.chapterNumber || 1;

        this.logger.log(`Criando capítulo ${chapterNumber} para curso ${createChapterDto.courseId}`);

        try {
            // 1. Processar URLs de PDF se fornecidas
            let pdfContent = '';
            if (createChapterDto.pdfUrls && createChapterDto.pdfUrls.length > 0) {
                this.logger.log(`Processando ${createChapterDto.pdfUrls.length} URLs de PDF`);
                const pdfResults = await this.pdfProcessorService.processPdfUrls(createChapterDto.pdfUrls);

                if (pdfResults.success) {
                    pdfContent = this.formatPdfContent(pdfResults);
                    this.logger.log(`PDFs processados: ${pdfResults.successCount} sucessos, ${pdfResults.errorCount} erros`);
                } else {
                    this.logger.warn('Nenhum PDF foi processado com sucesso');
                }
            }

            // 2. Preparar contexto do curso
            const courseContext = await this.prepareCourseContext(createChapterDto);

            // 3. Gerar prompt específico para o capítulo (incluindo conteúdo dos PDFs)
            const prompt = this.buildChapterPrompt(createChapterDto, courseContext, pdfContent);

            // 4. Processar com IA
            const aiResponse = await this.iaProviderService.processPrompt(prompt, {
                model: createChapterDto.aiOptions?.model || 'gpt-4',
                maxTokens: createChapterDto.aiOptions?.maxTokens || 8000,
                temperature: createChapterDto.aiOptions?.temperature || 0.7,
            });

            // 5. Parsear resposta e criar estrutura do capítulo
            const chapter = await this.parseChapterResponse(aiResponse.content, chapterId, chapterNumber, createChapterDto);

            // 6. Salvar capítulo
            this.chapterStorage.set(chapterId, chapter);

            // 7. Atualizar contexto do curso
            this.updateCourseContext(createChapterDto.courseId, chapter);

            // 8. Registrar métricas
            const duration = Date.now() - startTime;
            this.metricsService.recordRequestDuration('POST', '/create-chapter', duration);
            this.metricsService.recordTokensUsed(aiResponse.metadata.model, 'input', aiResponse.metadata.tokensIn);
            this.metricsService.recordTokensUsed(aiResponse.metadata.model, 'output', aiResponse.metadata.tokensOut);
            this.metricsService.recordCost(aiResponse.metadata.model, aiResponse.metadata.costUsd);

            this.logger.log(`Capítulo ${chapterNumber} criado com sucesso em ${duration}ms`);
            return chapter;

        } catch (error) {
            this.logger.error(`Erro ao criar capítulo: ${error.message}`);

            // Fallback local
            return this.createFallbackChapter(chapterId, chapterNumber, createChapterDto);
        }
    }

    /**
     * Continua/expande um capítulo existente
     */
    async continueChapter(continueChapterDto: ContinueChapterDto): Promise<ChapterResponseDto> {
        const startTime = Date.now();

        this.logger.log(`Continuando capítulo ${continueChapterDto.chapterId} - Tipo: ${continueChapterDto.continueType}`);

        try {
            // 1. Buscar capítulo existente
            const existingChapter = this.chapterStorage.get(continueChapterDto.chapterId);
            if (!existingChapter) {
                throw new Error('Capítulo não encontrado');
            }

            // 2. Gerar prompt de continuação
            const prompt = this.buildContinuePrompt(existingChapter, continueChapterDto);

            // 3. Processar com IA
            const aiResponse = await this.iaProviderService.processPrompt(prompt, {
                model: 'gpt-4',
                maxTokens: 3000,
                temperature: 0.7,
            });

            // 4. Aplicar continuação ao capítulo
            const updatedChapter = await this.applyContinue(existingChapter, aiResponse.content, continueChapterDto);

            // 5. Salvar capítulo atualizado
            this.chapterStorage.set(continueChapterDto.chapterId, updatedChapter);

            // 6. Registrar métricas
            const duration = Date.now() - startTime;
            this.metricsService.recordRequestDuration('POST', '/continue-chapter', duration);

            this.logger.log(`Capítulo continuado com sucesso em ${duration}ms`);
            return updatedChapter;

        } catch (error) {
            this.logger.error(`Erro ao continuar capítulo: ${error.message}`);
            throw error;
        }
    }

    /**
     * Lista capítulos de um curso
     */
    async getCourseChapters(courseId: string): Promise<ChapterResponseDto[]> {
        const chapters = Array.from(this.chapterStorage.values())
            .filter(chapter => chapter.courseId === courseId)
            .sort((a, b) => a.chapterNumber - b.chapterNumber);

        return chapters;
    }

    /**
     * Obtém um capítulo específico
     */
    async getChapter(chapterId: string): Promise<ChapterResponseDto> {
        const chapter = this.chapterStorage.get(chapterId);
        if (!chapter) {
            throw new Error('Capítulo não encontrado');
        }
        return chapter;
    }

    /**
     * Prepara contexto do curso
     */
    private async prepareCourseContext(createChapterDto: CreateChapterDto): Promise<any> {
        const courseId = createChapterDto.courseId;

        if (!this.courseStorage.has(courseId)) {
            this.courseStorage.set(courseId, {
                id: courseId,
                title: createChapterDto.courseTitle,
                description: createChapterDto.courseDescription,
                subject: createChapterDto.subject,
                educationalLevel: createChapterDto.educationalLevel,
                targetAudience: createChapterDto.targetAudience,
                template: createChapterDto.template,
                philosophy: createChapterDto.philosophy,
                chapters: [],
                createdAt: new Date().toISOString(),
            });
        }

        return this.courseStorage.get(courseId);
    }

    /**
     * Extrai resumo conciso do capítulo anterior
     */
    private extractChapterSummary(previousChapter: string): string {
        try {
            // Tenta extrair o JSON do capítulo anterior
            const jsonMatch = previousChapter.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const chapterData = JSON.parse(jsonMatch[0]);
                const title = chapterData.title || 'Capítulo anterior';

                // Extrai apenas a conclusão/recapitulação se existir
                const recapSection = chapterData.sections?.find(s => s.type === 'recapping');
                if (recapSection && recapSection.content) {
                    return `**${title}**: ${recapSection.content.substring(0, 200)}...`;
                }

                // Se não tem recapitulação, usa uma descrição muito breve
                return `**${title}**: Capítulo anterior concluído, estabelecendo base para continuidade.`;
            }
        } catch (error) {
            // Se não conseguir parsear, cria resumo genérico
        }

        // Fallback: resumo muito conciso
        return `**Capítulo anterior**: Base teórica estabelecida, seguindo para próximo tema.`;
    }

    /**
     * Constrói prompt específico para criação de capítulo
     */
    private buildChapterPrompt(createChapterDto: CreateChapterDto, courseContext: any, pdfContent?: string): string {
        const chapterNumber = createChapterDto.chapterNumber || 1;
        const previousChapter = createChapterDto.previousChapter;

        let prompt = `
# Criação de Capítulo Didático - Capítulo ${chapterNumber}

## Contexto do Curso
- **Título**: ${createChapterDto.courseTitle}
- **Descrição**: ${createChapterDto.courseDescription}
- **Disciplina**: ${createChapterDto.subject}
- **Nível**: ${createChapterDto.educationalLevel}
- **Público-alvo**: ${createChapterDto.targetAudience}

## Template e Filosofia
- **Template**: ${createChapterDto.template}
- **Filosofia**: ${createChapterDto.philosophy}

## Capítulo a Ser Criado
- **Número**: ${chapterNumber}
- **Tema Específico**: ${createChapterDto.additionalContext || 'Primeiro capítulo'}
- **IMPORTANTE**: Este é o capítulo ${chapterNumber}, deve ser ÚNICO e específico para o tema "${createChapterDto.additionalContext}". NÃO repetir conteúdo de outros capítulos.

## Estrutura Obrigatória
1. **Contextualizando** - Exemplos do Maranhão
2. **Conectando** - Conexões interdisciplinares
3. **Aprofundando** - Conteúdo técnico específico
4. **Praticando** - 3-5 atividades detalhadas
5. **Recapitulando** - Síntese dos pontos principais
6. **Exercitando** - 8-15 questões com feedback

`;

        // Adicionar conteúdo dos PDFs se disponível
        if (pdfContent) {
            prompt += `
## Bibliografia
${pdfContent}

`;
        }

        if (previousChapter) {
            const previousSummary = this.extractChapterSummary(previousChapter);
            prompt += `
## Capítulo Anterior (Resumo para Continuidade)
${previousSummary}

**IMPORTANTE**: Use apenas para continuidade. Crie conteúdo COMPLETAMENTE NOVO para "${createChapterDto.additionalContext}".
`;
        }

        prompt += `
## Diretrizes CRÍTICAS
- **Foco EXCLUSIVO**: Desenvolver APENAS o tema "${createChapterDto.additionalContext}" - Capítulo ${chapterNumber}
- **Unicidade**: Este capítulo deve ser COMPLETAMENTE DIFERENTE de qualquer outro
- **Maranhão**: Incluir exemplos práticos regionais específicos da disciplina
- **Acessível**: Linguagem clara para EPT, sem jargão técnico desnecessário
- **Atividades**: 3-5 práticas detalhadas com passos claros
- **Avaliações**: 8-15 questões com feedback explicativo

### O Que FAZER:
- Criar conteúdo específico para "${createChapterDto.additionalContext}"
- Usar exemplos únicos do Maranhão relacionados ao tema
- Desenvolver atividades práticas específicas do tema
- Criar questões que testem conhecimento específico do capítulo

### O Que NÃO FAZER:
- Repetir conteúdo de outros capítulos
- Usar exemplos genéricos
- Criar atividades vagas ou superficiais
- Copiar estruturas de outros capítulos

## JSON Esperado
{
  "id": "chapter_[timestamp]_[random]",
  "courseId": "[courseId]",
  "chapterNumber": [número],
  "title": "Capítulo ${chapterNumber}: ${createChapterDto.additionalContext}",
  "content": "[Conteúdo completo em markdown]",
  "sections": [
    {
      "id": "section-1",
      "title": "Contextualizando",
      "content": "[Conteúdo específico da disciplina com exemplos do Maranhão]",
      "type": "contextualizing",
      "activities": []
    },
    {
      "id": "section-2",
      "title": "Conectando", 
      "content": "[Conteúdo com conexões interdisciplinares]",
      "type": "connecting",
      "activities": []
    },
    {
      "id": "section-3",
      "title": "Aprofundando",
      "content": "[Conteúdo técnico específico e detalhado]",
      "type": "deepening",
      "activities": []
    },
    {
      "id": "section-4",
      "title": "Praticando",
      "content": "[Conteúdo da seção]",
      "type": "practicing",
      "activities": [
        {
          "title": "Atividade 1: [Nome específico]",
          "description": "[Descrição detalhada]",
          "steps": ["Passo 1", "Passo 2", "Passo 3"],
          "resources": ["Recurso 1", "Recurso 2"]
        }
      ]
    },
    {
      "id": "section-5",
      "title": "Recapitulando",
      "content": "[Síntese dos pontos principais]",
      "type": "recapping",
      "activities": []
    },
    {
      "id": "section-6",
      "title": "Exercitando",
      "content": "[Conteúdo da seção]",
      "type": "exercising",
      "activities": [
        {
          "question": "Questão 1: [Pergunta específica]",
          "options": ["A) Opção A", "B) Opção B", "C) Opção C", "D) Opção D"],
          "correct": "A",
          "explanation": "Explicação detalhada da resposta"
        }
      ]
    }
  ],
  "status": "generated",
  "createdAt": "[timestamp]",
  "updatedAt": "[timestamp]",
  "metrics": {
    "readabilityScore": 75,
    "durationMin": 2,
    "coverage": 80
  },
  "suggestions": [
    "Sugestão 1",
    "Sugestão 2"
  ],
  "canContinue": true,
  "availableContinueTypes": ["expand", "add_section", "add_activities"]
}

CRIAR CAPÍTULO ${chapterNumber} ÚNICO E ESPECÍFICO PARA O TEMA: "${createChapterDto.additionalContext}"

Este capítulo deve ser COMPLETAMENTE DIFERENTE de qualquer outro capítulo. Foque EXCLUSIVAMENTE no tema especificado e crie conteúdo original e específico.
`;

        return prompt;
    }

    /**
     * Constrói prompt para continuação de capítulo
     */
    private buildContinuePrompt(existingChapter: ChapterResponseDto, continueChapterDto: ContinueChapterDto): string {
        let prompt = `
# Continuação de Capítulo Educacional

## Capítulo Existente
- **Título**: ${existingChapter.title}
- **Conteúdo Atual**: ${existingChapter.content}

## Seções Existentes
${existingChapter.sections.map(section => `- ${section.title}: ${section.content.substring(0, 200)}...`).join('\n')}

## Tipo de Continuação
${continueChapterDto.continueType}

## Contexto Adicional
${continueChapterDto.additionalContext || 'Expandir o conteúdo existente'}

## Instruções
`;

        switch (continueChapterDto.continueType) {
            case 'expand':
                prompt += `
Expanda o conteúdo do capítulo adicionando mais detalhes, exemplos e explicações. Mantenha a estrutura existente mas torne o conteúdo mais rico e completo.
`;
                break;
            case 'add_section':
                prompt += `
Adicione uma nova seção ao capítulo que complemente o conteúdo existente. A seção deve seguir a estrutura do template e se integrar naturalmente ao capítulo.
`;
                break;
            case 'add_activities':
                prompt += `
Adicione atividades práticas ao capítulo. As atividades devem ser relevantes para o conteúdo e adequadas ao público-alvo.
`;
                break;
            case 'add_assessments':
                prompt += `
Adicione critérios de avaliação e exercícios ao capítulo. Inclua diferentes tipos de avaliação (formativa, somativa, etc.).
`;
                break;
        }

        prompt += `
Retorne apenas o JSON com a estrutura atualizada do capítulo, incluindo as novas adições.
`;

        return prompt;
    }

    /**
     * Parseia resposta da IA e cria estrutura do capítulo
     */
    private async parseChapterResponse(aiContent: string, chapterId: string, chapterNumber: number, createChapterDto: CreateChapterDto): Promise<ChapterResponseDto> {
        try {
            const parsed = JSON.parse(aiContent);

            return {
                id: chapterId,
                courseId: createChapterDto.courseId,
                chapterNumber,
                title: parsed.title || `Capítulo ${chapterNumber}`,
                content: parsed.content || '',
                sections: parsed.sections || [],
                status: 'generated',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                metrics: {
                    readabilityScore: 75,
                    durationMin: parsed.estimatedDuration || 2,
                    coverage: 80,
                },
                suggestions: [
                    'Considere adicionar mais exemplos práticos',
                    'Inclua atividades de fixação',
                    'Adicione avaliações formativas'
                ],
                canContinue: parsed.canContinue || true,
                availableContinueTypes: parsed.availableContinueTypes || ['expand', 'add_section', 'add_activities'],
            };
        } catch (error) {
            this.logger.warn('Erro ao parsear resposta da IA, usando fallback');
            return this.createFallbackChapter(chapterId, chapterNumber, createChapterDto);
        }
    }

    /**
     * Aplica continuação ao capítulo existente
     */
    private async applyContinue(existingChapter: ChapterResponseDto, aiContent: string, continueChapterDto: ContinueChapterDto): Promise<ChapterResponseDto> {
        try {
            const parsed = JSON.parse(aiContent);

            const updatedChapter = { ...existingChapter };
            updatedChapter.updatedAt = new Date().toISOString();

            switch (continueChapterDto.continueType) {
                case 'expand':
                    updatedChapter.content = parsed.content || existingChapter.content;
                    break;
                case 'add_section':
                    if (parsed.sections) {
                        updatedChapter.sections = [...existingChapter.sections, ...parsed.sections];
                    }
                    break;
                case 'add_activities':
                    if (parsed.activities) {
                        updatedChapter.sections.forEach(section => {
                            if (!section.activities) section.activities = [];
                            section.activities.push(...parsed.activities);
                        });
                    }
                    break;
                case 'add_assessments':
                    if (parsed.assessments) {
                        updatedChapter.sections.forEach(section => {
                            if (!section.assessments) section.assessments = [];
                            section.assessments.push(...parsed.assessments);
                        });
                    }
                    break;
            }

            return updatedChapter;
        } catch (error) {
            this.logger.warn('Erro ao aplicar continuação, retornando capítulo original');
            return existingChapter;
        }
    }

    /**
     * Cria capítulo de fallback
     */
    private createFallbackChapter(chapterId: string, chapterNumber: number, createChapterDto: CreateChapterDto): ChapterResponseDto {
        return {
            id: chapterId,
            courseId: createChapterDto.courseId,
            chapterNumber,
            title: `Capítulo ${chapterNumber}: ${this.generateChapterTitle(createChapterDto.subject, chapterNumber)}`,
            content: this.generateFallbackContent(createChapterDto, chapterNumber),
            sections: this.generateFallbackSections(createChapterDto, chapterNumber),
            status: 'generated',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metrics: {
                readabilityScore: 70,
                durationMin: 2,
                coverage: 75,
            },
            suggestions: [
                'Considere adicionar mais exemplos práticos',
                'Inclua atividades de fixação',
                'Adicione avaliações formativas'
            ],
            canContinue: true,
            availableContinueTypes: ['expand', 'add_section', 'add_activities'],
        };
    }

    /**
     * Gera título do capítulo baseado na disciplina
     */
    private generateChapterTitle(subject: string, chapterNumber: number): string {
        const subjects = {
            'bioquimica': ['Introdução à Bioquímica', 'Biomoléculas', 'Metabolismo', 'Enzimas', 'Bioenergética'],
            'matematica': ['Números e Operações', 'Geometria', 'Álgebra', 'Estatística', 'Probabilidade'],
            'historia': ['Introdução à História', 'Períodos Históricos', 'Civilizações', 'Revoluções', 'História Contemporânea'],
            'ciencias': ['Método Científico', 'Física Básica', 'Química', 'Biologia', 'Meio Ambiente'],
            'empreendedorismo': [
                'Fundamentos do Empreendedorismo',
                'Identificação de Oportunidades',
                'Planejamento de Negócios',
                'Marketing e Vendas',
                'Gestão Financeira'
            ]
        };

        const chapterTitles = subjects[subject.toLowerCase()] || ['Introdução', 'Desenvolvimento', 'Aplicação', 'Avaliação', 'Conclusão'];
        return chapterTitles[chapterNumber - 1] || `Tópico ${chapterNumber}`;
    }

    /**
     * Gera conteúdo de fallback
     */
    private generateFallbackContent(createChapterDto: CreateChapterDto, chapterNumber: number): string {
        const title = this.generateChapterTitle(createChapterDto.subject, chapterNumber);

        return `
# ${title}

## Introdução
Este capítulo aborda os conceitos fundamentais relacionados ao tema "${createChapterDto.subject}", proporcionando uma base sólida para o aprendizado de estudantes do ${createChapterDto.educationalLevel}.

## Conteúdo Principal
Baseado na filosofia educacional "${createChapterDto.philosophy}", este conteúdo foi desenvolvido para atender ao público-alvo: ${createChapterDto.targetAudience}.

## Aplicação Prática
Os conceitos apresentados serão aplicados através de exemplos práticos e atividades interativas, seguindo a metodologia ativa de aprendizagem e considerando o contexto do Maranhão.

## Conclusão
Este capítulo estabelece as bases para os próximos tópicos, garantindo uma progressão adequada do aprendizado e o desenvolvimento das competências necessárias.
    `.trim();
    }

    /**
     * Gera seções de fallback
     */
    private generateFallbackSections(createChapterDto: CreateChapterDto, chapterNumber: number): any[] {
        return [
            {
                id: 'section-1',
                title: 'Contextualizando',
                content: 'Contexto e introdução ao tema do capítulo.',
                type: 'contextualizing',
                subsections: [],
                activities: []
            },
            {
                id: 'section-2',
                title: 'Aprofundando',
                content: 'Desenvolvimento dos conceitos principais.',
                type: 'deepening',
                subsections: [],
                activities: []
            },
            {
                id: 'section-3',
                title: 'Praticando',
                content: 'Atividades práticas e exercícios.',
                type: 'practicing',
                subsections: [],
                activities: []
            }
        ];
    }

    /**
     * Atualiza contexto do curso
     */
    private updateCourseContext(courseId: string, chapter: ChapterResponseDto): void {
        const course = this.courseStorage.get(courseId);
        if (course) {
            course.chapters.push(chapter);
            course.updatedAt = new Date().toISOString();
            this.courseStorage.set(courseId, course);
        }
    }

    /**
     * Gera ID único
     */
    private generateId(): string {
        return `chapter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Formata conteúdo dos PDFs para incluir no prompt
     */
    private formatPdfContent(pdfResults: any): string {
        let content = '### Bibliografia Processada\n\n';

        pdfResults.results.forEach((result: any, index: number) => {
            if (result.success) {
                content += `**PDF ${index + 1}**: ${result.url}\n`;
                content += `- Tamanho: ${(result.size! / 1024 / 1024).toFixed(2)} MB\n`;
                content += `- Status: ✅ Processado com sucesso\n\n`;

                // Adicionar conteúdo extraído se disponível
                if (result.content) {
                    content += `**Conteúdo extraído**:\n`;
                    content += `[PDF recebido e processado - ${result.size} bytes]\n\n`;
                }
            } else {
                content += `**PDF ${index + 1}**: ${result.url}\n`;
                content += `- Status: ❌ Erro: ${result.error}\n\n`;
            }
        });

        content += `**Resumo**: ${pdfResults.successCount} PDFs processados com sucesso de ${pdfResults.results.length} URLs fornecidas.\n`;
        content += `**Tamanho total**: ${(pdfResults.totalSize / 1024 / 1024).toFixed(2)} MB\n\n`;

        return content;
    }
}
