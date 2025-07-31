import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthConfirmController } from './auth-confirm.controller';
import { ApiKeyStrategy } from './strategies/api-key.strategy';
import { ApiKeyGuard } from './guards/api-key.guard';
import { JwtAuthGuard } from './guards/jwt.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { SupabaseModule } from '@visapi/core-supabase';
import { ConfigModule } from '@visapi/core-config';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [SupabaseModule, ConfigModule, MetricsModule],
  controllers: [AuthController, AuthConfirmController],
  providers: [
    AuthService,
    ApiKeyStrategy,
    ApiKeyGuard,
    JwtAuthGuard,
    PermissionsGuard,
  ],
  exports: [AuthService, ApiKeyGuard, JwtAuthGuard, PermissionsGuard],
})
export class AuthModule {}
