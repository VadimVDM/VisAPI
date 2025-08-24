import { Module, Logger } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@visapi/core-config';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { QUEUE_NAMES } from '@visapi/shared-types';
import { AuthModule } from '../auth/auth.module';
import { CBBSyncProcessor } from './processors/cbb-sync.processor';
import { WhatsAppMessageProcessor } from './processors/whatsapp-message.processor';
import { WhatsAppTranslationService } from './services/whatsapp-translation.service';
import { WhatsAppTemplateService } from './services/whatsapp-template.service';
import { CBBFieldMapperService } from './services/cbb-field-mapper.service';
import { CBBSyncOrchestratorService } from './services/cbb-sync-orchestrator.service';
import { CBBSyncMetricsService } from './services/cbb-sync-metrics.service';
import { CbbModule } from '@visapi/backend-core-cbb';
import { SupabaseModule } from '@visapi/core-supabase';
import { MetricsModule } from '../metrics/metrics.module';
import { LoggingModule } from '@visapi/backend-logging';
import {
  makeCounterProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('QueueModule');
        const redisUrl = configService.redisUrl;

        if (!redisUrl) {
          // Return a config that will fail gracefully
          logger.warn(
            'Redis URL not configured - queue functionality disabled',
          );
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

        // Railway Redis URL handling - ALWAYS use public URL if available
        // The internal .railway.internal URLs don't work reliably
        let publicRedisUrl: string | undefined;
        try {
          publicRedisUrl = configService.get<string>('redis.publicUrl');
        } catch {
          // Public URL is optional
          publicRedisUrl = undefined;
        }
        const effectiveRedisUrl = publicRedisUrl || redisUrl;

        // Log which URL we're using (without exposing sensitive data)
        const isInternalUrl = redisUrl.includes('.railway.internal');
        const isUsingPublic =
          !!publicRedisUrl && effectiveRedisUrl === publicRedisUrl;
        logger.log(
          `Using ${isUsingPublic ? 'public' : isInternalUrl ? 'internal' : 'standard'} Redis URL`,
        );

        // Additional logging for debugging
        if (isInternalUrl && !publicRedisUrl) {
          logger.warn(
            'Using internal Railway URL without public URL fallback - this may fail!',
          );
        }

        return {
          connection: {
            url: effectiveRedisUrl,
            // Optimized for Railway Redis with increased timeouts
            keepAlive: 30000,
            connectTimeout: 30000, // Increased from 10s to 30s for Railway
            commandTimeout: 10000, // Increased from 5s to 10s for Railway
            maxRetriesPerRequest: null, // Required by BullMQ
            enableReadyCheck: true,
            enableOfflineQueue: true,
            lazyConnect: true, // Don't connect immediately
            retryStrategy: (times: number) => {
              if (times > 10) {
                logger.error('Redis connection failed after 10 retries');
                return null;
              }
              const delay = Math.min(times * 200, 3000); // Start with 200ms, max 3s
              logger.log(
                `Retrying Redis connection in ${delay}ms (attempt ${times})`,
              );
              return delay;
            },
            reconnectOnError: (err: Error) => {
              const targetErrors = [
                'READONLY',
                'ECONNRESET',
                'ETIMEDOUT',
                'ECONNREFUSED',
                'ENOTFOUND', // Add DNS resolution errors
              ];
              if (targetErrors.some((e) => err.message.includes(e))) {
                return 1; // Reconnect after 1ms
              }
              return false;
            },
          },
          // Queue-specific optimizations
          defaultJobOptions: {
            removeOnComplete: {
              age: 3600, // Keep completed jobs for 1 hour
              count: 100, // Keep max 100 completed jobs
            },
            removeOnFail: {
              age: 86400, // Keep failed jobs for 24 hours
            },
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.CRITICAL },
      { name: QUEUE_NAMES.DEFAULT },
      { name: QUEUE_NAMES.BULK },
      { name: QUEUE_NAMES.SLACK },
      { name: QUEUE_NAMES.WHATSAPP },
      { name: QUEUE_NAMES.WHATSAPP_MESSAGES },
      { name: QUEUE_NAMES.PDF },
      { name: QUEUE_NAMES.CBB_SYNC },
      { name: QUEUE_NAMES.DLQ },
    ),
    CbbModule,
    SupabaseModule,
    MetricsModule,
    LoggingModule,
  ],
  controllers: [QueueController],
  providers: [
    QueueService,
    CBBSyncProcessor,
    WhatsAppMessageProcessor,
    WhatsAppTranslationService,
    WhatsAppTemplateService,
    CBBFieldMapperService,
    CBBSyncOrchestratorService,
    CBBSyncMetricsService,
    // CBB Sync Metrics
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
    // WhatsApp Message Metrics
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
  exports: [QueueService, BullModule, CBBSyncOrchestratorService],
})
export class QueueModule {}
