import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { WhatsAppApiService } from './services/whatsapp-api.service';
import { WebhookVerifierService } from './services/webhook-verifier.service';
import { TemplateManagerService } from './services/template-manager.service';
import { DeliveryTrackerService } from './services/delivery-tracker.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [
    WhatsAppApiService,
    WebhookVerifierService,
    TemplateManagerService,
    DeliveryTrackerService,
  ],
  exports: [
    WhatsAppApiService,
    WebhookVerifierService,
    TemplateManagerService,
    DeliveryTrackerService,
  ],
})
export class WhatsAppBusinessModule {}
