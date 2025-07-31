import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { SupabaseModule } from '@visapi/core-supabase';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    SupabaseModule,
    AuthModule,
    BullModule.registerQueue({
      name: 'workflows',
    }),
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
