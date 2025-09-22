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
