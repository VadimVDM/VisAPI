import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from '@visapi/core-supabase';
import { WhatsAppBusinessModule } from '@visapi/backend-whatsapp-business';
import { CacheModule } from '@visapi/backend-cache';
import { AuthModule } from '../auth/auth.module';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';
import { WhatsAppManagementController } from '../whatsapp/whatsapp-management.controller';
import { SlackRateLimiterService } from './slack-rate-limiter.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    SupabaseModule,
    WhatsAppBusinessModule,
    CacheModule,
    AuthModule,
  ],
  controllers: [WhatsAppWebhookController, WhatsAppManagementController],
  providers: [SlackRateLimiterService],
  exports: [SlackRateLimiterService],
})
export class WhatsAppWebhooksModule {}