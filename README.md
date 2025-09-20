# ia-service (Eduflow)

Microserviço responsável por orquestrar chamadas à IA (ChatGPT), validar/normalizar respostas, aplicar políticas da empresa e retornar payloads adaptados para o frontend do Eduflow.

## 🚀 Funcionalidades

- **Processamento de Conteúdo**: Análise e processamento de conteúdo educacional com IA
- **Modo Síncrono e Assíncrono**: Suporte a processamento em tempo real e via filas
- **Validação de Políticas**: Aplicação de termos obrigatórios, proibidos e diretrizes de estilo
- **Logs Estruturados**: Sistema completo de logging e observabilidade
- **Métricas Prometheus**: Monitoramento de performance e uso
- **Autenticação**: JWT e API Key para diferentes tipos de acesso
- **Rate Limiting**: Controle de taxa de requisições
- **Callbacks**: Notificações assíncronas para sistemas externos

## 📋 Pré-requisitos

- Node.js 18+
- Redis (para filas)
- Chave da API OpenAI

## 🛠️ Instalação

1. Clone o repositório:
```bash
git clone <repository-url>
cd ai-service
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp env.example .env
```

4. Edite o arquivo `.env` com suas configurações:
```env
# Chave da API OpenAI
OPENAI_API_KEY=sk-your-openai-api-key-here

# Configuração do Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Outras configurações...
```

## 🚀 Execução

### Desenvolvimento
```bash
npm run start:dev
```

### Produção
```bash
npm run build
npm run start:prod
```

## 📚 Documentação da API

A documentação completa da API está disponível via Swagger em:
- **Desenvolvimento**: http://localhost:3005/api
- **Produção**: https://ia-service.internal.svc.cluster.local/api

## 🏥 Health Checks

- **Health**: `GET /v1/health` - Status geral do serviço
- **Readiness**: `GET /v1/ready` - Verifica se está pronto para receber requisições
- **Métricas**: `GET /v1/metrics` - Métricas no formato Prometheus

## 🔧 Endpoints Principais

### Processar Conteúdo
```http
POST /v1/process-content
Content-Type: application/json
Authorization: Bearer <jwt-token>
# ou
x-api-key: <api-key>

{
  "workflowId": "uuid",
  "authorId": "user_123",
  "mode": "sync", // ou "async"
  "text": "Conteúdo educacional...",
  "metadata": {
    "title": "Capítulo 1",
    "discipline": "História",
    "courseId": "c_123",
    "language": "pt-BR"
  },
  "policy": {
    "requiredTerms": ["Eduflow"],
    "forbiddenTerms": ["pirataria"]
  },
  "options": {
    "maxResponseTokens": 2000,
    "temperature": 0.2,
    "modelHint": "gpt-4o"
  }
}
```

### Verificar Status
```http
GET /v1/status/{workflowId}
Authorization: Bearer <jwt-token>
```

## 🏗️ Arquitetura

### Módulos

- **ProcessingModule**: Controller e service principal para `/process-content`
- **ValidationModule**: Validação de payloads e políticas
- **PromptBuilderModule**: Construção de prompts estruturados para IA
- **IaProviderModule**: Integração com OpenAI
- **QueueModule**: Gerenciamento de filas assíncronas (BullMQ)
- **CallbackModule**: Envio de callbacks para sistemas externos
- **LoggingModule**: Sistema de logs estruturados
- **MetricsModule**: Métricas Prometheus
- **PersistenceModule**: Persistência de execuções
- **AuthModule**: Autenticação JWT e API Key
- **HealthModule**: Health checks e monitoramento

### Fluxo de Processamento

1. **Validação**: Payload e políticas são validados
2. **Sanitização**: Texto é sanitizado para segurança
3. **Prompt Building**: Prompt estruturado é construído
4. **IA Processing**: Envio para OpenAI com validação de resposta
5. **Policy Validation**: Aplicação de validações de política
6. **Response Formatting**: Formatação para o frontend
7. **Persistence**: Salvamento da execução
8. **Callback**: Notificação assíncrona (se aplicável)

## 🔒 Segurança

- **JWT**: Autenticação para clientes externos
- **API Key**: Autenticação para serviços internos
- **Rate Limiting**: 10 requisições por minuto por usuário
- **Sanitização**: Limpeza de HTML/JS malicioso
- **CORS**: Configuração de origens permitidas

## 📊 Monitoramento

### Métricas Disponíveis

- `ia_service_requests_total`: Total de requisições
- `ia_service_request_duration_seconds`: Duração das requisições
- `ia_service_active_requests`: Requisições ativas
- `ia_service_queue_size`: Tamanho da fila
- `ia_service_tokens_total`: Tokens utilizados
- `ia_service_cost_usd_total`: Custo em USD
- `ia_service_errors_total`: Total de erros

### Logs Estruturados

Todos os logs incluem:
- `requestId`: ID único da requisição
- `workflowId`: ID de correlação do workflow
- `userId`: ID do usuário
- `status`: Status da execução
- `duration`: Tempo de execução
- `tokensIn/Out`: Tokens utilizados
- `costUsd`: Custo estimado

## 🧪 Testes

```bash
# Testes unitários
npm run test

# Testes e2e
npm run test:e2e

# Cobertura
npm run test:cov
```

## 🚀 Deploy

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3005
CMD ["node", "dist/main"]
```

### Kubernetes

O serviço está configurado para rodar em Kubernetes com:
- Health checks configurados
- Métricas expostas para Prometheus
- Configuração de recursos
- Secrets para variáveis sensíveis

## 📝 Licença

Este projeto é licenciado sob a licença MIT.

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📞 Suporte

Para suporte, entre em contato com a equipe de infraestrutura:
- Email: infra@eduflow.example
- Documentação: https://wiki.eduflow.example/ia-service