import { Module } from '@nestjs/common';
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

@Module({
  imports: [
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
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
