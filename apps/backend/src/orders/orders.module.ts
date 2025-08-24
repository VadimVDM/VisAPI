import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { OrdersService } from './orders.service';
import { OrderTransformerService } from './services/order-transformer.service';
import { OrderValidatorService } from './services/order-validator.service';
import { OrderSyncService } from './services/order-sync.service';
import { TranslationService } from './services/translation.service';
import { SupabaseModule } from '@visapi/core-supabase';
import { QueueModule } from '../queue/queue.module';
import { ConfigModule } from '@visapi/core-config';
import { RepositoriesModule } from '@visapi/backend-repositories';
import { EventsModule } from '@visapi/backend-events';
import { LoggingModule } from '@visapi/backend-logging';
import { CommandHandlers } from './commands';
import { QueryHandlers } from './queries';
import { OrderSyncSaga } from './sagas/order-sync.saga';

@Module({
  imports: [
    CqrsModule,
    SupabaseModule,
    QueueModule,
    ConfigModule,
    RepositoriesModule,
    EventsModule,
    LoggingModule,
  ],
  providers: [
    OrdersService,
    OrderTransformerService,
    OrderValidatorService,
    OrderSyncService,
    TranslationService,
    ...CommandHandlers,
    ...QueryHandlers,
    OrderSyncSaga,
  ],
  exports: [OrdersService, CqrsModule],
})
export class OrdersModule {}
