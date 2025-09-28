import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { QUEUE_NAMES } from '@visapi/shared-types';
import { CBBSyncProcessor } from './processors/cbb-sync.processor';
import { WhatsAppMessageProcessor } from './processors/whatsapp-message.processor';
import { AuthModule } from '../auth/auth.module';
import { WhatsAppTemplateService } from './services/whatsapp-template.service';
import { CBBSyncOrchestratorService } from './services/cbb-sync-orchestrator.service';
import { CBBSyncMetricsService } from './services/cbb-sync-metrics.service';
import { CbbContactSyncService } from './services/cbb-contact-sync.service';
import { CbbWhatsAppService } from './services/cbb-whatsapp.service';
import { CbbModule } from '@visapi/backend-core-cbb';
import { SupabaseModule } from '@visapi/core-supabase';
import { MetricsModule } from '../metrics/metrics.module';
import { LoggingModule } from '@visapi/backend-logging';
import { WhatsAppBusinessModule } from '@visapi/backend-whatsapp-business';
import {
  makeCounterProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';
import { WhatsAppTranslationService } from './services/whatsapp-translation.service';

// BullMQ configuration for root module
const bullModuleForRoot = () => BullModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => {
    const logger = new Logger('QueueModule');
    const redisUrl = configService.get<string>('redis.url');

    if (!redisUrl) {
      logger.warn('Redis URL not configured - queue functionality disabled');
      return {
        connection: {
          host: 'localhost',
          port: 6379,
          maxRetriesPerRequest: 0,
          retryStrategy: () => null,
          enableOfflineQueue: false,
          lazyConnect: true,
          enableReadyCheck: false,
        },
      };
    }

    const publicRedisUrl = configService.get<string>('redis.publicUrl');
    const effectiveRedisUrl = publicRedisUrl || redisUrl;

    logger.log(`Using ${publicRedisUrl ? 'public' : 'standard'} Redis URL`);

    // Parse Redis URL to get connection options
    const url = new URL(effectiveRedisUrl);

    return {
      connection: {
        host: url.hostname,
        port: parseInt(url.port || '6379'),
        password: url.password || undefined,
        username: url.username || undefined,
        keepAlive: 30000,
        connectTimeout: 30000,
        commandTimeout: 10000,
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        enableOfflineQueue: true,
        lazyConnect: true,
        retryStrategy: (times: number) => {
          if (times > 10) {
            logger.error('Redis connection failed after 10 retries');
            return null;
          }
          const delay = Math.min(times * 200, 3000);
          logger.log(`Retrying Redis connection in ${delay}ms (attempt ${times})`);
          return delay;
        },
        reconnectOnError: (err: Error) => {
          const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND'];
          if (targetErrors.some((e) => err.message.includes(e))) {
            return 1; // Reconnect immediately
          }
          return false;
        },
      },
      defaultJobOptions: {
        removeOnComplete: { age: 3600, count: 100 },
        removeOnFail: { age: 86400 },
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    };
  },
  inject: [ConfigService],
});

// Register all queues
const registeredQueues = () => BullModule.registerQueue(
  { name: QUEUE_NAMES.CRITICAL },
  { name: QUEUE_NAMES.DEFAULT },
  { name: QUEUE_NAMES.BULK },
  { name: QUEUE_NAMES.SLACK },
  { name: QUEUE_NAMES.WHATSAPP },
  { name: QUEUE_NAMES.WHATSAPP_MESSAGES },
  { name: QUEUE_NAMES.PDF },
  { name: QUEUE_NAMES.CBB_SYNC },
  { name: QUEUE_NAMES.DLQ },
);

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    bullModuleForRoot(),
    registeredQueues(),
    CbbModule,
    SupabaseModule,
    MetricsModule,
    LoggingModule,
    WhatsAppBusinessModule,
  ],
  controllers: [QueueController],
  providers: [
    QueueService,
    CBBSyncProcessor,
    WhatsAppMessageProcessor,
    WhatsAppTranslationService,
    WhatsAppTemplateService,
    CBBSyncOrchestratorService,
    CBBSyncMetricsService,
    CbbContactSyncService,
    CbbWhatsAppService,
    makeCounterProvider({
      name: 'cbb_sync_total',
      help: 'Total number of CBB sync attempts',
    }),
    makeCounterProvider({
      name: 'cbb_sync_success',
      help: 'Total number of successful CBB syncs',
    }),
    makeCounterProvider({
      name: 'cbb_sync_failures',
      help: 'Total number of failed CBB syncs',
    }),
    makeHistogramProvider({
      name: 'cbb_sync_duration',
      help: 'CBB sync operation duration in seconds',
      buckets: [0.5, 1, 2, 5, 10, 20, 30, 60],
    }),
    makeCounterProvider({
      name: 'cbb_contacts_created',
      help: 'Total number of new CBB contacts created',
    }),
    makeCounterProvider({
      name: 'cbb_contacts_updated',
      help: 'Total number of existing CBB contacts updated',
    }),
    makeCounterProvider({
      name: 'cbb_whatsapp_available',
      help: 'Total number of contacts with WhatsApp available',
    }),
    makeCounterProvider({
      name: 'cbb_whatsapp_unavailable',
      help: 'Total number of contacts without WhatsApp',
    }),
    makeCounterProvider({
      name: 'visapi_whatsapp_messages_sent_total',
      help: 'Total number of WhatsApp messages sent',
      labelNames: ['message_type'],
    }),
    makeCounterProvider({
      name: 'visapi_whatsapp_messages_failed_total',
      help: 'Total number of WhatsApp messages failed',
      labelNames: ['message_type'],
    }),
    makeHistogramProvider({
      name: 'visapi_whatsapp_message_duration_seconds',
      help: 'WhatsApp message sending duration in seconds',
      labelNames: ['message_type'],
      buckets: [0.5, 1, 2, 5, 10, 20, 30],
    }),
  ],
  exports: [
    QueueService,
    BullModule,
    CBBSyncOrchestratorService,
    WhatsAppTranslationService, // Export for use in other modules
  ],
})
export class QueueModule {}
