import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { RedisService } from '@visapi/util-redis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly redisService: RedisService) {
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

      throw new HealthCheckError(
        'Redis connection failed',
        this.getStatus(key, false, {
          message: 'Redis ping exceeded timeout (1s)',
        })
      );
    } catch (error) {
      throw new HealthCheckError(
        'Redis connection failed',
        this.getStatus(key, false, {
          message: 'Unable to connect to Redis',
          error: error.message,
        })
      );
    }
  }
}
