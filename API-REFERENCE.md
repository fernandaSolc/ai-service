# 📚 API REFERENCE - IA-SERVICE

## 🎯 **Visão Geral**

O **ia-service** é um microserviço especializado em criação automática de componentes educacionais usando IA (OpenAI GPT-4). Ele processa conteúdo textual e gera automaticamente resumos, quizzes, sugestões de melhoria e texto estruturado.

**Base URL**: `http://localhost:3005`  
**Versão**: `v1`  
**Protocolo**: `HTTP/HTTPS`

---

## 🔐 **Autenticação**

### **API Key (Recomendado para serviços internos)**
```http
x-api-key: test-api-key-123
```

### **JWT Bearer Token (Para clientes externos)**
```http
Authorization: Bearer <jwt-token>
```

---

## 📋 **Endpoints Disponíveis**

### **1. Processamento de Conteúdo Educacional**

#### **POST** `/v1/process-content`

Processa conteúdo educacional e gera componentes automaticamente.

**Headers:**
```http
Content-Type: application/json
x-api-key: test-api-key-123
```

**Request Body:**
```json
{
  "workflowId": "uuid-123",
  "authorId": "user-456",
  "mode": "sync",
  "text": "Conteúdo educacional a ser processado...",
  "metadata": {
    "title": "Título do Conteúdo",
    "discipline": "Disciplina",
    "courseId": "curso-001",
    "language": "pt-BR",
    "tags": ["tag1", "tag2"]
  },
  "policy": {
    "requiredTerms": ["termo1", "termo2"],
    "forbiddenTerms": ["termo-proibido"],
    "styleGuidelines": ["Diretriz 1", "Diretriz 2"]
  },
  "options": {
    "maxResponseTokens": 8000,
    "temperature": 0.2,
    "modelHint": "gpt-4o-mini"
  },
  "callbackUrl": "https://example.com/callback" // Opcional para modo async
}
```

**Response (200 OK):**
```json
{
  "workflowId": "uuid-123",
  "status": "completed",
  "payload": {
    "summary": "Resumo do conteúdo educacional...",
    "metrics": {
      "readabilityScore": 85,
      "durationMin": 15,
      "coverage": 90
    },
    "violations": [],
    "suggestions": [
      {
        "section": "Seção",
        "message": "Sugestão de melhoria"
      }
    ],
    "quiz": [
      {
        "q": "Pergunta do quiz?",
        "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
        "correct": 0
      }
    ],
    "improvedText": [
      {
        "section": "Seção",
        "content": "Texto melhorado e estruturado..."
      }
    ],
    "meta": {
      "rawId": "id-original",
      "adaptedId": "id-adaptado"
    }
  },
  "execution": {
    "model": "gpt-4o-mini",
    "tokensIn": 1500,
    "tokensOut": 800,
    "latencyMs": 5000,
    "costUsd": 0.0025
  }
}
```

### **2. Status de Processamento**

#### **GET** `/v1/status/{workflowId}`

Consulta o status de um processamento.

**Headers:**
```http
x-api-key: test-api-key-123
```

**Response (200 OK):**
```json
{
  "workflowId": "uuid-123",
  "status": "completed",
  "createdAt": "2025-09-22T02:00:00Z",
  "updatedAt": "2025-09-22T02:05:00Z",
  "result": { /* payload completo */ }
}
```

### **3. Health Check**

#### **GET** `/v1/health`

Verifica a saúde do serviço.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-22T02:00:00Z",
  "version": "1.0.0",
  "uptime": 3600
}
```

### **4. Métricas**

#### **GET** `/v1/metrics`

Retorna métricas do serviço em formato Prometheus.

**Response (200 OK):**
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="POST",route="/v1/process-content",status="200"} 150
```

### **5. Debug de Autenticação**

#### **GET** `/v1/debug-auth`

Testa se a autenticação está funcionando.

**Headers:**
```http
x-api-key: test-api-key-123
```

**Response (200 OK):**
```json
{
  "message": "Autenticação funcionando!",
  "timestamp": "2025-09-22T02:00:00Z",
  "status": "success"
}
```

---

## 📊 **Códigos de Status HTTP**

| Código | Descrição | Ação |
|--------|-----------|------|
| `200` | Sucesso | Processamento concluído |
| `202` | Aceito | Processamento assíncrono iniciado |
| `400` | Bad Request | Payload inválido |
| `401` | Unauthorized | API key inválida ou ausente |
| `429` | Too Many Requests | Rate limit excedido |
| `500` | Internal Server Error | Erro interno do servidor |
| `503` | Service Unavailable | Serviço temporariamente indisponível |

---

## 🔧 **Configurações e Limites**

### **Rate Limiting**
- **Limite**: 5 requisições por 5 minutos
- **Janela**: 300 segundos
- **Headers de resposta**: `X-RateLimit-*`

### **Timeouts**
- **Processamento**: 5 minutos (300 segundos)
- **OpenAI**: 5 minutos
- **Retry**: 3 tentativas

### **Limites de Conteúdo**
- **Texto de entrada**: Sem limite (suporta grandes livros)
- **Tokens de resposta**: 8000 (configurável)
- **Tamanho do payload**: Sem limite

---

## 📝 **Exemplos de Uso**

### **Exemplo 1: Processamento Simples**

```bash
curl -X POST http://localhost:3005/v1/process-content \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-api-key-123" \
  -d '{
    "workflowId": "123e4567-e89b-12d3-a456-426614174000",
    "authorId": "professor-123",
    "text": "JavaScript é uma linguagem de programação...",
    "metadata": {
      "title": "JavaScript Básico",
      "discipline": "Programação",
      "courseId": "curso-js-001",
      "language": "pt-BR"
    }
  }'
```

### **Exemplo 2: Processamento com Políticas**

```bash
curl -X POST http://localhost:3005/v1/process-content \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-api-key-123" \
  -d '{
    "workflowId": "123e4567-e89b-12d3-a456-426614174000",
    "authorId": "professor-123",
    "text": "Conteúdo educacional extenso...",
    "metadata": {
      "title": "Algoritmos de Ordenação",
      "discipline": "Ciência da Computação",
      "courseId": "algoritmos-001",
      "language": "pt-BR",
      "tags": ["algoritmos", "ordenação", "programação"]
    },
    "policy": {
      "requiredTerms": ["algoritmo", "complexidade"],
      "forbiddenTerms": ["violência"],
      "styleGuidelines": ["Linguagem técnica mas acessível"]
    },
    "options": {
      "maxResponseTokens": 8000,
      "temperature": 0.2,
      "modelHint": "gpt-4o-mini"
    }
  }'
```

### **Exemplo 3: Consulta de Status**

```bash
curl -X GET http://localhost:3005/v1/status/123e4567-e89b-12d3-a456-426614174000 \
  -H "x-api-key: test-api-key-123"
```

---

## 🎯 **Casos de Uso**

### **1. Criação de Material Didático**
```javascript
const response = await fetch('http://localhost:3005/v1/process-content', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'test-api-key-123'
  },
  body: JSON.stringify({
    workflowId: generateUUID(),
    authorId: 'professor-123',
    text: 'Conteúdo do material didático...',
    metadata: {
      title: 'Material Didático',
      discipline: 'Matemática',
      courseId: 'mat-001',
      language: 'pt-BR'
    }
  })
});

const result = await response.json();
// Usar result.payload.quiz para criar avaliações
// Usar result.payload.summary para resumos
// Usar result.payload.suggestions para melhorias
```

### **2. Análise de Conteúdo Existente**
```javascript
const analysis = await fetch('http://localhost:3005/v1/process-content', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'test-api-key-123'
  },
  body: JSON.stringify({
    workflowId: generateUUID(),
    authorId: 'analista-456',
    text: 'Conteúdo existente para análise...',
    metadata: {
      title: 'Análise de Conteúdo',
      discipline: 'História',
      courseId: 'hist-001',
      language: 'pt-BR'
    },
    policy: {
      requiredTerms: ['história', 'cronologia'],
      forbiddenTerms: ['anacronismo'],
      styleGuidelines: ['Linguagem acadêmica', 'Precisão histórica']
    }
  })
});
```

### **3. Geração de Quizzes Automáticos**
```javascript
const quizGeneration = await fetch('http://localhost:3005/v1/process-content', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'test-api-key-123'
  },
  body: JSON.stringify({
    workflowId: generateUUID(),
    authorId: 'quiz-master-789',
    text: 'Conteúdo para gerar quiz...',
    metadata: {
      title: 'Quiz de Ciências',
      discipline: 'Ciências',
      courseId: 'ciencias-001',
      language: 'pt-BR'
    },
    options: {
      maxResponseTokens: 8000,
      temperature: 0.3 // Mais criatividade para questões
    }
  })
});

const quiz = await quizGeneration.json();
// Usar quiz.payload.quiz para questões
// Cada questão tem: q, options[], correct
```

---

## 🔍 **Estrutura de Dados**

### **ProcessRequestDto**
```typescript
interface ProcessRequestDto {
  workflowId: string;           // UUID único para correlação
  authorId: string;             // ID do autor/professor
  mode: 'sync' | 'async';      // Modo de processamento
  text: string;                 // Conteúdo a ser processado
  metadata: MetadataDto;        // Metadados do conteúdo
  policy?: PolicyDto;           // Políticas de validação
  options?: OptionsDto;         // Opções de processamento
  callbackUrl?: string;         // URL para callback (async)
}
```

### **MetadataDto**
```typescript
interface MetadataDto {
  title: string;                // Título do conteúdo
  discipline: string;           // Disciplina
  courseId: string;             // ID do curso
  language: string;             // Idioma (pt-BR, en-US, etc.)
  tags?: string[];              // Tags opcionais
}
```

### **PolicyDto**
```typescript
interface PolicyDto {
  requiredTerms?: string[];     // Termos que devem estar presentes
  forbiddenTerms?: string[];    // Termos que não devem aparecer
  styleGuidelines?: string[];   // Diretrizes de estilo
}
```

### **OptionsDto**
```typescript
interface OptionsDto {
  maxResponseTokens?: number;   // Máximo de tokens na resposta
  temperature?: number;         // Criatividade (0.0-1.0)
  modelHint?: string;           // Modelo preferido
}
```

### **ProcessResponseDto**
```typescript
interface ProcessResponseDto {
  workflowId: string;           // UUID de correlação
  status: 'completed' | 'error' | 'processing';
  payload: WorkflowFrontendPayloadDto;
  execution: ExecutionMetadataDto;
}
```

### **WorkflowFrontendPayloadDto**
```typescript
interface WorkflowFrontendPayloadDto {
  summary: string;              // Resumo do conteúdo
  metrics: {
    readabilityScore: number;   // 0-100
    durationMin: number;        // Minutos de leitura
    coverage: number;           // 0-100
  };
  violations: ViolationDto[];   // Violações encontradas
  suggestions: SuggestionDto[]; // Sugestões de melhoria
  quiz: QuizQuestionDto[];      // Questões do quiz
  improvedText: TextSectionDto[]; // Texto melhorado
  meta: {
    rawId: string;              // ID original
    adaptedId: string;          // ID adaptado
  };
}
```

---

## 🚨 **Tratamento de Erros**

### **Erro de Validação (400)**
```json
{
  "statusCode": 400,
  "message": [
    "workflowId must be a UUID",
    "text must be a string",
    "metadata.title should not be empty"
  ],
  "error": "Bad Request"
}
```

### **Erro de Autenticação (401)**
```json
{
  "statusCode": 401,
  "message": "API key não fornecida",
  "error": "Unauthorized"
}
```

### **Rate Limit (429)**
```json
{
  "statusCode": 429,
  "message": "Too Many Requests",
  "error": "ThrottlerException"
}
```

### **Erro Interno (500)**
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "InternalServerError"
}
```

---

## 📈 **Monitoramento e Observabilidade**

### **Logs Estruturados**
Todos os logs são estruturados em JSON com:
- `requestId`: ID único da requisição
- `workflowId`: ID de correlação
- `userId`: ID do usuário
- `status`: Status da operação
- `duration`: Tempo de processamento
- `tokensIn/Out`: Uso de tokens
- `costUsd`: Custo estimado

### **Métricas Disponíveis**
- `http_requests_total`: Total de requisições
- `http_request_duration_seconds`: Duração das requisições
- `ai_tokens_used_total`: Tokens utilizados
- `ai_cost_usd_total`: Custo total
- `processing_errors_total`: Erros de processamento

### **Health Checks**
- `/v1/health`: Status geral do serviço
- `/v1/ready`: Pronto para receber requisições
- `/v1/metrics`: Métricas em formato Prometheus

---

## 🔧 **Configuração do Ambiente**

### **Variáveis de Ambiente**
```bash
# OpenAI
OPENAI_API_KEY=sk-proj-...

# Serviço
PORT=3005
API_KEY=test-api-key-123
LOG_LEVEL=info

# Redis (opcional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://eduflow.example.com

# JWT
JWT_SECRET=your-jwt-secret-here
```

### **Docker**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3005
CMD ["node", "dist/main.js"]
```

### **Docker Compose**
```yaml
version: '3.8'
services:
  ia-service:
    build: .
    ports:
      - "3005:3005"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - API_KEY=${API_KEY}
    depends_on:
      - redis
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

---

## 🎓 **Exemplos de Integração**

### **Node.js/Express**
```javascript
const axios = require('axios');

class IaServiceClient {
  constructor(baseUrl = 'http://localhost:3005', apiKey = 'test-api-key-123') {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async processContent(content) {
    try {
      const response = await axios.post(`${this.baseUrl}/v1/process-content`, {
        workflowId: this.generateUUID(),
        authorId: 'system',
        text: content.text,
        metadata: content.metadata,
        policy: content.policy,
        options: content.options
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        }
      });
      
      return response.data;
    } catch (error) {
      throw new Error(`IA Service Error: ${error.response?.data?.message || error.message}`);
    }
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// Uso
const iaClient = new IaServiceClient();
const result = await iaClient.processContent({
  text: 'Conteúdo educacional...',
  metadata: {
    title: 'Meu Conteúdo',
    discipline: 'Matemática',
    courseId: 'mat-001',
    language: 'pt-BR'
  }
});
```

### **Python**
```python
import requests
import uuid
import json

class IaServiceClient:
    def __init__(self, base_url='http://localhost:3005', api_key='test-api-key-123'):
        self.base_url = base_url
        self.api_key = api_key
    
    def process_content(self, content):
        payload = {
            'workflowId': str(uuid.uuid4()),
            'authorId': 'system',
            'text': content['text'],
            'metadata': content['metadata'],
            'policy': content.get('policy'),
            'options': content.get('options')
        }
        
        headers = {
            'Content-Type': 'application/json',
            'x-api-key': self.api_key
        }
        
        try:
            response = requests.post(
                f'{self.base_url}/v1/process-content',
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f'IA Service Error: {e}')

# Uso
ia_client = IaServiceClient()
result = ia_client.process_content({
    'text': 'Conteúdo educacional...',
    'metadata': {
        'title': 'Meu Conteúdo',
        'discipline': 'Matemática',
        'courseId': 'mat-001',
        'language': 'pt-BR'
    }
})
```

### **PHP**
```php
<?php
class IaServiceClient {
    private $baseUrl;
    private $apiKey;
    
    public function __construct($baseUrl = 'http://localhost:3005', $apiKey = 'test-api-key-123') {
        $this->baseUrl = $baseUrl;
        $this->apiKey = $apiKey;
    }
    
    public function processContent($content) {
        $payload = [
            'workflowId' => $this->generateUUID(),
            'authorId' => 'system',
            'text' => $content['text'],
            'metadata' => $content['metadata'],
            'policy' => $content['policy'] ?? null,
            'options' => $content['options'] ?? null
        ];
        
        $headers = [
            'Content-Type: application/json',
            'x-api-key: ' . $this->apiKey
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $this->baseUrl . '/v1/process-content');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            throw new Exception('IA Service Error: ' . $response);
        }
        
        return json_decode($response, true);
    }
    
    private function generateUUID() {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
}

// Uso
$iaClient = new IaServiceClient();
$result = $iaClient->processContent([
    'text' => 'Conteúdo educacional...',
    'metadata' => [
        'title' => 'Meu Conteúdo',
        'discipline' => 'Matemática',
        'courseId' => 'mat-001',
        'language' => 'pt-BR'
    ]
]);
?>
```

---

## 🚀 **Deploy e Produção**

### **Requisitos**
- Node.js 18+
- OpenAI API Key
- Redis (opcional, para filas)
- 2GB RAM mínimo
- 1 CPU core mínimo

### **Variáveis de Produção**
```bash
NODE_ENV=production
PORT=3005
OPENAI_API_KEY=sk-proj-...
API_KEY=your-secure-api-key
LOG_LEVEL=info
REDIS_HOST=redis-cluster
REDIS_PORT=6379
REDIS_PASSWORD=secure-password
ALLOWED_ORIGINS=https://yourdomain.com
JWT_SECRET=your-jwt-secret
```

### **Health Check para Load Balancer**
```bash
curl -f http://localhost:3005/v1/health || exit 1
```

---

## 📞 **Suporte e Contato**

- **Documentação**: Este arquivo
- **Logs**: Estruturados em JSON
- **Métricas**: Endpoint `/v1/metrics`
- **Health**: Endpoint `/v1/health`

---

**🎓 O ia-service está pronto para criar componentes educacionais automaticamente usando IA!**

*Versão: 1.0.0*  
*Última atualização: 2025-09-22*
