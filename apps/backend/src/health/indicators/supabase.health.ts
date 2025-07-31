import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { SupabaseService } from '@visapi/core-supabase';

@Injectable()
export class SupabaseHealthIndicator extends HealthIndicator {
  constructor(private readonly supabase: SupabaseService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const isConnected = await this.supabase.checkConnection();

      if (isConnected) {
        return this.getStatus(key, true);
      }

      throw new HealthCheckError(
        'Supabase connection failed',
        this.getStatus(key, false),
      );
    } catch {
      throw new HealthCheckError(
        'Supabase connection failed',
        this.getStatus(key, false),
      );
    }
  }
}
