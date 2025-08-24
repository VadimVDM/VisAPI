import { Injectable, Logger } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { RedisService } from '@visapi/util-redis';
import { ConfigService } from '@visapi/core-config';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(RedisHealthIndicator.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const isHealthy = await this.redisService.checkConnection();

      if (isHealthy) {
        return this.getStatus(key, true, {
          message: 'Redis is accessible and responsive',
        });
      }

      // In production, don't fail health check for Redis issues
      // as the app can work without it (with degraded queue functionality)
      if (this.configService.isProduction) {
        this.logger.warn('Redis connection failed but continuing in production mode');
        return this.getStatus(key, true, {
          message: 'Redis unavailable but service operational',
          warning: 'Queue functionality may be degraded',
        });
      }

      throw new HealthCheckError(
        'Redis connection failed',
        this.getStatus(key, false, {
          message: 'Redis ping exceeded timeout (1s)',
        }),
      );
    } catch (e: unknown) {
      const error = e as Error;
      
      // In production, log but don't fail the health check
      if (this.configService.isProduction) {
        this.logger.error('Redis health check error:', error.message);
        return this.getStatus(key, true, {
          message: 'Redis unavailable but service operational', 
          warning: 'Queue functionality may be degraded',
          error: error.message,
        });
      }

      throw new HealthCheckError(
        'Redis connection failed',
        this.getStatus(key, false, {
          message: 'Unable to connect to Redis',
          error: error.message,
        }),
      );
    }
  }
}
