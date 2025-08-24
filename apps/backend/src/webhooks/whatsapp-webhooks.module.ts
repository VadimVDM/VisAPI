import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from '@visapi/core-supabase';
import { WhatsAppBusinessModule } from '@visapi/backend-whatsapp-business';
import { CacheModule } from '@visapi/backend-cache';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';
import { SlackRateLimiterService } from './slack-rate-limiter.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    SupabaseModule,
    WhatsAppBusinessModule,
    CacheModule,
  ],
  controllers: [WhatsAppWebhookController],
  providers: [SlackRateLimiterService],
  exports: [SlackRateLimiterService],
})
export class WhatsAppWebhooksModule {}