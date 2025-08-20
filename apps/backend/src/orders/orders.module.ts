import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { SupabaseModule } from '@visapi/core-supabase';
import { QueueModule } from '../queue/queue.module';
import { ConfigModule } from '@visapi/core-config';

@Module({
  imports: [SupabaseModule, QueueModule, ConfigModule],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}