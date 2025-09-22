# 🎓 IA-SERVICE - Sistema de Criação de Componentes Educacionais

## 📚 **Visão Geral**

O **ia-service** é um microserviço especializado em criação automática de componentes educacionais usando IA (OpenAI GPT-4). Ele processa conteúdo textual e gera automaticamente:

- 📝 **Resumos educacionais**
- 📊 **Métricas de qualidade**
- 🧠 **Quizzes automáticos**
- 💡 **Sugestões de melhoria**
- 📚 **Texto melhorado e estruturado**
- 🚨 **Validação de políticas educacionais**

---

## 🚀 **Quick Start**

### **1. Configuração**
```bash
# URL base
BASE_URL="http://localhost:3005"

# API Key
API_KEY="test-api-key-123"
```

### **2. Exemplo Mínimo**
```bash
curl -X POST http://localhost:3005/v1/process-content \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-api-key-123" \
  -d '{
    "workflowId": "123e4567-e89b-12d3-a456-426614174000",
    "authorId": "user-123",
    "text": "JavaScript é uma linguagem de programação.",
    "metadata": {
      "title": "JavaScript Básico",
      "discipline": "Programação",
      "courseId": "curso-001",
      "language": "pt-BR"
    }
  }'
```

### **3. Resposta**
```json
{
  "workflowId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "completed",
  "payload": {
    "summary": "JavaScript é uma linguagem de programação...",
    "metrics": {
      "readabilityScore": 85,
      "durationMin": 2,
      "coverage": 90
    },
    "violations": [],
    "suggestions": [...],
    "quiz": [...],
    "improvedText": [...]
  }
}
```

---

## 📋 **Documentação**

### **📖 [API Reference](./API-REFERENCE.md)**
Documentação completa da API com todos os endpoints, parâmetros, respostas e códigos de status.

### **⚡ [Quick Start](./QUICK-START.md)**
Guia de integração rápida em 5 minutos com exemplos práticos.

### **🔗 [Integration Examples](./INTEGRATION-EXAMPLES.md)**
Exemplos práticos de integração para diferentes cenários:
- Sistema de LMS
- Análise de conteúdo
- Geração de quizzes
- Melhoria de conteúdo

### **📚 [Componentes Educacionais](./COMPONENTES-EDUCACIONAIS.md)**
Documentação detalhada sobre os componentes educacionais criados automaticamente.

### **🏆 [Sistema Completo](./SISTEMA-COMPLETO-FUNCIONAL.md)**
Visão geral completa do sistema e suas funcionalidades.

---

## 🎯 **Endpoints Principais**

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/v1/process-content` | POST | Processa conteúdo e gera componentes |
| `/v1/status/{workflowId}` | GET | Consulta status de processamento |
| `/v1/health` | GET | Health check do serviço |
| `/v1/metrics` | GET | Métricas em formato Prometheus |
| `/v1/debug-auth` | GET | Teste de autenticação |

---

## 🔧 **Configuração**

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
```bash
docker build -t ia-service .
docker run -p 3005:3005 -e OPENAI_API_KEY=sk-proj-... ia-service
```

---

## 🎓 **Casos de Uso**

### **1. Criação de Material Didático**
Professores enviam conteúdo e o sistema gera automaticamente quizzes, resumos e sugestões de melhoria.

### **2. Análise de Qualidade**
Analisa conteúdo existente e fornece métricas de legibilidade, duração e cobertura.

### **3. Geração de Quizzes**
Cria automaticamente questões de múltipla escolha baseadas no conteúdo.

### **4. Melhoria de Conteúdo**
Sugere melhorias e reestrutura texto educacional para maior clareza.

### **5. Processamento de Grandes Livros**
Suporta processamento de livros completos e materiais extensos sem limitações de tamanho.

---

## 🔒 **Autenticação**

### **API Key (Recomendado)**
```http
x-api-key: test-api-key-123
```

### **JWT Bearer Token**
```http
Authorization: Bearer <jwt-token>
```

---

## 📊 **Rate Limiting**

- **Limite**: 5 requisições por 5 minutos
- **Janela**: 300 segundos
- **Headers**: `X-RateLimit-*`

---

## 🚨 **Códigos de Status**

| Código | Descrição |
|--------|-----------|
| `200` | Sucesso |
| `202` | Processamento assíncrono iniciado |
| `400` | Payload inválido |
| `401` | Não autorizado |
| `429` | Rate limit excedido |
| `500` | Erro interno |

---

## 📈 **Monitoramento**

### **Logs Estruturados**
Todos os logs são estruturados em JSON com:
- `requestId`: ID único da requisição
- `workflowId`: ID de correlação
- `userId`: ID do usuário
- `status`: Status da operação
- `duration`: Tempo de processamento
- `tokensIn/Out`: Uso de tokens
- `costUsd`: Custo estimado

### **Métricas**
- `http_requests_total`: Total de requisições
- `http_request_duration_seconds`: Duração das requisições
- `ai_tokens_used_total`: Tokens utilizados
- `ai_cost_usd_total`: Custo total
- `processing_errors_total`: Erros de processamento

---

## 🎯 **Exemplos de Integração**

### **JavaScript/Node.js**
```javascript
const response = await fetch('http://localhost:3005/v1/process-content', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'test-api-key-123'
  },
  body: JSON.stringify({
    workflowId: crypto.randomUUID(),
    authorId: 'user-123',
    text: 'Seu conteúdo aqui...',
    metadata: {
      title: 'Título',
      discipline: 'Disciplina',
      courseId: 'curso-001',
      language: 'pt-BR'
    }
  })
});

const result = await response.json();
console.log('Quiz gerado:', result.payload.quiz);
```

### **Python**
```python
import requests
import uuid

response = requests.post('http://localhost:3005/v1/process-content', 
  headers={
    'Content-Type': 'application/json',
    'x-api-key': 'test-api-key-123'
  },
  json={
    'workflowId': str(uuid.uuid4()),
    'authorId': 'user-123',
    'text': 'Seu conteúdo aqui...',
    'metadata': {
      'title': 'Título',
      'discipline': 'Disciplina',
      'courseId': 'curso-001',
      'language': 'pt-BR'
    }
  }
)

result = response.json()
print('Resumo:', result['payload']['summary'])
```

### **PHP**
```php
$data = [
    'workflowId' => uniqid(),
    'authorId' => 'user-123',
    'text' => 'Seu conteúdo aqui...',
    'metadata' => [
        'title' => 'Título',
        'discipline' => 'Disciplina',
        'courseId' => 'curso-001',
        'language' => 'pt-BR'
    ]
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'http://localhost:3005/v1/process-content');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'x-api-key: test-api-key-123'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$result = json_decode($response, true);
echo 'Sugestões:', json_encode($result['payload']['suggestions']);
```

---

## 🏆 **Funcionalidades**

### **✅ Implementado**
- ✅ Integração com OpenAI GPT-4
- ✅ Criação automática de componentes educacionais
- ✅ Validação de políticas educacionais
- ✅ Geração de quizzes automáticos
- ✅ Análise de legibilidade e métricas
- ✅ Sugestões de melhoria inteligentes
- ✅ Texto melhorado e estruturado
- ✅ Logs estruturados e observabilidade
- ✅ Autenticação e segurança robustas
- ✅ Rate limiting e validação de entrada
- ✅ Suporte a grandes livros e materiais extensos

### **🎯 Componentes Gerados**
- 📝 Resumos educacionais automáticos
- 📊 Métricas de qualidade (legibilidade, duração, cobertura)
- 🧠 Quizzes de múltipla escolha contextualizados
- 💡 Sugestões de melhoria específicas
- 📚 Texto reestruturado e melhorado
- 🚨 Validação de conformidade com políticas
- 🏷️ Metadados organizados e rastreáveis

---

## 🚀 **Deploy**

### **Requisitos**
- Node.js 18+
- OpenAI API Key
- Redis (opcional, para filas)
- 2GB RAM mínimo
- 1 CPU core mínimo

### **Produção**
```bash
NODE_ENV=production
PORT=3005
OPENAI_API_KEY=sk-proj-...
API_KEY=your-secure-api-key
LOG_LEVEL=info
```

---

## 📞 **Suporte**

- **Documentação**: [API Reference](./API-REFERENCE.md)
- **Exemplos**: [Integration Examples](./INTEGRATION-EXAMPLES.md)
- **Quick Start**: [Quick Start](./QUICK-START.md)
- **Logs**: Estruturados em JSON
- **Métricas**: Endpoint `/v1/metrics`
- **Health**: Endpoint `/v1/health`

---

## 🎉 **Status**

**🟢 SISTEMA 100% FUNCIONAL E PRONTO PARA PRODUÇÃO!**

- 🎯 **Objetivo**: Criação automática de componentes educacionais com IA
- ✅ **Status**: 100% FUNCIONAL E OPERACIONAL
- 🚀 **Capacidades**: Suporte a grandes livros e materiais extensos
- 🔒 **Segurança**: Autenticação robusta e validação rigorosa
- 📊 **Observabilidade**: Logs estruturados e métricas completas

---

**🎓 O ia-service está pronto para criar componentes educacionais automaticamente usando IA!**

*Versão: 1.0.0*  
*Última atualização: 2025-09-22*