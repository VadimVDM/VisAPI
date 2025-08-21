import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@visapi/core-config';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { QUEUE_NAMES } from '@visapi/shared-types';
import { AuthModule } from '../auth/auth.module';
import { CGBSyncProcessor } from './processors/cgb-sync.processor';
import { CgbModule } from '@visapi/backend-core-cgb';
import { SupabaseModule } from '@visapi/core-supabase';
import { MetricsModule } from '../metrics/metrics.module';
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
      { name: QUEUE_NAMES.CGB_SYNC },
      { name: QUEUE_NAMES.DLQ },
    ),
    CgbModule,
    SupabaseModule,
    MetricsModule,
  ],
  controllers: [QueueController],
  providers: [
    QueueService,
    CGBSyncProcessor,
    // CGB Sync Metrics
    makeCounterProvider({
      name: 'cgb_sync_total',
      help: 'Total number of CGB sync attempts',
    }),
    makeCounterProvider({
      name: 'cgb_sync_success',
      help: 'Total number of successful CGB syncs',
    }),
    makeCounterProvider({
      name: 'cgb_sync_failures',
      help: 'Total number of failed CGB syncs',
    }),
    makeHistogramProvider({
      name: 'cgb_sync_duration',
      help: 'CGB sync operation duration in seconds',
      buckets: [0.5, 1, 2, 5, 10, 20, 30, 60],
    }),
    makeCounterProvider({
      name: 'cgb_contacts_created',
      help: 'Total number of new CGB contacts created',
    }),
    makeCounterProvider({
      name: 'cgb_contacts_updated',
      help: 'Total number of existing CGB contacts updated',
    }),
    makeCounterProvider({
      name: 'cgb_whatsapp_available',
      help: 'Total number of contacts with WhatsApp available',
    }),
    makeCounterProvider({
      name: 'cgb_whatsapp_unavailable',
      help: 'Total number of contacts without WhatsApp',
    }),
  ],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
