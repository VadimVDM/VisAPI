import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiKeyStrategy } from './strategies/api-key.strategy';
import { ApiKeyGuard } from './guards/api-key.guard';
import { SupabaseModule } from '@visapi/core-supabase';
import { ConfigModule } from '@visapi/core-config';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [SupabaseModule, ConfigModule, MetricsModule],
  providers: [AuthService, ApiKeyStrategy, ApiKeyGuard],
  exports: [AuthService, ApiKeyGuard],
})
export class AuthModule {}
