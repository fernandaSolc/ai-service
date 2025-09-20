import { Module } from '@nestjs/common';
import { ProcessingController } from './processing.controller';
import { ProcessingService } from './processing.service';
import { ValidationModule } from '../validation/validation.module';
import { PromptBuilderModule } from '../prompt-builder/prompt-builder.module';
import { IaProviderModule } from '../ia-provider/ia-provider.module';
import { QueueModule } from '../queue/queue.module';
import { CallbackModule } from '../callback/callback.module';
import { LoggingModule } from '../logging/logging.module';
import { MetricsModule } from '../metrics/metrics.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    ValidationModule,
    PromptBuilderModule,
    IaProviderModule,
    QueueModule,
    CallbackModule,
    LoggingModule,
    MetricsModule,
    PersistenceModule,
  ],
  controllers: [ProcessingController],
  providers: [ProcessingService],
  exports: [ProcessingService],
})
export class ProcessingModule {}
