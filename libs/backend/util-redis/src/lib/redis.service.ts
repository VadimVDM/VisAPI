import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ConfigService } from '@visapi/core-config';

@Injectable()
export class RedisService {
  private redis: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly config: ConfigService) {
    const redisUrl = this.config.redisUrl;
    
    if (!redisUrl || redisUrl === 'h') {
      this.logger.error('Invalid or missing REDIS_URL environment variable');
      // Use a dummy Redis instance that will fail gracefully
      this.redis = new Redis({
        host: 'localhost',
        port: 6379,
        maxRetriesPerRequest: 0,
        lazyConnect: true,
        enableOfflineQueue: false,
        retryStrategy: () => null, // Don't retry
      });
    } else {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
    }
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
