import { Module, Global, DynamicModule } from '@nestjs/common';
import { CacheService } from './cache.service';
import { Redis } from 'ioredis';
import { ConfigService } from '@visapi/core-config';

export interface CacheModuleOptions {
  isGlobal?: boolean;
  ttl?: number;
  max?: number;
}

@Global()
@Module({})
export class CacheModule {
  static forRoot(options?: CacheModuleOptions): DynamicModule {
    const redisProvider = {
      provide: Redis,
      useFactory: (configService: ConfigService) => {
        // Use public URL if available (for Railway), otherwise use standard URL
        let publicRedisUrl: string | undefined;
        try {
          publicRedisUrl = configService.get<string>('redis.publicUrl');
        } catch {
          // Public URL is optional
          publicRedisUrl = undefined;
        }
        const redisUrl = publicRedisUrl || configService.redisUrl;
        
        if (!redisUrl) {
          console.warn('Redis URL not configured - using mock Redis instance');
          // Return a mock Redis instance that won't block startup
          const mockRedis = new Redis({
            host: 'localhost',
            port: 6379,
            maxRetriesPerRequest: 0,
            lazyConnect: true,
            enableOfflineQueue: false,
            retryStrategy: () => null,
          });
          return mockRedis;
        }

        const redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          lazyConnect: true, // Don't block startup
          showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
        });

        redis.on('error', (error) => {
          console.error('Redis connection error:', error);
        });

        redis.on('connect', () => {
          console.log('Redis connected successfully');
        });

        return redis;
      },
      inject: [ConfigService],
    };

    return {
      module: CacheModule,
      global: options?.isGlobal !== false,
      imports: [],
      providers: [redisProvider, CacheService],
      exports: [CacheService, Redis],
    };
  }

  static forFeature(): DynamicModule {
    return {
      module: CacheModule,
      providers: [],
      exports: [],
    };
  }
}
