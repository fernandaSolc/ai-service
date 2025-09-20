import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IaProviderService } from './ia-provider.service';

@Module({
  imports: [ConfigModule],
  providers: [IaProviderService],
  exports: [IaProviderService],
})
export class IaProviderModule {}
