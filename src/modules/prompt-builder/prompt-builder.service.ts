import { Injectable } from '@nestjs/common';
import { ProcessRequestDto, MetadataDto, PolicyDto, ComponentDto, TemplateDto, PhilosophyDto, BibliographyDto } from '../../common/dto';

@Injectable()
export class PromptBuilderService {
  /**
   * Constrói o prompt estruturado para a IA baseado no workflow inteligente
   */
  buildPrompt(request: ProcessRequestDto): string {
    // Verificar se é o novo formato do workflow inteligente
    if (request.component && request.template && request.philosophy) {
      return this.buildIntelligentWorkflowPrompt(request);
    }

    // Fallback para formato legado
    const { text, metadata, policy, options } = request;
    const context = this.buildContext(metadata || { source: 'legacy', timestamp: new Date().toISOString(), version: '1.0' });
    const policies = this.buildPolicies(policy);
    const instructions = this.buildInstructions(options);

    return `${context}

CONTEÚDO A SER PROCESSADO:
${text || 'Conteúdo não fornecido'}

${policies}

${instructions}`;
  }

  /**
   * Constrói prompt para o workflow inteligente
   */
  private buildIntelligentWorkflowPrompt(request: ProcessRequestDto): string {
    const { component, template, philosophy, bibliographies, options } = request;

    const context = this.buildIntelligentContext(component!, template!, philosophy!);
    const bibliographyContext = this.buildBibliographyContext(bibliographies || []);
    const instructions = this.buildIntelligentInstructions(options);

    return `${context}

${bibliographyContext}

${instructions}`;
  }

  /**
   * Constrói o contexto para o workflow inteligente
   */
  private buildIntelligentContext(component: ComponentDto, template: TemplateDto, philosophy: PhilosophyDto): string {
    return `CONTEXTO DO COMPONENTE EDUCACIONAL:

COMPONENTE:
- Nome: ${component.name}
- Título: ${component.title}
- Descrição: ${component.description || 'Não especificada'}
- Público-alvo: ${component.targetAudience || 'Não especificado'}
- Nível educacional: ${component.educationalLevel}
- Disciplina/Assunto: ${component.subject}
- Duração estimada: ${component.estimatedDuration || 'Não especificada'} minutos
- Objetivos de aprendizagem: ${component.learningObjectives?.join(', ') || 'Não especificados'}

TEMPLATE E DIRETRIZES:
- Nome do template: ${template.name}
- Diretrizes para criação dos capítulos:
${template.guidelines}

FILOSOFIA EDUCACIONAL (FIXA EM TODOS):
${philosophy.content}`;
  }

  /**
   * Constrói o contexto das bibliografias
   */
  private buildBibliographyContext(bibliographies: BibliographyDto[]): string {
    if (!bibliographies || bibliographies.length === 0) {
      return 'BIBLIOGRAFIA: Nenhuma bibliografia fornecida.';
    }

    let context = 'BIBLIOGRAFIA PARA EMBASAMENTO:\n\n';

    bibliographies.forEach((bib, index) => {
      context += `${index + 1}. ${bib.title}`;
      if (bib.author) context += ` - ${bib.author}`;
      context += `\n   Assunto: ${bib.subject}`;
      if (bib.extractedData) {
        context += `\n   Conteúdo extraído: ${JSON.stringify(bib.extractedData, null, 2)}`;
      }
      context += '\n\n';
    });

    return context;
  }

  /**
   * Constrói as instruções para o workflow inteligente
   */
  private buildIntelligentInstructions(options?: any): string {
    const breakIntoChapters = options?.breakIntoChapters ?? true;
    const includeActivities = options?.includeActivities ?? true;
    const includeAssessments = options?.includeAssessments ?? true;
    const model = options?.model || 'gpt-4';

    return `INSTRUÇÕES PARA GERAÇÃO DE CONTEÚDO EDUCACIONAL:

OBJETIVO: Criar componentes educacionais excelentes para alunos de escola pública do Maranhão, seguindo rigorosamente as diretrizes do template e a filosofia educacional.

ESTRATÉGIA DE ECONOMIA DE TOKENS:
${breakIntoChapters ? '- Quebrar o conteúdo em capítulos para economizar tokens' : '- Gerar conteúdo em bloco único'}
- Criar componentes extensos e bem trabalhados
- Seguir rigorosamente a parametrização fornecida

ESTRUTURA DE RESPOSTA (JSON OBRIGATÓRIO):
{
  "success": true,
  "chapters": [
    {
      "id": 1,
      "title": "Título do Capítulo",
      "content": "Conteúdo extenso e detalhado do capítulo...",
      "learningObjectives": ["Objetivo 1", "Objetivo 2"],
      "activities": ${includeActivities ? '["Atividade 1", "Atividade 2"]' : '[]'},
      "evaluationCriteria": ${includeAssessments ? '["Critério 1", "Critério 2"]' : '[]'},
      "practicalExamples": ["Exemplo 1", "Exemplo 2"],
      "resources": ["Recurso 1", "Recurso 2"],
      "estimatedDuration": 45
    }
  ],
  "qualityScore": 85,
  "processingLog": {...},
  "result": {...},
  "metrics": {
    "tokensIn": 1500,
    "tokensOut": 2000,
    "latencyMs": 30000,
    "costUsd": 0.05
  },
  "suggestions": ["Sugestão 1", "Sugestão 2"],
  "model": "${model}"
}

DIRETRIZES ESPECÍFICAS:
1. Foco em alunos de escola pública do Maranhão
2. Conteúdo acessível e contextualizado
3. Linguagem clara e didática
4. Exemplos práticos e relevantes
5. Atividades engajantes e inclusivas
6. Critérios de avaliação justos e objetivos
7. Recursos disponíveis na realidade local

IMPORTANTE: 
- Seja generoso com o conteúdo - crie capítulos extensos e bem trabalhados
- Use as bibliografias fornecidas como base para o conteúdo
- Mantenha consistência com a filosofia educacional
- Retorne APENAS o JSON válido, sem texto adicional`;

  }

  /**
   * Constrói a seção de contexto (legado)
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
    return `Analise o conteúdo educacional fornecido (que pode ser um livro completo, capítulo extenso ou material didático longo) e retorne uma resposta estruturada em JSON com as seguintes seções:

IMPORTANTE: Gere conteúdo EXTENSO e DETALHADO. Não limite o tamanho das respostas.

1. SUMMARY: Um resumo COMPLETO e DETALHADO do conteúdo (mínimo 300 palavras, máximo 1000 palavras para grandes livros)
2. METRICS: 
   - readabilityScore: pontuação de 0-100 baseada na legibilidade
   - durationMin: duração estimada de leitura em minutos (considerando o tamanho completo)
   - coverage: percentual de cobertura dos objetivos educacionais (0-100)
3. VIOLATIONS: Array de violações encontradas (se houver)
4. SUGGESTIONS: Array de sugestões de melhoria DETALHADAS (mínimo 3 sugestões, focadas em grandes volumes de conteúdo)
5. QUIZ: Array de 8-15 questões de múltipla escolha sobre o conteúdo (mais questões para livros, com explicações detalhadas)
6. IMPROVED_TEXT: Array de seções com texto melhorado e estruturado (organizado por capítulos/seções, com conteúdo EXTENSO)
7. META: Metadados adicionais (rawId, adaptedId)

DIRETRIZES PARA CONTEÚDO EXTENSO:
- Seja detalhado e abrangente em todas as seções
- Gere explicações completas e exemplos práticos
- Crie conteúdo rico e educativo
- Não economize em palavras - seja generoso com informações

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

CONTEXTO: ${request.metadata?.title || 'Sem título'} - ${request.metadata?.discipline || 'Sem disciplina'}
CONTEÚDO: ${request.text?.substring(0, 500) || 'Conteúdo não disponível'}...

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
