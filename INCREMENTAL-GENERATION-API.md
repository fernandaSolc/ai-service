# 🤖 AI Service - Geração Incremental de Cursos

## 📋 Visão Geral

Este documento descreve a nova implementação do **AI Service** para geração incremental de cursos educacionais. A solução resolve o problema de limitação de tokens da IA, permitindo criar cursos completos capítulo por capítulo com controle total sobre o processo de geração.

## 🎯 Problema Resolvido

### **Problema Original**
- IA não consegue criar componentes completos em apenas 1 prompt devido à limitação de tokens
- Conteúdo gerado pode ser superficial ou incompleto
- Falta de controle sobre o processo de geração

### **Solução Implementada**
- **Geração Incremental**: Capítulos criados um por vez
- **Sistema de Continue**: Expansão de conteúdo existente
- **Controle Total**: Usuário decide quando parar e continuar
- **Qualidade Garantida**: Cada capítulo é focado e detalhado

## 🚀 Arquitetura da Solução

### **Componentes Implementados**

#### **1. DTOs (Data Transfer Objects)**
- **`CreateChapterDto`**: Dados para criação de novo capítulo
- **`ContinueChapterDto`**: Dados para continuação de capítulo
- **`ChapterResponseDto`**: Resposta estruturada do capítulo

#### **2. Serviços**
- **`IncrementalGenerationService`**: Lógica de negócio para geração incremental
- **`PromptBuilderService`**: Construção de prompts específicos
- **`IaProviderService`**: Integração com IA (OpenAI)

#### **3. Controllers**
- **`IncrementalGenerationController`**: Endpoints REST para geração incremental

## 📊 Estrutura de Dados

### **CreateChapterDto**
```typescript
interface CreateChapterDto {
  courseId: string;                    // ID único do curso
  courseTitle: string;                 // Título do curso
  courseDescription: string;           // Descrição do curso
  subject: string;                     // Disciplina/Matéria
  educationalLevel: string;            // Nível educacional
  targetAudience: string;              // Público-alvo
  template: string;                    // Template escolhido
  philosophy: string;                  // Filosofia pedagógica
  previousChapter?: string;            // Capítulo anterior (continuidade)
  chapterNumber?: number;              // Número do capítulo
  pdfBibliographies?: string[];        // Bibliografias em PDF (base64)
  aiOptions?: {                        // Opções de IA
    model?: string;
    temperature?: number;
    maxTokens?: number;
    includeActivities?: boolean;
    includeAssessments?: boolean;
  };
  additionalContext?: string;          // Contexto adicional
}
```

### **ContinueChapterDto**
```typescript
interface ContinueChapterDto {
  chapterId: string;                   // ID do capítulo existente
  continueType: 'expand' | 'add_section' | 'add_activities' | 'add_assessments';
  sectionId?: string;                  // Seção específica para expandir
  additionalContext?: string;          // Contexto adicional
}
```

### **ChapterResponseDto**
```typescript
interface ChapterResponseDto {
  id: string;                          // ID único do capítulo
  courseId: string;                    // ID do curso
  chapterNumber: number;               // Número do capítulo
  title: string;                       // Título do capítulo
  content: string;                     // Conteúdo principal
  sections: Array<{                    // Seções do capítulo
    id: string;
    title: string;
    content: string;
    type: string;
    subsections?: any[];
    activities?: any[];
    assessments?: any[];
  }>;
  status: 'draft' | 'generated' | 'edited' | 'completed';
  createdAt: string;                   // Data de criação
  updatedAt: string;                   // Data de atualização
  metrics: {                           // Métricas de qualidade
    readabilityScore: number;
    durationMin: number;
    coverage: number;
  };
  suggestions: string[];               // Sugestões de melhoria
  canContinue: boolean;                // Pode continuar?
  availableContinueTypes: string[];    // Tipos de continuação disponíveis
}
```

## 🔗 Endpoints da API

### **Base URL**
```
http://localhost:3005/v1/v1/incremental
```

**Nota**: Os endpoints estão sendo mapeados com `/v1/v1/incremental` devido à configuração do controller.

### **Autenticação**
```
Header: x-api-key: test-api-key-123
```

---

## 📚 **1. Criar Novo Capítulo**

### **Endpoint**
```
POST /v1/v1/incremental/create-chapter
```

### **Descrição**
Cria um novo capítulo para um curso usando IA, com geração incremental e controle total sobre o processo.

### **Request Body**
```json
{
  "courseId": "curso-001",
  "courseTitle": "Fundamentos do Empreendedorismo",
  "courseDescription": "Curso completo de empreendedorismo para o Maranhão",
  "subject": "empreendedorismo",
  "educationalLevel": "Ensino Médio",
  "targetAudience": "Estudantes e jovens empreendedores",
  "template": "empreendedorismo",
  "philosophy": "Educação inclusiva e acessível para todos",
  "chapterNumber": 1,
  "aiOptions": {
    "model": "gpt-4",
    "temperature": 0.7,
    "maxTokens": 4000,
    "includeActivities": true,
    "includeAssessments": true
  },
  "additionalContext": "Focar em exemplos práticos do Maranhão"
}
```

### **Response**
```json
{
  "id": "chapter_1758807951022_aq3a6rlbj",
  "courseId": "curso-001",
  "chapterNumber": 1,
  "title": "Fundamentos do Empreendedorismo",
  "content": "# Fundamentos do Empreendedorismo\n\n## Introdução ao Empreendedorismo\nO empreendedorismo é uma das forças motrizes do desenvolvimento econômico e social...",
  "sections": [
    {
      "id": "section-1",
      "title": "Contextualizando",
      "content": "Contexto e introdução ao tema do capítulo.",
      "type": "contextualizing",
      "subsections": [],
      "activities": []
    },
    {
      "id": "section-2",
      "title": "Aprofundando",
      "content": "Desenvolvimento dos conceitos principais.",
      "type": "deepening",
      "subsections": [],
      "activities": []
    }
  ],
  "status": "generated",
  "createdAt": "2024-01-01T10:00:00.000Z",
  "updatedAt": "2024-01-01T10:00:00.000Z",
  "metrics": {
    "readabilityScore": 75,
    "durationMin": 2,
    "coverage": 80
  },
  "suggestions": [
    "Considere adicionar mais exemplos práticos",
    "Inclua atividades de fixação",
    "Adicione avaliações formativas"
  ],
  "canContinue": true,
  "availableContinueTypes": ["expand", "add_section", "add_activities"]
}
```

---

## 🔄 **2. Continuar/Expandir Capítulo**

### **Endpoint**
```
POST /v1/v1/incremental/continue-chapter
```

### **Descrição**
Expande ou continua um capítulo existente, adicionando mais conteúdo, seções ou atividades.

### **Request Body**
```json
{
  "chapterId": "chapter_1758807951022_aq3a6rlbj",
  "continueType": "expand",
  "additionalContext": "Adicionar mais exemplos práticos do Maranhão"
}
```

### **Tipos de Continuação**
- **`expand`**: Expandir conteúdo existente
- **`add_section`**: Adicionar nova seção
- **`add_activities`**: Adicionar atividades práticas
- **`add_assessments`**: Adicionar avaliações

### **Response**
```json
{
  "id": "chapter_1758807951022_aq3a6rlbj",
  "courseId": "curso-001",
  "chapterNumber": 1,
  "title": "Fundamentos do Empreendedorismo",
  "content": "# Fundamentos do Empreendedorismo\n\n## Introdução ao Empreendedorismo\nO empreendedorismo é uma das forças motrizes do desenvolvimento econômico e social, especialmente em regiões como o Maranhão...\n\n## Exemplos Práticos do Maranhão\n### Caso 1: Empreendedorismo Rural\nNo interior do Maranhão, muitos agricultores têm se tornado empreendedores...",
  "sections": [
    {
      "id": "section-1",
      "title": "Contextualizando",
      "content": "Contexto e introdução ao tema do capítulo.",
      "type": "contextualizing",
      "subsections": [],
      "activities": []
    },
    {
      "id": "section-2",
      "title": "Aprofundando",
      "content": "Desenvolvimento dos conceitos principais.",
      "type": "deepening",
      "subsections": [],
      "activities": []
    },
    {
      "id": "section-3",
      "title": "Exemplos Práticos do Maranhão",
      "content": "Casos reais de empreendedorismo no Maranhão...",
      "type": "practicing",
      "subsections": [],
      "activities": []
    }
  ],
  "status": "generated",
  "createdAt": "2024-01-01T10:00:00.000Z",
  "updatedAt": "2024-01-01T10:05:00.000Z",
  "metrics": {
    "readabilityScore": 80,
    "durationMin": 3,
    "coverage": 85
  },
  "suggestions": [
    "Considere adicionar mais exemplos práticos",
    "Inclua atividades de fixação",
    "Adicione avaliações formativas"
  ],
  "canContinue": true,
  "availableContinueTypes": ["expand", "add_section", "add_activities", "add_assessments"]
}
```

---

## 📖 **3. Listar Capítulos do Curso**

### **Endpoint**
```
GET /v1/v1/incremental/course/:courseId/chapters
```

### **Descrição**
Retorna todos os capítulos de um curso específico.

### **Parâmetros**
- **`courseId`**: ID do curso

### **Response**
```json
[
  {
    "id": "chapter_1758807951022_aq3a6rlbj",
    "courseId": "curso-001",
    "chapterNumber": 1,
    "title": "Fundamentos do Empreendedorismo",
    "content": "# Fundamentos do Empreendedorismo...",
    "sections": [...],
    "status": "generated",
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:00:00.000Z",
    "metrics": {...},
    "canContinue": true,
    "availableContinueTypes": [...]
  },
  {
    "id": "chapter_1758807951023_bq4b7smck",
    "courseId": "curso-001",
    "chapterNumber": 2,
    "title": "Identificação de Oportunidades",
    "content": "# Identificação de Oportunidades...",
    "sections": [...],
    "status": "generated",
    "createdAt": "2024-01-01T10:10:00.000Z",
    "updatedAt": "2024-01-01T10:10:00.000Z",
    "metrics": {...},
    "canContinue": true,
    "availableContinueTypes": [...]
  }
]
```

---

## 🔍 **4. Obter Capítulo Específico**

### **Endpoint**
```
GET /v1/v1/incremental/chapter/:chapterId
```

### **Descrição**
Retorna um capítulo específico com todos os seus detalhes.

### **Parâmetros**
- **`chapterId`**: ID do capítulo

### **Response**
```json
{
  "id": "chapter_1758807951022_aq3a6rlbj",
  "courseId": "curso-001",
  "chapterNumber": 1,
  "title": "Fundamentos do Empreendedorismo",
  "content": "# Fundamentos do Empreendedorismo\n\n## Introdução ao Empreendedorismo...",
  "sections": [
    {
      "id": "section-1",
      "title": "Contextualizando",
      "content": "Contexto e introdução ao tema do capítulo.",
      "type": "contextualizing",
      "subsections": [],
      "activities": []
    }
  ],
  "status": "generated",
  "createdAt": "2024-01-01T10:00:00.000Z",
  "updatedAt": "2024-01-01T10:00:00.000Z",
  "metrics": {
    "readabilityScore": 75,
    "durationMin": 2,
    "coverage": 80
  },
  "suggestions": [
    "Considere adicionar mais exemplos práticos",
    "Inclua atividades de fixação",
    "Adicione avaliações formativas"
  ],
  "canContinue": true,
  "availableContinueTypes": ["expand", "add_section", "add_activities"]
}
```

---

## 🎓 **5. Obter Filosofia Pedagógica Padrão**

### **Endpoint**
```
GET /v1/v1/incremental/philosophy
```

### **Descrição**
Retorna a filosofia pedagógica padrão que será aplicada a todos os cursos.

### **Response**
```json
{
  "content": "Educação inclusiva e acessível para todos os estudantes, com foco no desenvolvimento do pensamento crítico, criatividade e inovação. Promover o aprendizado como ferramenta de transformação social e econômica, especialmente em regiões em desenvolvimento como o Maranhão.",
  "values": ["inclusão", "qualidade", "inovação", "desenvolvimento regional", "pensamento crítico"],
  "principles": [
    "Aprendizado ativo e participativo",
    "Contextualização regional",
    "Desenvolvimento de competências",
    "Acessibilidade universal",
    "Inovação pedagógica"
  ]
}
```

---

## 🔄 Fluxo de Uso Completo

### **1. Configuração Inicial**
```bash
# Obter filosofia padrão
curl -X GET http://localhost:3005/v1/v1/incremental/philosophy \
  -H "x-api-key: test-api-key-123"
```

### **2. Criar Primeiro Capítulo**
```bash
curl -X POST http://localhost:3005/v1/v1/incremental/create-chapter \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-api-key-123" \
  -d '{
    "courseId": "curso-001",
    "courseTitle": "Fundamentos do Empreendedorismo",
    "courseDescription": "Curso completo de empreendedorismo para o Maranhão",
    "subject": "empreendedorismo",
    "educationalLevel": "Ensino Médio",
    "targetAudience": "Estudantes e jovens empreendedores",
    "template": "empreendedorismo",
    "philosophy": "Educação inclusiva e acessível para todos",
    "chapterNumber": 1,
    "aiOptions": {
      "model": "gpt-4",
      "temperature": 0.7,
      "maxTokens": 4000,
      "includeActivities": true,
      "includeAssessments": true
    }
  }'
```

### **3. Continuar/Expandir Capítulo**
```bash
curl -X POST http://localhost:3005/v1/v1/incremental/continue-chapter \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-api-key-123" \
  -d '{
    "chapterId": "chapter_1758807951022_aq3a6rlbj",
    "continueType": "expand",
    "additionalContext": "Adicionar mais exemplos práticos do Maranhão"
  }'
```

### **4. Criar Segundo Capítulo**
```bash
curl -X POST http://localhost:3005/v1/v1/incremental/create-chapter \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-api-key-123" \
  -d '{
    "courseId": "curso-001",
    "courseTitle": "Fundamentos do Empreendedorismo",
    "courseDescription": "Curso completo de empreendedorismo para o Maranhão",
    "subject": "empreendedorismo",
    "educationalLevel": "Ensino Médio",
    "targetAudience": "Estudantes e jovens empreendedores",
    "template": "empreendedorismo",
    "philosophy": "Educação inclusiva e acessível para todos",
    "chapterNumber": 2,
    "previousChapter": "Conteúdo do capítulo anterior para continuidade",
    "aiOptions": {
      "model": "gpt-4",
      "temperature": 0.7,
      "maxTokens": 4000,
      "includeActivities": true,
      "includeAssessments": true
    }
  }'
```

### **5. Listar Capítulos do Curso**
```bash
curl -X GET http://localhost:3005/v1/v1/incremental/course/curso-001/chapters \
  -H "x-api-key: test-api-key-123"
```

---

## 🎯 Vantagens da Implementação

### **1. ✅ Resolve Limitação de Tokens**
- **Geração Incremental**: Capítulo por capítulo
- **Controle Total**: Usuário decide quando parar
- **Qualidade**: Cada capítulo é focado e detalhado

### **2. ✅ Interface Intuitiva**
- **Botão "Criar Capítulo"**: Gera novo capítulo
- **Botão "Continue"**: Expande conteúdo existente
- **Templates**: Gerenciados pelo frontend
- **Filosofia Fixa**: Aplicada automaticamente

### **3. ✅ Flexibilidade Total**
- **Upload de PDFs**: Bibliografia personalizada
- **Contexto Adicional**: Instruções específicas
- **Múltiplos Tipos**: Expandir, adicionar seções, atividades, avaliações

### **4. ✅ Fallback Robusto**
- **Conteúdo Simulado**: Se IA falhar
- **Estrutura Completa**: Seções, atividades, avaliações
- **Métricas**: Score de qualidade calculado

---

## 🛠️ Configuração e Deploy

### **Variáveis de Ambiente**
```bash
# AI Service
OPENAI_API_KEY=sk-proj-...
PORT=3005
API_KEY=test-api-key-123
LOG_LEVEL=info
```

### **Dependências**
```json
{
  "@nestjs/common": "^10.0.0",
  "@nestjs/swagger": "^7.0.0",
  "class-validator": "^0.14.0",
  "class-transformer": "^0.5.0"
}
```

### **Instalação**
```bash
# Instalar dependências
npm install

# Compilar
npm run build

# Executar
npm run start:dev
```

---

## 📊 Métricas e Monitoramento

### **Métricas Coletadas**
- **Readability Score**: 0-100 (legibilidade)
- **Duration**: Minutos de leitura estimados
- **Coverage**: 0-100 (cobertura do tópico)
- **Tokens**: Uso de tokens (custo)
- **Latency**: Tempo de processamento

### **Logs Estruturados**
```json
{
  "timestamp": "2024-01-01T10:00:00.000Z",
  "level": "info",
  "message": "Capítulo criado com sucesso",
  "chapterId": "chapter_123",
  "courseId": "curso-001",
  "duration": 5000,
  "tokensUsed": 1500,
  "costUsd": 0.05
}
```

---

## 🚨 Tratamento de Erros

### **Códigos de Status**
- **200**: Sucesso
- **201**: Capítulo criado
- **400**: Dados inválidos
- **401**: Não autorizado
- **404**: Capítulo não encontrado
- **503**: Serviço indisponível

### **Estrutura de Erro**
```json
{
  "message": "Descrição do erro",
  "error": "Tipo do erro",
  "statusCode": 400,
  "timestamp": "2024-01-01T10:00:00.000Z",
  "path": "/v1/incremental/create-chapter"
}
```

---

## 🔮 Próximos Passos

### **Funcionalidades Planejadas**
1. **Upload de PDFs**: Integração com bibliografia
2. **Templates Customizados**: Gerenciamento de templates pelo frontend
3. **Colaboração**: Edição colaborativa em tempo real
4. **Versionamento**: Controle de versões do conteúdo
5. **Analytics**: Métricas de uso e qualidade
6. **Exportação**: PDF, DOCX, HTML
7. **Integração LMS**: Sincronização com plataformas educacionais

### **Melhorias Técnicas**
1. **Cache**: Cache de respostas do AI Service
2. **Offline**: Modo offline com sincronização
3. **Performance**: Otimização de carregamento
4. **Acessibilidade**: Melhorias de acessibilidade
5. **Internacionalização**: Suporte a múltiplos idiomas

---

## 📚 Recursos Adicionais

### **Documentação Relacionada**
- **API Reference**: Documentação completa da API
- **Swagger UI**: `http://localhost:3005/api`
- **Health Check**: `http://localhost:3005/v1/health`
- **Métricas**: `http://localhost:3005/v1/metrics`

### **Links Úteis**
- **AI Service Health**: `http://localhost:3005/v1/health`
- **AI Service Metrics**: `http://localhost:3005/v1/metrics`
- **Swagger Documentation**: `http://localhost:3005/api`

---

## 🎉 Conclusão

A **Geração Incremental de Cursos** representa uma evolução significativa na criação de conteúdo educacional, oferecendo:

- ✅ **Interface Intuitiva**: Fácil de usar para educadores
- ✅ **Geração Inteligente**: IA especializada em conteúdo educacional
- ✅ **Controle Total**: Edição e refinamento completo
- ✅ **Templates Flexíveis**: Adaptáveis a diferentes disciplinas
- ✅ **Integração Robusta**: Cliente AI Service confiável
- ✅ **Monitoramento**: Métricas de qualidade e performance

O sistema está pronto para uso e pode ser expandido conforme necessário para atender às demandas específicas de cada instituição educacional.

---

**📝 Documento gerado em**: 29 de Setembro de 2025  
**🤖 AI Service Version**: 1.0.0  
**🔗 Base URL**: `http://localhost:3005/v1/v1/incremental`
