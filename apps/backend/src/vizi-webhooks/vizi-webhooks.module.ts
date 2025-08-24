import { Module } from '@nestjs/common';
import { ViziWebhooksController } from './vizi-webhooks.controller';
import { ViziWebhooksService } from './vizi-webhooks.service';
import { QueueModule } from '../queue/queue.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '@visapi/core-supabase';
import { LoggingModule } from '@visapi/backend-logging';
import { RedisModule } from '@visapi/util-redis';
import { OrdersModule } from '../orders/orders.module';
import { RepositoriesModule } from '@visapi/backend-repositories';

@Module({
  imports: [
    QueueModule,
    WorkflowsModule,
    AuthModule,
    SupabaseModule,
    LoggingModule,
    RedisModule,
    OrdersModule,
    RepositoriesModule,
  ],
  controllers: [ViziWebhooksController],
  providers: [ViziWebhooksService],
  exports: [ViziWebhooksService],
})
export class ViziWebhooksModule {}
