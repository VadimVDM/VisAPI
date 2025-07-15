import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { QueueModule } from '../queue/queue.module';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from '@visapi/util-redis';

@Module({
  imports: [QueueModule, AuthModule, RedisModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
