import { Injectable } from '@nestjs/common';
import { ProcessRequestDto, MetadataDto, PolicyDto } from '../../common/dto';

@Injectable()
export class PromptBuilderService {
  /**
   * Constrói o prompt estruturado para a IA
   */
  buildPrompt(request: ProcessRequestDto): string {
    const { text, metadata, policy, options } = request;
    
    const context = this.buildContext(metadata);
    const policies = this.buildPolicies(policy);
    const instructions = this.buildInstructions(options);
    
    return `${context}

CONTEÚDO A SER PROCESSADO:
${text}

${policies}

${instructions}`;
  }

  /**
   * Constrói a seção de contexto
   */
  private buildContext(metadata: MetadataDto): string {
    return `CONTEXTO EDUCACIONAL:
- Título: ${metadata.title}
- Disciplina: ${metadata.discipline}
- Curso: ${metadata.courseId}
- Idioma: ${metadata.language}
${metadata.tags ? `- Tags: ${metadata.tags.join(', ')}` : ''}`;
  }

  /**
   * Constrói a seção de políticas
   */
  private buildPolicies(policy?: PolicyDto): string {
    if (!policy) {
      return 'POLÍTICAS: Nenhuma política específica definida.';
    }

    let policies = 'POLÍTICAS DE CONTEÚDO:\n';

    if (policy.requiredTerms && policy.requiredTerms.length > 0) {
      policies += `- TERMOS OBRIGATÓRIOS (devem estar presentes): ${policy.requiredTerms.join(', ')}\n`;
    }

    if (policy.forbiddenTerms && policy.forbiddenTerms.length > 0) {
      policies += `- TERMOS PROIBIDOS (não devem aparecer): ${policy.forbiddenTerms.join(', ')}\n`;
    }

    if (policy.styleGuidelines && policy.styleGuidelines.length > 0) {
      policies += `- DIRETRIZES DE ESTILO:\n`;
      policy.styleGuidelines.forEach(guideline => {
        policies += `  • ${guideline}\n`;
      });
    }

    return policies;
  }

  /**
   * Constrói as instruções de processamento
   */
  private buildInstructions(options?: any): string {
    return `Analise o conteúdo educacional fornecido e retorne uma resposta estruturada em JSON com as seguintes seções:

1. SUMMARY: Um resumo conciso do conteúdo (máximo 200 palavras)
2. METRICS: 
   - readabilityScore: pontuação de 0-100 baseada na legibilidade
   - durationMin: duração estimada de leitura em minutos
   - coverage: percentual de cobertura dos objetivos educacionais (0-100)
3. VIOLATIONS: Array de violações encontradas (se houver)
4. SUGGESTIONS: Array de sugestões de melhoria
5. QUIZ: Array de 3-5 questões de múltipla escolha sobre o conteúdo
6. IMPROVED_TEXT: Array de seções com texto melhorado e estruturado
7. META: Metadados adicionais (rawId, adaptedId)

Retorne APENAS o JSON válido no seguinte formato:
{
  "summary": "string",
  "metrics": {
    "readabilityScore": number,
    "durationMin": number,
    "coverage": number
  },
  "violations": [
    {
      "rule": "string",
      "message": "string", 
      "severity": "low|medium|high"
    }
  ],
  "suggestions": [
    {
      "section": "string",
      "message": "string"
    }
  ],
  "quiz": [
    {
      "q": "string",
      "options": ["string", "string", "string", "string"],
      "correct": number
    }
  ],
  "improvedText": [
    {
      "section": "string",
      "content": "string"
    }
  ],
  "meta": {
    "rawId": "string",
    "adaptedId": "string"
  }
}

Use português brasileiro para todo o conteúdo e seja preciso e educativo nas sugestões e questões.`;
  }

  /**
   * Constrói prompt para correção de schema
   */
  buildSchemaCorrectionPrompt(originalResponse: string, expectedSchema: any): string {
    return `A resposta anterior da IA não está no formato JSON esperado. 

RESPOSTA ORIGINAL:
${originalResponse}

SCHEMA ESPERADO:
${JSON.stringify(expectedSchema, null, 2)}

Por favor, corrija a resposta para seguir exatamente o schema fornecido, mantendo o conteúdo mas ajustando a estrutura JSON. Retorne APENAS o JSON corrigido.`;
  }

  /**
   * Constrói prompt de fallback para casos de erro
   */
  buildFallbackPrompt(request: ProcessRequestDto): string {
    return `Devido a um erro no processamento, gere uma resposta básica para o conteúdo educacional:

CONTEXTO: ${request.metadata.title} - ${request.metadata.discipline}
CONTEÚDO: ${request.text.substring(0, 500)}...

Retorne um JSON simples com:
- summary: resumo básico
- metrics: { readabilityScore: 50, durationMin: 5, coverage: 60 }
- violations: []
- suggestions: []
- quiz: []
- improvedText: [{ section: "Conteúdo", content: "Texto básico processado" }]
- meta: { rawId: "fallback", adaptedId: "fallback" }`;
  }
}
