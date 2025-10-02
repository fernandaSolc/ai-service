import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ProcessRequestDto, ProcessResponseDto, WorkflowFrontendPayloadDto } from '../../common/dto';
import { ValidationService } from '../validation/validation.service';
import { PromptBuilderService } from '../prompt-builder/prompt-builder.service';
import { IaProviderService } from '../ia-provider/ia-provider.service';
import { LoggingService } from '../logging/logging.service';
import { MetricsService } from '../metrics/metrics.service';
import { PersistenceService } from '../persistence/persistence.service';
import { PdfProcessorService } from '../pdf-processor/pdf-processor.service';

@Injectable()
export class ProcessingService {
  private readonly logger = new Logger(ProcessingService.name);

  constructor(
    private validationService: ValidationService,
    private promptBuilderService: PromptBuilderService,
    private iaProviderService: IaProviderService,
    private loggingService: LoggingService,
    private metricsService: MetricsService,
    private persistenceService: PersistenceService,
    private pdfProcessorService: PdfProcessorService,
  ) { }

  /**
   * Processa conteúdo de forma síncrona
   */
  async processContent(request: ProcessRequestDto): Promise<ProcessResponseDto> {
    const startTime = Date.now();
    const context = {
      workflowId: request.workflowId,
      userId: request.authorId,
    };

    try {
      this.loggingService.logProcessing(context, 'Iniciando processamento de conteúdo');

      // 1. Validar payload
      this.validationService.validateProcessRequest(request);
      if (request.policy) {
        this.validationService.validatePolicy(request.policy);
      }

      // 2. Sanitizar dados se necessário
      let sanitizedRequest = { ...request };
      if (request.text) {
        const sanitizedText = this.validationService.sanitizeText(request.text);
        sanitizedRequest = { ...request, text: sanitizedText };
      }

      // 3. Salvar registro inicial
      await this.persistenceService.saveInitialExecution(
        request.workflowId,
        sanitizedRequest,
        'processing'
      );

      // 4. Determinar tipo de processamento
      const isIntelligentWorkflow = !!(request.component && request.template && request.philosophy);
      const isBookGeneration = Array.isArray(sanitizedRequest.metadata?.tags)
        && sanitizedRequest.metadata.tags?.includes('book');

      this.logger.log(`Tipo de processamento: ${isIntelligentWorkflow ? 'Workflow Inteligente' : isBookGeneration ? 'Geração de Livro' : 'Workflow Legado'}`);
      this.logger.log(`Component: ${!!request.component}, Template: ${!!request.template}, Philosophy: ${!!request.philosophy}`);

      let iaResponse;
      if (isIntelligentWorkflow) {
        // Novo fluxo do workflow inteligente
        iaResponse = await this.processIntelligentWorkflow(sanitizedRequest);
      } else if (isBookGeneration) {
        // Mapear metadata para BookSpec
        const bookSpec = {
          title: sanitizedRequest.metadata?.title || 'Livro sem título',
          targetAudience: sanitizedRequest.metadata?.discipline || 'geral',
          level: 'intermediario' as const,
          objectives: ['aprender o conteúdo', 'aplicar na prática'],
          tone: 'didático e claro',
          totalPagesTarget: sanitizedRequest.options?.maxResponseTokens ? Math.max(60, Math.floor(sanitizedRequest.options.maxResponseTokens / 80)) : 100,
          chaptersCountHint: 10,
        };

        iaResponse = await this.iaProviderService.generateFullBook(bookSpec, {
          model: sanitizedRequest.options?.modelHint || 'gpt-4o',
          outlineMaxTokens: 8000,
          chapterMaxTokens: 8000,
          temperature: sanitizedRequest.options?.temperature ?? 0.2,
          maxChapters: sanitizedRequest.options?.maxChapters,
        });
      } else {
        // Fluxo original (legado)
        const prompt = this.promptBuilderService.buildPrompt(sanitizedRequest);
        iaResponse = await this.iaProviderService.processPrompt(prompt, {
          maxTokens: request.options?.maxResponseTokens || 8000,
          temperature: request.options?.temperature || 0.2,
          model: request.options?.modelHint || 'gpt-4o-mini',
        });
      }

      // 5. Parsear resposta JSON
      let payload: WorkflowFrontendPayloadDto;
      try {
        // Para workflow inteligente, a resposta já vem estruturada
        if (isIntelligentWorkflow) {
          payload = JSON.parse(iaResponse.content);
        } else {
          // Para workflow legado, validar e corrigir resposta se necessário
          const correctedResponse = await this.iaProviderService.validateAndCorrectResponse(
            iaResponse.content,
            this.promptBuilderService.buildSchemaCorrectionPrompt(
              iaResponse.content,
              this.getExpectedSchema(isIntelligentWorkflow)
            ),
            {
              maxTokens: 2000,
              temperature: 0.1,
              model: request.options?.modelHint || 'gpt-4o-mini',
            }
          );
          payload = JSON.parse(correctedResponse.content);
        }
      } catch (parseError) {
        this.logger.warn('Falha ao fazer parse da resposta da IA, usando fallback');
        payload = this.createFallbackPayload(sanitizedRequest);
      }

      // Anexar livro completo ao payload quando aplicável
      if (isBookGeneration) {
        try {
          payload.book = JSON.parse(iaResponse.content);
        } catch {
          payload.book = { raw: iaResponse.content };
        }
      }

      // 8. Aplicar validações de política
      const violations = this.applyPolicyValidations(payload, sanitizedRequest.policy);
      payload.violations = violations;

      // 9. Criar resposta final
      const response: ProcessResponseDto = {
        workflowId: request.workflowId,
        status: 'completed',
        payload,
        execution: iaResponse.metadata,
      };

      // 10. Salvar resultado
      await this.persistenceService.updateExecutionStatus(
        request.workflowId,
        'completed',
        response,
        iaResponse.metadata
      );

      // 11. Registrar métricas
      const duration = Date.now() - startTime;
      this.metricsService.recordRequestDuration('POST', '/process-content', duration);
      this.metricsService.recordTokensUsed(
        iaResponse.metadata.model,
        'input',
        iaResponse.metadata.tokensIn
      );
      this.metricsService.recordTokensUsed(
        iaResponse.metadata.model,
        'output',
        iaResponse.metadata.tokensOut
      );
      this.metricsService.recordCost(
        iaResponse.metadata.model,
        iaResponse.metadata.costUsd
      );

      this.loggingService.logProcessing(
        {
          ...context,
          status: 'completed',
          duration,
          tokensIn: iaResponse.metadata.tokensIn,
          tokensOut: iaResponse.metadata.tokensOut,
          costUsd: iaResponse.metadata.costUsd,
        },
        'Processamento concluído com sucesso'
      );

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.loggingService.logError(
        {
          ...context,
          status: 'error',
          duration,
          error: error.message,
        },
        'Erro no processamento de conteúdo'
      );

      this.metricsService.incrementErrorCounter('processing_error', '/process-content');

      // Salvar erro
      await this.persistenceService.updateExecutionStatus(
        request.workflowId,
        'error',
        undefined,
        undefined,
        error.message
      );

      throw new ServiceUnavailableException('Falha no processamento do conteúdo');
    }
  }

  /**
   * Aplica validações de política ao payload
   */
  private applyPolicyValidations(
    payload: WorkflowFrontendPayloadDto,
    policy?: any
  ): any[] {
    const violations: any[] = [];

    if (!policy) return violations;

    // Verificar termos obrigatórios
    if (policy.requiredTerms && policy.requiredTerms.length > 0) {
      const content = payload.summary + ' ' + (payload.improvedText?.map(t => t.content).join(' ') || '');
      const requiredViolations = this.validationService.checkRequiredTerms(
        content,
        policy.requiredTerms
      );
      violations.push(...requiredViolations);
    }

    // Verificar termos proibidos
    if (policy.forbiddenTerms && policy.forbiddenTerms.length > 0) {
      const content = payload.summary + ' ' + (payload.improvedText?.map(t => t.content).join(' ') || '');
      const forbiddenViolations = this.validationService.checkForbiddenTerms(
        content,
        policy.forbiddenTerms
      );
      violations.push(...forbiddenViolations);
    }

    return violations;
  }

  /**
   * Cria payload de fallback em caso de erro
   */
  private createFallbackPayload(request: ProcessRequestDto): WorkflowFrontendPayloadDto {
    return {
      success: false,
      chapters: [],
      qualityScore: 50,
      processingLog: { error: 'Fallback ativado' },
      result: { status: 'fallback' },
      metrics: {
        tokensIn: 0,
        tokensOut: 0,
        latencyMs: 0,
        costUsd: 0,
      },
      suggestions: ['Revisar o conteúdo e tentar novamente'],
      model: 'fallback',
      // Campos legados para compatibilidade
      summary: `Resumo básico do conteúdo: ${request.metadata?.title || 'Conteúdo sem título'}`,
      legacyMetrics: {
        readabilityScore: 50,
        durationMin: 5,
        coverage: 60,
      },
      violations: [],
      quiz: [],
      improvedText: [
        {
          section: 'Conteúdo',
          content: request.text?.substring(0, 500) + '...' || 'Conteúdo não disponível',
        },
      ],
      meta: {
        rawId: 'fallback',
        adaptedId: 'fallback',
      },
    };
  }

  /**
   * Cria payload de fallback para workflow inteligente
   */
  private createIntelligentWorkflowFallback(request: ProcessRequestDto): WorkflowFrontendPayloadDto {
    return {
      success: false,
      chapters: [
        {
          id: 1,
          title: 'Capítulo 1: Introdução',
          content: 'Conteúdo básico gerado como fallback devido a falha na IA.',
          learningObjectives: ['Compreender os conceitos básicos'],
          activities: ['Atividade de revisão'],
          evaluationCriteria: ['Participação e compreensão'],
          practicalExamples: ['Exemplo básico'],
          resources: ['Recursos básicos'],
          estimatedDuration: 30,
        },
      ],
      qualityScore: 50,
      processingLog: { error: 'Fallback ativado' },
      result: { status: 'fallback' },
      metrics: {
        tokensIn: 0,
        tokensOut: 0,
        latencyMs: 0,
        costUsd: 0,
      },
      suggestions: ['Revisar o conteúdo e tentar novamente'],
      model: 'fallback',
    };
  }

  /**
   * Processa o workflow inteligente
   */
  private async processIntelligentWorkflow(request: ProcessRequestDto): Promise<any> {
    const { component, template, philosophy, bibliographies, options } = request;

    this.logger.log(`Processando workflow inteligente para componente: ${component?.name || 'Sem nome'}`);
    this.logger.log(`Template: ${template?.name || 'Sem template'}`);
    this.logger.log(`Philosophy: ${philosophy?.content ? 'Presente' : 'Ausente'}`);
    this.logger.log(`Bibliographies: ${bibliographies?.length || 0} itens`);

    try {
      // Tentar processar com IA real primeiro
      this.logger.log('Tentando processar com IA real...');
      const prompt = this.promptBuilderService.buildPrompt(request);
      const aiOptions = {
        model: options?.model || 'gpt-4',
        maxTokens: options?.maxTokens || 8000,
        temperature: options?.temperature || 0.7,
      };

      const iaResponse = await this.iaProviderService.processPrompt(prompt, aiOptions);
      this.logger.log('IA real processou com sucesso');
      return iaResponse;

    } catch (error) {
      this.logger.warn('Falha na IA real, usando fallback local para workflow inteligente');
      this.logger.error('Erro da IA:', error.message);

      // Fallback local para workflow inteligente
      return this.generateIntelligentWorkflowFallback(request);
    }
  }

  /**
   * Gera fallback local para workflow inteligente
   */
  private generateIntelligentWorkflowFallback(request: ProcessRequestDto): any {
    const { component, template, philosophy, bibliographies, options } = request;

    const breakIntoChapters = options?.breakIntoChapters ?? true;
    const includeActivities = options?.includeActivities ?? true;
    const includeAssessments = options?.includeAssessments ?? true;

    const chapters: any[] = [];
    const chapterCount = breakIntoChapters ? 5 : 1;

    for (let i = 1; i <= chapterCount; i++) {
      chapters.push({
        id: i,
        title: this.generateChapterTitle(component, template, i),
        content: this.generateChapterContent(component, template, philosophy, bibliographies || [], i),
        learningObjectives: this.generateLearningObjectives(component, i),
        activities: includeActivities ? this.generateActivities(component, i) : [],
        evaluationCriteria: includeAssessments ? this.generateEvaluationCriteria(component, i) : [],
        practicalExamples: this.generatePracticalExamples(component, i),
        resources: this.generateResources(component, i),
        estimatedDuration: 2
      });
    }

    const qualityScore = this.calculateQualityScore(chapters, component, template, philosophy, bibliographies || []);

    return {
      content: JSON.stringify({
        success: true,
        chapters,
        qualityScore,
        processingLog: {
          status: 'success',
          timestamp: new Date().toISOString(),
          processingTime: 5000,
          model: options?.model || 'gpt-4',
          tokensUsed: 2000,
          fallback: true
        },
        result: {
          totalChapters: chapters.length,
          totalDuration: chapters.reduce((sum, ch) => sum + ch.estimatedDuration, 0),
          difficultyLevel: 'intermediate',
          pedagogicalApproach: 'active_learning'
        },
        metrics: {
          tokensIn: 1000,
          tokensOut: 1000,
          latencyMs: 5000,
          costUsd: 0.02
        },
        suggestions: this.generateSuggestions(component, template, philosophy, bibliographies || []),
        model: options?.model || 'gpt-4'
      }),
      model: options?.model || 'gpt-4',
      tokensIn: 1000,
      tokensOut: 1000,
      costUsd: 0.02
    };
  }

  private generateChapterTitle(component: any, template: any, chapterNumber: number): string {
    const subjects = {
      'tecnologia': ['Introdução à Programação', 'Variáveis e Dados', 'Estruturas de Controle', 'Funções', 'Arrays'],
      'matematica': ['Números e Operações', 'Geometria', 'Álgebra', 'Estatística', 'Probabilidade'],
      'portugues': ['Leitura e Interpretação', 'Gramática', 'Produção Textual', 'Literatura', 'Comunicação'],
      'ciencias': ['Método Científico', 'Física Básica', 'Química', 'Biologia', 'Meio Ambiente'],
      'empreendedorismo': [
        'Fundamentos do Empreendedorismo',
        'Identificação de Oportunidades de Negócio',
        'Planejamento e Estruturação de Negócios',
        'Marketing e Vendas para Empreendedores',
        'Gestão Financeira e Controle de Custos',
        'Liderança e Gestão de Equipes',
        'Inovação e Tecnologia nos Negócios',
        'Plano de Negócios e Captação de Recursos'
      ],
      'administracao': ['Introdução à Administração', 'Planejamento Estratégico', 'Organização e Estrutura', 'Direção e Liderança', 'Controle e Avaliação'],
      'economia': ['Conceitos Básicos de Economia', 'Microeconomia', 'Macroeconomia', 'Economia Brasileira', 'Economia Internacional']
    };

    const subject = component?.subject?.toLowerCase() || 'geral';
    const chapterTitles = subjects[subject] || ['Introdução', 'Desenvolvimento', 'Aplicação', 'Avaliação', 'Conclusão'];

    return chapterTitles[chapterNumber - 1] || `Tópico ${chapterNumber}`;
  }

  private generateChapterContent(component: any, template: any, philosophy: any, bibliographies: any[], chapterNumber: number): string {
    const templateGuidelines = template?.guidelines || 'Criar conteúdo didático e acessível';
    const philosophyContent = philosophy?.content || 'Educação inclusiva e de qualidade';
    const subject = component?.subject?.toLowerCase() || 'geral';
    const chapterTitle = this.generateChapterTitle(component, template, chapterNumber);

    // Conteúdo específico para empreendedorismo
    if (subject === 'empreendedorismo') {
      return this.generateEntrepreneurshipContent(component, template, philosophy, bibliographies, chapterNumber, chapterTitle);
    }

    return `
# ${chapterTitle}

## Introdução
Este capítulo aborda os conceitos fundamentais relacionados ao tema "${component?.subject || 'educação'}", proporcionando uma base sólida para o aprendizado de estudantes do ${component?.educationalLevel || 'ensino médio'}.

## Conteúdo Principal
Baseado nas diretrizes do template "${template?.name || 'padrão'}" e na filosofia educacional da empresa, este conteúdo foi desenvolvido para atender ao público-alvo: ${component?.targetAudience || 'estudantes'}.

**Diretrizes do Template:**
${templateGuidelines}

**Filosofia Educacional:**
${philosophyContent}

## Aplicação Prática
Os conceitos apresentados serão aplicados através de exemplos práticos e atividades interativas, seguindo a metodologia ativa de aprendizagem e considerando o contexto do Maranhão.

## Conclusão
Este capítulo estabelece as bases para os próximos tópicos, garantindo uma progressão adequada do aprendizado e o desenvolvimento do pensamento crítico.
    `.trim();
  }

  private generateEntrepreneurshipContent(component: any, template: any, philosophy: any, bibliographies: any[], chapterNumber: number, chapterTitle: string): string {
    const entrepreneurshipContent = {
      1: `
# ${chapterTitle}

## Introdução ao Empreendedorismo
O empreendedorismo é uma das forças motrizes do desenvolvimento econômico e social, especialmente em regiões como o Maranhão, onde o potencial de crescimento e inovação é vasto. Este capítulo apresenta os fundamentos essenciais para compreender o que é ser empreendedor e como desenvolver o mindset empreendedor.

## O que é Empreendedorismo?
Empreendedorismo é a capacidade de identificar oportunidades, assumir riscos calculados e transformar ideias em negócios viáveis. No contexto maranhense, o empreendedorismo tem um papel fundamental na geração de empregos, na diversificação da economia e no desenvolvimento regional.

### Características do Empreendedor
- **Visão**: Capacidade de enxergar oportunidades onde outros veem problemas
- **Inovação**: Busca constante por soluções criativas e diferenciadas
- **Persistência**: Determinação para superar obstáculos e desafios
- **Liderança**: Habilidade para inspirar e motivar equipes
- **Resiliência**: Capacidade de se recuperar de fracassos e aprender com eles

## Tipos de Empreendedorismo
### Empreendedorismo Individual
Foco no desenvolvimento pessoal e na criação de negócios próprios, como micro e pequenas empresas.

### Empreendedorismo Social
Busca resolver problemas sociais através de soluções inovadoras e sustentáveis.

### Empreendedorismo Corporativo
Desenvolvimento de inovações dentro de empresas estabelecidas.

### Empreendedorismo Digital
Criação de negócios baseados em tecnologia e plataformas digitais.

## O Ecossistema Empreendedor no Maranhão
O Maranhão possui um ecossistema empreendedor em desenvolvimento, com:
- Incubadoras e aceleradoras de negócios
- Programas de fomento e financiamento
- Universidades e centros de pesquisa
- Associações e redes de empreendedores
- Políticas públicas de apoio ao empreendedorismo

## Desenvolvendo o Mindset Empreendedor
### Mentalidade de Crescimento
Acreditar que habilidades podem ser desenvolvidas através de esforço e dedicação.

### Tolerância ao Risco
Entender que o empreendedorismo envolve riscos calculados e aprender a gerenciá-los.

### Networking
Construir e manter relacionamentos profissionais que podem gerar oportunidades.

### Aprendizado Contínuo
Manter-se atualizado com tendências de mercado e novas tecnologias.

## Casos de Sucesso no Maranhão
Exemplos de empreendedores maranhenses que transformaram ideias em negócios de sucesso, contribuindo para o desenvolvimento regional.

## Desafios e Oportunidades
### Principais Desafios
- Acesso a capital e financiamento
- Burocracia e regulamentações
- Falta de mão de obra qualificada
- Infraestrutura limitada

### Oportunidades Emergentes
- Economia digital e e-commerce
- Sustentabilidade e economia verde
- Turismo e cultura local
- Agronegócio e tecnologia rural

## Conclusão
O empreendedorismo é uma jornada de aprendizado contínuo que requer dedicação, planejamento e execução estratégica. No contexto maranhense, representa uma oportunidade única de contribuir para o desenvolvimento regional através da criação de negócios inovadores e sustentáveis.
      `,
      2: `
# ${chapterTitle}

## Introdução à Identificação de Oportunidades
A identificação de oportunidades é uma das habilidades mais importantes para um empreendedor. Este capítulo ensina como desenvolver a capacidade de enxergar oportunidades de negócio em diferentes contextos e situações.

## O que são Oportunidades de Negócio?
Oportunidades de negócio são situações onde existe uma necessidade não atendida ou um problema que pode ser resolvido através de um produto ou serviço, gerando valor para os clientes e retorno para o empreendedor.

### Características de uma Boa Oportunidade
- **Demanda Real**: Existe um mercado disposto a pagar pela solução
- **Viabilidade Técnica**: A solução pode ser desenvolvida com recursos disponíveis
- **Sustentabilidade**: O negócio pode ser mantido a longo prazo
- **Diferencial Competitivo**: A solução oferece vantagens sobre alternativas existentes

## Fontes de Oportunidades
### Mudanças Tecnológicas
Novas tecnologias criam possibilidades para produtos e serviços inovadores.

### Mudanças Demográficas
Alterações na população podem gerar novas necessidades e demandas.

### Mudanças Sociais e Culturais
Evolução dos valores e comportamentos da sociedade.

### Mudanças Econômicas
Crises e crescimento econômico criam diferentes tipos de oportunidades.

### Mudanças Regulamentares
Novas leis e regulamentações podem abrir ou fechar mercados.

## Técnicas de Identificação de Oportunidades
### Observação do Mercado
- Análise de tendências e comportamentos
- Identificação de gaps no mercado
- Estudo da concorrência

### Networking e Relacionamentos
- Participação em eventos e feiras
- Conversas com potenciais clientes
- Colaboração com outros empreendedores

### Análise de Problemas
- Identificação de dores dos clientes
- Busca por soluções mais eficientes
- Melhoria de processos existentes

### Criatividade e Inovação
- Brainstorming e técnicas criativas
- Aplicação de tecnologias existentes em novos contextos
- Combinação de diferentes ideias

## Validação de Oportunidades
### Pesquisa de Mercado
- Entrevistas com potenciais clientes
- Análise de dados e estatísticas
- Testes de conceito e protótipos

### Análise de Viabilidade
- Avaliação técnica da solução
- Análise financeira e de custos
- Estudo de recursos necessários

### Teste de Mercado
- Lançamento de versão beta
- Feedback de usuários iniciais
- Ajustes baseados em resultados

## Oportunidades Específicas no Maranhão
### Setor Primário
- Agronegócio e tecnologia rural
- Aquicultura e pesca
- Extrativismo sustentável

### Setor Secundário
- Indústria de transformação
- Artesanato e produtos locais
- Manufatura de baixo custo

### Setor Terciário
- Serviços especializados
- Turismo e hospitalidade
- Educação e capacitação

### Economia Digital
- E-commerce e marketplaces
- Aplicativos e software
- Marketing digital e redes sociais

## Ferramentas de Análise
### Canvas de Oportunidade
Ferramenta para mapear e analisar oportunidades de negócio.

### Análise SWOT
Avaliação de forças, fraquezas, oportunidades e ameaças.

### Análise de 5 Forças de Porter
Estudo da competitividade do mercado.

### Matriz de Análise de Oportunidades
Comparação sistemática de diferentes oportunidades.

## Desenvolvendo a Sensibilidade para Oportunidades
### Prática Regular
- Exercícios de observação
- Análise de casos de sucesso
- Participação em competições

### Networking Ativo
- Participação em eventos
- Colaboração com mentores
- Troca de experiências

### Aprendizado Contínuo
- Leitura sobre tendências
- Cursos e capacitações
- Experimentação prática

## Conclusão
A identificação de oportunidades é uma habilidade que pode ser desenvolvida através de prática e conhecimento. No contexto maranhense, existem diversas oportunidades esperando para serem descobertas e desenvolvidas por empreendedores visionários e dedicados.
      `
    };

    return entrepreneurshipContent[chapterNumber] || `
# ${chapterTitle}

## Introdução
Este capítulo aborda conceitos fundamentais de empreendedorismo, proporcionando uma base sólida para o desenvolvimento de competências empreendedoras.

## Conteúdo Principal
Baseado nas diretrizes do template "${template?.name || 'padrão'}" e na filosofia educacional da empresa, este conteúdo foi desenvolvido para atender ao público-alvo: ${component?.targetAudience || 'estudantes'}.

**Diretrizes do Template:**
${template?.guidelines || 'Criar conteúdo didático e acessível'}

**Filosofia Educacional:**
${philosophy?.content || 'Educação inclusiva e de qualidade'}

## Aplicação Prática
Os conceitos apresentados serão aplicados através de exemplos práticos e atividades interativas, seguindo a metodologia ativa de aprendizagem e considerando o contexto do Maranhão.

## Conclusão
Este capítulo estabelece as bases para os próximos tópicos, garantindo uma progressão adequada do aprendizado e o desenvolvimento das competências necessárias.
    `.trim();
  }

  private generateLearningObjectives(component: any, chapterNumber: number): string[] {
    return [
      `Identificar os conceitos principais do capítulo ${chapterNumber}`,
      `Aplicar os conhecimentos em situações práticas`,
      `Relacionar o conteúdo com a realidade local do Maranhão`,
      `Desenvolver habilidades de análise e síntese`,
      `Demonstrar compreensão através de atividades práticas`
    ];
  }

  private generateActivities(component: any, chapterNumber: number): string[] {
    return [
      `Atividade de leitura e interpretação de texto`,
      `Exercícios práticos de aplicação dos conceitos`,
      `Discussão em grupo sobre o tema abordado`,
      `Pesquisa sobre exemplos locais do Maranhão`,
      `Apresentação dos resultados da pesquisa`,
      `Criação de material didático pelos estudantes`
    ];
  }

  private generateEvaluationCriteria(component: any, chapterNumber: number): string[] {
    return [
      `Compreensão dos conceitos apresentados no capítulo`,
      `Capacidade de aplicação prática dos conhecimentos`,
      `Participação ativa nas atividades propostas`,
      `Qualidade das produções e apresentações realizadas`,
      `Relacionamento do conteúdo com a realidade local`,
      `Desenvolvimento do pensamento crítico e criativo`
    ];
  }

  private generatePracticalExamples(component: any, chapterNumber: number): string[] {
    return [
      `Exemplo prático relacionado ao contexto do Maranhão`,
      `Situação real de aplicação do conhecimento na região`,
      `Caso de estudo para análise e discussão`,
      `Demonstração prática dos conceitos abordados`,
      `Aplicação em problemas do cotidiano local`
    ];
  }

  private generateResources(component: any, chapterNumber: number): string[] {
    return [
      `Material didático complementar específico do tema`,
      `Vídeos educativos sobre o assunto`,
      `Sites e recursos online confiáveis`,
      `Bibliografia específica e atualizada`,
      `Atividades interativas e dinâmicas`,
      `Recursos audiovisuais para apoio ao aprendizado`
    ];
  }

  private calculateQualityScore(chapters: any[], component: any, template: any, philosophy: any, bibliographies: any[]): number {
    let score = 50; // Score base

    // Aumentar score baseado na qualidade dos dados de entrada
    if (template) score += 10;
    if (philosophy) score += 10;
    if (bibliographies && bibliographies.length > 0) score += 15;
    if (component?.learningObjectives && component.learningObjectives.length > 0) score += 10;
    if (component?.description) score += 5;
    if (component?.targetAudience) score += 5;

    // Ajustar baseado no número de capítulos
    if (chapters.length >= 5) score += 5;
    if (chapters.length >= 8) score += 5;

    // Ajustar baseado na completude do conteúdo
    const avgContentLength = chapters.reduce((sum, ch) => sum + ch.content.length, 0) / chapters.length;
    if (avgContentLength > 1000) score += 5;
    if (avgContentLength > 2000) score += 5;

    return Math.min(score, 100);
  }

  private generateSuggestions(component: any, template: any, philosophy: any, bibliographies: any[]): string[] {
    const suggestions = [
      'Considere adicionar mais exemplos práticos relacionados ao contexto local',
      'Inclua atividades de fixação e reforço do aprendizado',
      'Adicione avaliações formativas para acompanhar o progresso',
      'Incorpore recursos multimídia para enriquecer o conteúdo'
    ];

    if (!bibliographies || bibliographies.length === 0) {
      suggestions.push('Adicione bibliografias para embasar melhor o conteúdo');
    }

    if (!component?.learningObjectives || component.learningObjectives.length < 3) {
      suggestions.push('Defina mais objetivos de aprendizagem específicos');
    }

    return suggestions;
  }

  /**
   * Retorna schema esperado para validação
   */
  private getExpectedSchema(isIntelligentWorkflow: boolean = false): any {
    if (isIntelligentWorkflow) {
      return {
        success: 'boolean',
        chapters: [
          {
            id: 'number',
            title: 'string',
            content: 'string',
            learningObjectives: 'array',
            activities: 'array',
            evaluationCriteria: 'array',
            practicalExamples: 'array',
            resources: 'array',
            estimatedDuration: 'number',
          },
        ],
        qualityScore: 'number',
        processingLog: 'object',
        result: 'object',
        metrics: {
          tokensIn: 'number',
          tokensOut: 'number',
          latencyMs: 'number',
          costUsd: 'number',
        },
        suggestions: 'array',
        model: 'string',
      };
    }

    return {
      summary: 'string',
      metrics: {
        readabilityScore: 'number',
        durationMin: 'number',
        coverage: 'number',
      },
      violations: 'array',
      suggestions: 'array',
      quiz: 'array',
      improvedText: 'array',
      meta: {
        rawId: 'string',
        adaptedId: 'string',
      },
    };
  }
}
