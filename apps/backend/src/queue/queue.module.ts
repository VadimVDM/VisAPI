import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@visapi/core-config';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { QUEUE_NAMES } from '@visapi/shared-types';
import { AuthModule } from '../auth/auth.module';
import { CBBSyncProcessor } from './processors/cbb-sync.processor';
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
        const redisUrl = configService.redisUrl;

        if (!redisUrl || redisUrl === 'h') {
          // Return a config that will fail gracefully
          return {
            connection: {
              host: 'localhost',
              port: 6379,
              maxRetriesPerRequest: 0,
              retryStrategy: () => null,
              enableOfflineQueue: false,
            },
          };
        }

        return {
          connection: {
            url: redisUrl,
            // Optimized for Railway Redis
            keepAlive: 30000,
            connectTimeout: 10000,
            commandTimeout: 5000,
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            enableOfflineQueue: true,
            retryStrategy: (times: number) => {
              if (times > 10) return null;
              return Math.min(times * 100, 2000);
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
  ],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
