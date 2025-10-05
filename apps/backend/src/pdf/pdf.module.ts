import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@visapi/shared-types';
import { PdfController } from './pdf.controller';
import { PdfService } from './pdf.service';
import { PdfJobService } from './services/pdf-job.service';
import { PdfStatusService } from './services/pdf-status.service';
import { CacheModule } from '@visapi/backend-cache';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.PDF,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 100, // Keep last 100 completed jobs
        },
        removeOnFail: {
          age: 86400, // Keep failed jobs for 24 hours
        },
      },
    }),
    CacheModule,
  ],
  controllers: [PdfController],
  providers: [PdfService, PdfJobService, PdfStatusService],
  exports: [PdfService],
})
export class PdfModule {}
