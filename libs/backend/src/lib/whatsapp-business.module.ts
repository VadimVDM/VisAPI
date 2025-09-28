import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ConfigModule as CoreConfigModule } from '@visapi/core-config';
import { SupabaseModule } from '@visapi/core-supabase';
import { WhatsAppApiService } from './services/whatsapp-api.service';
import { WebhookVerifierService } from './services/webhook-verifier.service';
import { TemplateManagerService } from './services/template-manager.service';
import { DeliveryTrackerService } from './services/delivery-tracker.service';
import { MessageIdUpdaterService } from './services/message-id-updater.service';

@Module({
  imports: [HttpModule, ConfigModule, CoreConfigModule, SupabaseModule],
  providers: [
    WhatsAppApiService,
    WebhookVerifierService,
    TemplateManagerService,
    DeliveryTrackerService,
    MessageIdUpdaterService,
  ],
  exports: [
    WhatsAppApiService,
    WebhookVerifierService,
    TemplateManagerService,
    DeliveryTrackerService,
    MessageIdUpdaterService,
  ],
})
export class WhatsAppBusinessModule {}
