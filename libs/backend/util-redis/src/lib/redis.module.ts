import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { IdempotencyService } from './idempotency.service';
import { CacheService } from './cache.service';

@Global()
@Module({
  providers: [
    RedisService,
    IdempotencyService,
    CacheService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: (redisService: RedisService) => redisService.getClient(),
      inject: [RedisService],
    },
  ],
  exports: [RedisService, IdempotencyService, CacheService],
})
export class RedisModule {}
