import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './modules/logging/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);

  // Configurar limite de payload para 10MB
  app.use(require('express').json({ limit: '10mb' }));
  app.use(require('express').urlencoded({ limit: '10mb', extended: true }));

  // Configurar timeout para processamento de arquivos grandes
  app.use((req, res, next) => {
    // Timeout de 5 minutos para requisições com PDFs
    if (req.body && (req.body.pdfBibliographies || req.body.bibliographies)) {
      req.setTimeout(300000); // 5 minutos
      res.setTimeout(300000); // 5 minutos
    }
    next();
  });

  // Configurar CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3005', 'http://localhost:3001', 'https://eduflow.pro', 'https://api.eduflow.pro'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  });

  // Configurar validação global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Configurar interceptor de logging global
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Configurar Swagger
  const config = new DocumentBuilder()
    .setTitle('ia-service (Eduflow)')
    .setDescription(
      'Serviço responsável por orquestrar chamadas à IA (ChatGPT), validar/normalizar respostas, ' +
      'aplicar políticas da empresa e retornar payloads adaptados para o frontend do Eduflow. ' +
      'Suporta modo sync e async (fila/callback). Logs estruturados, execução com metadata e ' +
      'execução auditável.'
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'ApiKeyAuth')
    .addServer('https://ia-service.internal.svc.cluster.local', 'Kubernetes internal cluster (production)')
    .addServer('https://ia-service-staging.internal.svc.cluster.local', 'Staging')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Configurar prefixo global
  app.setGlobalPrefix('v1');

  const port = 3000; // porta padrão fixa
  await app.listen(port, '0.0.0.0'); // garante bind no container

  logger.log(`🚀 ia-service rodando na porta ${port}`);
  logger.log(`📚 Documentação disponível em http://localhost:${port}/api`);
  logger.log(`🏥 Health check disponível em http://localhost:${port}/v1/health`);
  logger.log(`📊 Métricas disponíveis em http://localhost:${port}/v1/metrics`);
}

bootstrap().catch((error) => {
  console.error('Erro ao inicializar aplicação:', error);
  process.exit(1);
});
