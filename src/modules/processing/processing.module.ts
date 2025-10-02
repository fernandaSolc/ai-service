import { Module } from '@nestjs/common';
import { ProcessingController } from './processing.controller';
import { ProcessingService } from './processing.service';
import { IncrementalGenerationController } from './incremental-generation.controller';
import { IncrementalGenerationService } from './incremental-generation.service';
import { ValidationModule } from '../validation/validation.module';
import { PromptBuilderModule } from '../prompt-builder/prompt-builder.module';
import { IaProviderModule } from '../ia-provider/ia-provider.module';
import { QueueModule } from '../queue/queue.module';
import { CallbackModule } from '../callback/callback.module';
import { LoggingModule } from '../logging/logging.module';
import { MetricsModule } from '../metrics/metrics.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { AuthModule } from '../auth/auth.module';
import { PdfProcessorModule } from '../pdf-processor/pdf-processor.module';

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
    PdfProcessorModule,
  ],
  controllers: [ProcessingController, IncrementalGenerationController],
  providers: [ProcessingService, IncrementalGenerationService],
  exports: [ProcessingService, IncrementalGenerationService],
})
export class ProcessingModule { }
