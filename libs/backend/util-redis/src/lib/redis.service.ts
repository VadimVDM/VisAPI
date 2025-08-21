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
        // Connection pool settings
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        enableReadyCheck: true,
        
        // Keep-alive for Railway's persistent connections
        keepAlive: 30000, // 30 seconds
        
        // Connection timeout
        connectTimeout: 10000, // 10 seconds
        
        // Command timeout
        commandTimeout: 5000, // 5 seconds
        
        // Reconnection strategy with exponential backoff
        retryStrategy: (times: number) => {
          if (times > 10) {
            this.logger.error('Redis connection failed after 10 retries');
            return null; // Stop retrying
          }
          const delay = Math.min(times * 100, 2000); // Max 2 seconds
          this.logger.warn(`Retrying Redis connection in ${delay}ms (attempt ${times})`);
          return delay;
        },
        
        // Error handling
        reconnectOnError: (err: Error) => {
          const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
          if (targetErrors.some(e => err.message.includes(e))) {
            this.logger.warn('Redis reconnecting due to error:', err.message);
            return true; // Reconnect
          }
          return false;
        },
        
        // Performance optimizations
        enableOfflineQueue: true, // Queue commands when disconnected
        autoResubscribe: true, // Auto resubscribe to channels
        autoResendUnfulfilledCommands: true, // Resend commands after reconnect
      });
      
      // Connection event handlers
      this.redis.on('connect', () => {
        this.logger.log('Redis client connected to Railway');
      });
      
      this.redis.on('ready', () => {
        this.logger.log('Redis client ready for commands');
      });
      
      this.redis.on('error', (err) => {
        this.logger.error('Redis client error:', err.message);
      });
      
      this.redis.on('reconnecting', (delay: number) => {
        this.logger.warn(`Redis client reconnecting in ${delay}ms`);
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
