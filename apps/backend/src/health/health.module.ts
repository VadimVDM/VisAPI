import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { SupabaseModule } from '@visapi/core-supabase';
import { RedisModule } from '@visapi/util-redis';
import { ConfigModule } from '@visapi/core-config';
import { SupabaseHealthIndicator } from './indicators/supabase.health';
import { RedisHealthIndicator } from './indicators/redis.health';

@Module({
  imports: [TerminusModule, SupabaseModule, RedisModule, ConfigModule],
  controllers: [HealthController],
  providers: [SupabaseHealthIndicator, RedisHealthIndicator],
})
export class HealthModule {}
