import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';
import { QueueProcessor } from './queue.processor';
import { ValidationModule } from '../validation/validation.module';
import { PromptBuilderModule } from '../prompt-builder/prompt-builder.module';
import { IaProviderModule } from '../ia-provider/ia-provider.module';
import { CallbackModule } from '../callback/callback.module';
import { LoggingModule } from '../logging/logging.module';
import { MetricsModule } from '../metrics/metrics.module';
import { PersistenceModule } from '../persistence/persistence.module';

@Module({
  imports: [
    ConfigModule,
    ValidationModule,
    PromptBuilderModule,
    IaProviderModule,
    CallbackModule,
    LoggingModule,
    MetricsModule,
    PersistenceModule,
    // BullModule temporariamente desabilitado para desenvolvimento sem Redis
    // BullModule.forRootAsync({
    //   imports: [ConfigModule],
    //   useFactory: async (configService: ConfigService) => ({
    //     connection: {
    //       host: configService.get('REDIS_HOST', 'localhost'),
    //       port: configService.get('REDIS_PORT', 6379),
    //       password: configService.get('REDIS_PASSWORD'),
    //     },
    //   }),
    //   inject: [ConfigService],
    // }),
    // BullModule.registerQueue({
    //   name: 'content-processing',
    // }),
  ],
  providers: [QueueService], // QueueProcessor temporariamente desabilitado
  exports: [QueueService],
})
export class QueueModule {}
