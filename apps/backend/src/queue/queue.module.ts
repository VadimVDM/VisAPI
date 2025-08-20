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
  providers: [QueueService, CGBSyncProcessor],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
