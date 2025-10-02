import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ExecutionMetadataDto } from '../../common/dto';
import * as dotenv from 'dotenv';

dotenv.config();


export interface IaResponse {
  content: string;
  metadata: ExecutionMetadataDto;
}

// Especificação do livro e resultados (não quebram APIs existentes)
export interface BookSpec {
  title: string;
  targetAudience: string; // ex: "ensino médio", "graduação", "corporativo"
  level: 'iniciante' | 'intermediario' | 'avancado';
  objectives: string[];
  tone?: string; // ex: "didático e motivador"
  totalPagesTarget?: number; // ex: 100 para livros longos
  chaptersCountHint?: number; // dica de quantidade de capítulos
}

export interface ChapterBrief {
  title: string;
  goals: string[];
  keyTopics: string[];
  estimatedPages?: number;
}

export interface GenerateBookOptions {
  model?: string;
  outlineMaxTokens?: number;
  chapterMaxTokens?: number;
  temperature?: number;
  maxChapters?: number; // limite de capítulos para gerar agora
}

@Injectable()
export class IaProviderService {
  private readonly logger = new Logger(IaProviderService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    // Teste com dotenv direto
    const apiKeyDotenv = process.env.OPENAI_API_KEY;
    const apiKeyConfig = this.configService.get<string>('OPENAI_API_KEY');

    console.log('🔍 DEBUG - apiKeyDotenv:', apiKeyDotenv ? 'ENCONTRADA' : 'NÃO ENCONTRADA');
    console.log('🔍 DEBUG - apiKeyConfig:', apiKeyConfig ? 'ENCONTRADA' : 'NÃO ENCONTRADA');

    const apiKey = apiKeyConfig || apiKeyDotenv;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY não encontrada nas variáveis de ambiente');
    }

    this.openai = new OpenAI({
      apiKey,
      timeout: 300000,
      maxRetries: 3,
    });
  }


  /**
   * Envia prompt para a IA e retorna resposta
   */
  async processPrompt(
    prompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      model?: string;
    }
  ): Promise<IaResponse> {
    const startTime = Date.now();

    try {
      // Parâmetros otimizados para grandes livros e conteúdo extenso
      const model = options?.model || 'gpt-4o-mini';
      const maxTokens = options?.maxTokens || 8000; // Aumentado para grandes livros
      const temperature = options?.temperature || 0.2; // Baixa criatividade para consistência

      this.logger.log(`Enviando prompt para ${model} com ${maxTokens} tokens máximos`);

      // Configuração baseada no modelo
      const requestConfig: any = {
        model,
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente especializado em análise e processamento de conteúdo educacional. Sempre retorne respostas estruturadas em JSON conforme solicitado.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: maxTokens,
        temperature,
        top_p: 0.9, // Mantém diversidade sem perder foco
        presence_penalty: 0.1, // Evita repetição de termos
        frequency_penalty: 0.1, // Reduz redundância
        n: 1, // Gera uma única versão (mais econômico)
      };

      // Adicionar response_format apenas para modelos que suportam
      if (model.includes('gpt-4o') || model.includes('gpt-4-turbo')) {
        requestConfig.response_format = { type: 'json_object' };
      }

      const completion = await this.openai.chat.completions.create(requestConfig);

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new ServiceUnavailableException('Resposta vazia da IA');
      }

      const latencyMs = Date.now() - startTime;

      // Usar tokens reais da resposta da OpenAI quando disponível
      const tokensIn = completion.usage?.prompt_tokens || this.estimateTokens(prompt);
      const tokensOut = completion.usage?.completion_tokens || this.estimateTokens(content);
      const costUsd = this.calculateCost(model, tokensIn, tokensOut);

      this.logger.log(`Resposta recebida em ${latencyMs}ms, tokens: ${tokensIn} in, ${tokensOut} out`);

      return {
        content,
        metadata: {
          model,
          tokensIn,
          tokensOut,
          latencyMs,
          costUsd,
        },
      };
    } catch (error) {
      this.logger.error('Erro ao processar prompt com IA:', error);

      if (error instanceof Error) {
        if (error.message.includes('rate_limit')) {
          throw new ServiceUnavailableException('Rate limit excedido. Tente novamente em alguns minutos.');
        } else if (error.message.includes('insufficient_quota')) {
          throw new ServiceUnavailableException('Cota de API insuficiente. Verifique sua conta OpenAI.');
        } else if (error.message.includes('invalid_api_key')) {
          throw new ServiceUnavailableException('Chave de API inválida. Verifique a configuração.');
        }
      }

      throw new ServiceUnavailableException('Falha na comunicação com o provedor de IA');
    }
  }

  /**
   * Valida e corrige resposta da IA para garantir schema correto
   */
  async validateAndCorrectResponse(
    response: string,
    correctionPrompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      model?: string;
    }
  ): Promise<IaResponse> {
    try {
      // Primeiro, tenta fazer parse do JSON
      JSON.parse(response);
      // Se chegou aqui, o JSON é válido
      return {
        content: response,
        metadata: {
          model: options?.model || 'gpt-4o',
          tokensIn: 0,
          tokensOut: 0,
          latencyMs: 0,
          costUsd: 0,
        },
      };
    } catch (parseError) {
      this.logger.warn('Resposta da IA não é JSON válido, tentando correção');

      // Tenta corrigir a resposta
      const correctedResponse = await this.processPrompt(correctionPrompt, options);

      try {
        JSON.parse(correctedResponse.content);
        return correctedResponse;
      } catch (secondParseError) {
        this.logger.error('Falha na correção da resposta da IA');
        throw new ServiceUnavailableException('Não foi possível processar a resposta da IA');
      }
    }
  }

  /**
   * Gera um outline detalhado de livro educacional em JSON
   */
  async generateBookOutline(spec: BookSpec, options?: GenerateBookOptions): Promise<IaResponse> {
    const model = options?.model || 'gpt-4o';
    const maxTokens = options?.outlineMaxTokens || 8000;
    const temperature = options?.temperature ?? 0.2;

    const outlinePrompt = this.buildOutlinePrompt(spec);
    const response = await this.processPrompt(outlinePrompt, { model, maxTokens, temperature });
    return this.validateAndCorrectResponse(
      response.content,
      this.buildOutlineCorrectionPrompt(spec, response.content),
      { model, maxTokens: 1000, temperature }
    );
  }

  /**
   * Gera um capítulo extenso, com seções, exemplos e exercícios, em JSON
   */
  async generateChapter(
    bookSpec: BookSpec,
    chapter: ChapterBrief,
    context: { previousChaptersSummaries?: string[] } = {},
    options?: GenerateBookOptions,
  ): Promise<IaResponse> {
    const model = options?.model || 'gpt-4o';
    const maxTokens = options?.chapterMaxTokens || 8000;
    const temperature = options?.temperature ?? 0.2;

    const chapterPrompt = this.buildChapterPrompt(bookSpec, chapter, context);
    const response = await this.processPrompt(chapterPrompt, { model, maxTokens, temperature });
    return this.validateAndCorrectResponse(
      response.content,
      this.buildChapterCorrectionPrompt(bookSpec, chapter, response.content),
      { model, maxTokens: 1500, temperature }
    );
  }

  /**
   * Orquestra a geração de um livro completo: outline → capítulos
   * Retorna JSON com outline e capítulos gerados (pode ser parcial se maxChapters for usado)
   */
  async generateFullBook(spec: BookSpec, options?: GenerateBookOptions): Promise<IaResponse> {
    const outline = await this.generateBookOutline(spec, options);

    // Tenta extrair capítulo a partir do outline JSON
    let chapters: ChapterBrief[] = [];
    try {
      const parsed = JSON.parse(outline.content);
      const list = parsed?.outline?.chapters || parsed?.chapters || [];
      chapters = list.map((c: any) => ({
        title: c.title,
        goals: c.goals || c.objectives || [],
        keyTopics: c.keyTopics || c.topics || [],
        estimatedPages: c.estimatedPages,
      }));
    } catch (e) {
      this.logger.warn('Falha ao interpretar outline; prosseguindo sem extração estruturada');
    }

    const limit = options?.maxChapters && options.maxChapters > 0
      ? Math.min(options.maxChapters, chapters.length || Number.MAX_SAFE_INTEGER)
      : chapters.length;

    const generatedChapters: any[] = [];
    const summaries: string[] = [];

    // Acumular metadados
    let totalTokensIn = this.estimateTokens(JSON.stringify(spec));
    let totalTokensOut = 0;
    let totalLatencyMs = 0;
    let totalCostUsd = 0;

    // Considera outline
    try {
      const outlineParsed = JSON.parse(outline.content);
      totalTokensIn += outline.metadata.tokensIn || 0;
      totalTokensOut += outline.metadata.tokensOut || this.estimateTokens(outline.content);
      totalLatencyMs += outline.metadata.latencyMs || 0;
      totalCostUsd += outline.metadata.costUsd || 0;
    } catch { }

    for (let i = 0; i < limit; i++) {
      const ch = chapters[i];
      if (!ch) break;
      const chapterResp = await this.generateChapter(spec, ch, { previousChaptersSummaries: summaries }, options);
      generatedChapters.push(JSON.parse(chapterResp.content));
      // cria um sumário curto para contexto dos próximos capítulos
      summaries.push(this.safeSummarizeChapter(generatedChapters[i]));

      // acumular metadados
      totalTokensIn += chapterResp.metadata.tokensIn || 0;
      totalTokensOut += chapterResp.metadata.tokensOut || this.estimateTokens(chapterResp.content);
      totalLatencyMs += chapterResp.metadata.latencyMs || 0;
      totalCostUsd += chapterResp.metadata.costUsd || 0;
    }

    const bookJson = {
      book: {
        title: spec.title,
        targetAudience: spec.targetAudience,
        level: spec.level,
        objectives: spec.objectives,
        tone: spec.tone,
        totalPagesTarget: spec.totalPagesTarget,
      },
      outline: this.safeParse(outline.content),
      chapters: generatedChapters,
    };

    const aggregated = JSON.stringify(bookJson);
    return {
      content: aggregated,
      metadata: {
        model: options?.model || 'gpt-4o',
        tokensIn: totalTokensIn,
        tokensOut: totalTokensOut || this.estimateTokens(aggregated),
        latencyMs: totalLatencyMs,
        costUsd: totalCostUsd,
      },
    };
  }

  // ---------- PROMPTS ----------
  private buildOutlinePrompt(spec: BookSpec): string {
    const chaptersHint = spec.chaptersCountHint ? `\n- Quantidade sugerida de capítulos: ${spec.chaptersCountHint}` : '';
    const pages = spec.totalPagesTarget ? `\n- Meta de páginas totais: ${spec.totalPagesTarget}` : '';
    return `Gere um outline detalhado para um livro educacional em português do Brasil.
Retorne SOMENTE JSON com o seguinte formato:
{
  "outline": {
    "bookTitle": string,
    "positioning": string,
    "learningOutcomes": string[],
    "chapters": [
      {
        "title": string,
        "goals": string[],
        "keyTopics": string[],
        "estimatedPages": number
      }
    ]
  }
}
Regras:
- Adeque a profundidade ao nível: ${spec.level}
- Público-alvo: ${spec.targetAudience}
- Objetivos do livro: ${spec.objectives.join(', ')}
- Tom: ${spec.tone || 'didático e claro'}${chaptersHint}${pages}
- Os títulos devem ser consistentes e claros; não use caracteres de markdown.
- Não inclua texto fora do JSON.`;
  }

  private buildOutlineCorrectionPrompt(spec: BookSpec, original: string): string {
    return `Conserte o JSON a seguir para que obedeça ao schema do outline especificado. Retorne SOMENTE JSON válido.
Schema: {
  "outline": {
    "bookTitle": string,
    "positioning": string,
    "learningOutcomes": string[],
    "chapters": [{"title": string, "goals": string[], "keyTopics": string[], "estimatedPages": number }]
  }
}
Conteúdo original (pode estar com erros):\n${original}`;
  }

  private buildChapterPrompt(spec: BookSpec, chapter: ChapterBrief, context: { previousChaptersSummaries?: string[] }): string {
    const prev = context.previousChaptersSummaries?.length
      ? `\nContexto dos capítulos anteriores (resumos):\n- ${context.previousChaptersSummaries.join('\n- ')}`
      : '';

    const estimated = chapter.estimatedPages ? `\n- Tamanho alvo: ~${chapter.estimatedPages} páginas` : '';

    return `Escreva um capítulo educacional completo, em português do Brasil, no contexto do livro "${spec.title}".
Retorne SOMENTE JSON com o seguinte formato:
{
  "chapter": {
    "title": string,
    "summary": string,
    "sections": [
      { "title": string, "content": string }
    ],
    "examples": [ { "title": string, "content": string } ],
    "exercises": [ { "question": string, "answer": string } ],
    "references": string[]
  }
}
Diretrizes:
- Público-alvo: ${spec.targetAudience}; nível: ${spec.level}; tom: ${spec.tone || 'didático e claro'}
- Objetivos do capítulo: ${chapter.goals.join(', ')}
- Tópicos-chave: ${chapter.keyTopics.join(', ')}${estimated}
- Use seções longas, com explicações, analogias e passos práticos.
- Inclua exercícios com gabarito explicativo e exemplos realistas.
- Mantenha consistência terminológica e reforce conexões com objetivos de aprendizagem.${prev}
- Não inclua texto fora do JSON.`;
  }

  private buildChapterCorrectionPrompt(spec: BookSpec, chapter: ChapterBrief, original: string): string {
    return `Conserte o JSON a seguir para obedecer ao schema de capítulo exigido. Retorne SOMENTE JSON válido.
Schema: {
  "chapter": {
    "title": string,
    "summary": string,
    "sections": [ { "title": string, "content": string } ],
    "examples": [ { "title": string, "content": string } ],
    "exercises": [ { "question": string, "answer": string } ],
    "references": string[]
  }
}
Conteúdo original (pode estar com erros):\n${original}`;
  }

  // ---------- Helpers ----------
  private safeParse<T = any>(json: string): T | null {
    try { return JSON.parse(json); } catch { return null; }
  }

  private safeSummarizeChapter(chapterJson: any): string {
    try {
      const title = chapterJson?.chapter?.title || 'Capítulo';
      const summary = chapterJson?.chapter?.summary || '';
      return `${title}: ${summary.substring(0, 300)}`;
    } catch {
      return 'Resumo indisponível';
    }
  }
  /**
   * Estima o número de tokens em um texto
   */
  private estimateTokens(text: string): number {
    // Aproximação simples: 1 token ≈ 4 caracteres para português
    return Math.ceil(text.length / 4);
  }

  /**
   * Calcula o custo estimado da requisição
   */
  private calculateCost(model: string, tokensIn: number, tokensOut: number): number {
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    };

    const modelPricing = pricing[model] || pricing['gpt-4o-mini'];
    const inputCost = (tokensIn / 1000) * modelPricing.input;
    const outputCost = (tokensOut / 1000) * modelPricing.output;

    return inputCost + outputCost;
  }

  /**
   * Verifica se o serviço está disponível
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Teste simples com um prompt mínimo
      await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      });
      return true;
    } catch (error) {
      this.logger.error('Health check falhou:', error);
      return false;
    }
  }
}
