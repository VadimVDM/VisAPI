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
        const redisUrl = configService.redisUrl;
        if (!redisUrl) {
          throw new Error('Redis URL not configured');
        }

        const redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
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