import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SupabaseService } from '@visapi/core-supabase';

@Injectable()
export class DlqProcessor {
  private readonly logger = new Logger(DlqProcessor.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async process(job: Job) {
    this.logger.log(`Processing DLQ job ${job.id}: ${job.name}`);

    try {
      // Log the failed job for analysis
      await this.logFailedJob(job);

      // For now, just log the failure
      // In the future, we could implement retry logic, notifications, etc.
      this.logger.warn(`Job ${job.id} moved to DLQ:`, {
        name: job.name,
        data: job.data,
        failedReason: job.failedReason,
        attempts: job.attemptsMade,
      });

      return {
        success: true,
        logged: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to process DLQ job:`, error);
      throw error;
    }
  }

  private async logFailedJob(job: Job) {
    try {
      const client = this.supabaseService.serviceClient;

      await client.from('logs').insert({
        level: 'error',
        message: `Job ${job.id} failed and moved to DLQ`,
        metadata: {
          jobId: job.id,
          jobName: job.name,
          jobData: job.data,
          failedReason: job.failedReason,
          attempts: job.attemptsMade,
          timestamp: job.timestamp,
        },
        job_id: job.id?.toString(),
        pii_redacted: true,
      });

      this.logger.log(`Logged failed job ${job.id} to database`);
    } catch (error) {
      this.logger.error(`Failed to log job to database:`, error);
    }
  }
}
