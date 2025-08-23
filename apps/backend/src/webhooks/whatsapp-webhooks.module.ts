import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from '@visapi/core-supabase';
import { WhatsAppBusinessModule } from '@visapi/backend-whatsapp-business';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    SupabaseModule,
    WhatsAppBusinessModule,
  ],
  controllers: [WhatsAppWebhookController],
})
export class WhatsAppWebhooksModule {}