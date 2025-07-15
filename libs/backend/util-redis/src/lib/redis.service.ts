import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ConfigService } from '@visapi/core-config';

@Injectable()
export class RedisService {
  private redis: Redis;

  constructor(private readonly config: ConfigService) {
    this.redis = new Redis(this.config.redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
  }

  getClient(): Redis {
    return this.redis;
  }

  async checkConnection(): Promise<boolean> {
    try {
      const start = Date.now();
      await this.redis.ping();
      const responseTime = Date.now() - start;
      return responseTime < 1000; // Consider healthy if ping < 1s
    } catch {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    await this.redis.disconnect();
  }
}
