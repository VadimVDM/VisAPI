import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { OrdersService } from './orders.service';
import { OrderTransformerService } from './services/order-transformer.service';
import { OrderValidatorService } from './services/order-validator.service';
import { OrderSyncService } from './services/order-sync.service';
import { SupabaseModule } from '@visapi/core-supabase';
import { QueueModule } from '../queue/queue.module';
import { ConfigModule } from '@visapi/core-config';
import { RepositoriesModule } from '@visapi/backend-repositories';
import { EventsModule } from '@visapi/backend-events';
import { CacheModule } from '@visapi/backend-cache';
import { CommandHandlers } from './commands';
import { QueryHandlers } from './queries';

@Module({
  imports: [
    CqrsModule,
    SupabaseModule,
    QueueModule,
    ConfigModule,
    RepositoriesModule,
    EventsModule,
    CacheModule,
  ],
  providers: [
    OrdersService,
    OrderTransformerService,
    OrderValidatorService,
    OrderSyncService,
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: [OrdersService, CqrsModule],
})
export class OrdersModule {}