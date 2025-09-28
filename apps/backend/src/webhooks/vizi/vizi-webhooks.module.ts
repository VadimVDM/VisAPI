import { Module } from '@nestjs/common';
import { ViziWebhooksController } from './vizi-webhooks.controller';
import { QueueModule } from '../../queue/queue.module';
import { WorkflowsModule } from '../../workflows/workflows.module';
import { AuthModule } from '../../auth/auth.module';
import { SupabaseModule } from '@visapi/core-supabase';
import { LoggingModule } from '@visapi/backend-logging';
import { RedisModule } from '@visapi/util-redis';
import { OrdersModule } from '../../orders/orders.module';
import { RepositoriesModule } from '@visapi/backend-repositories';
import { ViziOrderWorkflowService } from './services/order-workflow.service';
import { ViziOrderWebhookService } from './services/order-webhook.service';
import { ViziOrderRetriggerService } from './services/order-retrigger.service';
import { ViziCbbResyncService } from './services/cbb-resync.service';
import { ViziWhatsAppRetriggerService } from './services/whatsapp-retrigger.service';
import { ViziVisaResendService } from './services/visa-resend.service';
import { AirtableModule } from '../../airtable/airtable.module';

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
    AirtableModule,
  ],
  controllers: [ViziWebhooksController],
  providers: [
    ViziOrderWorkflowService,
    ViziOrderWebhookService,
    ViziOrderRetriggerService,
    ViziCbbResyncService,
    ViziWhatsAppRetriggerService,
    ViziVisaResendService,
  ],
  exports: [
    ViziOrderWorkflowService,
    ViziOrderWebhookService,
    ViziOrderRetriggerService,
    ViziCbbResyncService,
    ViziWhatsAppRetriggerService,
    ViziVisaResendService,
  ],
})
export class ViziWebhooksModule {}
