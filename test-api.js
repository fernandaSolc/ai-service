// Script de teste para verificar se a API está funcionando
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3005/v1';

async function testAPI() {
  console.log('🧪 Testando ia-service...\n');

  try {
    // 1. Testar health check
    console.log('1. Testando health check...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Health check:', healthResponse.data);
    console.log('');

    // 2. Testar readiness
    console.log('2. Testando readiness...');
    const readinessResponse = await axios.get(`${API_BASE_URL}/ready`);
    console.log('✅ Readiness:', readinessResponse.data);
    console.log('');

    // 3. Testar métricas
    console.log('3. Testando métricas...');
    const metricsResponse = await axios.get(`${API_BASE_URL}/metrics`);
    console.log('✅ Métricas disponíveis (primeiras 200 chars):', metricsResponse.data.substring(0, 200) + '...');
    console.log('');

    // 4. Testar processamento (sem autenticação para teste)
    console.log('4. Testando processamento de conteúdo...');
    const processData = {
      workflowId: 'test-workflow-123',
      authorId: 'admin',
      mode: 'sync',
      text: '## Introdução\nEste é um teste do sistema de processamento de conteúdo educacional.',
      metadata: {
        title: 'Teste de Conteúdo',
        discipline: 'Teste',
        courseId: 'test-course',
        language: 'pt-BR'
      },
      policy: {
        requiredTerms: ['teste'],
        forbiddenTerms: ['erro']
      }
    };

    try {
      const processResponse = await axios.post(`${API_BASE_URL}/process-content`, processData, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': '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' // Use a API key configurada
        }
      });
      console.log('✅ Processamento:', processResponse.data);
    } catch (error) {
      console.log('⚠️ Processamento falhou (esperado sem API key válida):', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

// Executar teste
testAPI();
