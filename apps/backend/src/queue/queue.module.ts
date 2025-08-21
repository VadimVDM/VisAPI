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

        // Smart Redis URL handling for Railway deployments
        // Use public URL if provided via REDIS_PUBLIC_URL, otherwise use REDIS_URL
        // This allows Railway to use internal URLs when available but fall back during health checks
        const publicRedisUrl = process.env.REDIS_PUBLIC_URL;
        const effectiveRedisUrl = publicRedisUrl || redisUrl;
        
        // Log which URL we're using (without exposing sensitive data)
        const isInternalUrl = redisUrl.includes('.railway.internal');
        const isUsingPublic = effectiveRedisUrl === publicRedisUrl;
        console.log(
          `[BullMQ] Using ${isUsingPublic ? 'public' : isInternalUrl ? 'internal' : 'standard'} Redis URL`,
        );

        return {
          connection: {
            url: effectiveRedisUrl,
            // Optimized for Railway Redis
            keepAlive: 30000,
            connectTimeout: 10000,
            commandTimeout: 5000,
            maxRetriesPerRequest: null, // Required by BullMQ
            enableReadyCheck: true,
            enableOfflineQueue: true,
            lazyConnect: true, // Don't connect immediately
            retryStrategy: (times: number) => {
              if (times > 10) {
                console.error(
                  '[BullMQ] Redis connection failed after 10 retries',
                );
                return null;
              }
              const delay = Math.min(times * 200, 3000); // Start with 200ms, max 3s
              console.log(
                `[BullMQ] Retrying Redis connection in ${delay}ms (attempt ${times})`,
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
