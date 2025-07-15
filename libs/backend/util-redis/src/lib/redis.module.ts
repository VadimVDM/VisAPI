import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { IdempotencyService } from './idempotency.service';

@Global()
@Module({
  providers: [
    RedisService,
    IdempotencyService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: (redisService: RedisService) => redisService.getClient(),
      inject: [RedisService],
    },
  ],
  exports: [RedisService, IdempotencyService],
})
export class RedisModule {}
