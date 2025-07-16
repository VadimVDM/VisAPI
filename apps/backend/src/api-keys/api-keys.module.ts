import { Module } from '@nestjs/common';
import { ApiKeysController } from './api-keys.controller';
import { AuthModule } from '../auth/auth.module';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [AuthModule, MetricsModule],
  controllers: [ApiKeysController],
})
export class ApiKeysModule {}
