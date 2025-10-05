import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { QUEUE_NAMES } from '@visapi/shared-types';
import { CacheService } from '@visapi/backend-cache';
import { GeneratePdfDto, JobMetadata } from '../dto/generate-pdf.dto';
import { PdfResultDto } from '../dto/pdf-job-status.dto';

export interface JobCacheData {
  jobId: string;
  status: string;
  progress?: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  updatedAt?: string;
  dto?: GeneratePdfDto;
  result?: PdfResultDto;
  error?: string;
  attempts?: number;
  metadata?: JobMetadata;
}

@Injectable()
export class PdfJobService {
  private readonly logger = new Logger(PdfJobService.name);
  private readonly JOB_CACHE_PREFIX = 'pdf:job:';
  private readonly JOB_CACHE_TTL = 3600; // 1 hour

  constructor(
    @InjectQueue(QUEUE_NAMES.PDF) private readonly pdfQueue: Queue,
    private readonly cacheService: CacheService,
  ) {}

  async trackJob(jobId: string, dto: GeneratePdfDto) {
    const jobData = {
      jobId,
      status: 'queued',
      createdAt: new Date().toISOString(),
      dto,
      progress: 0,
    };

    await this.cacheService.set(
      `${this.JOB_CACHE_PREFIX}${jobId}`,
      jobData,
      this.JOB_CACHE_TTL,
    );

    return jobData;
  }

  async updateJobProgress(jobId: string, progress: number, status?: string) {
    const cacheKey = `${this.JOB_CACHE_PREFIX}${jobId}`;
    const jobData = await this.cacheService.get<JobCacheData>(cacheKey);

    if (jobData) {
      const updated: JobCacheData = {
        ...jobData,
        progress,
        status: status || jobData.status,
        updatedAt: new Date().toISOString(),
      };

      await this.cacheService.set(cacheKey, updated, this.JOB_CACHE_TTL);
      this.logger.log(`Job ${jobId} progress: ${progress}%`);
    }
  }

  async completeJob(jobId: string, result: PdfResultDto) {
    const cacheKey = `${this.JOB_CACHE_PREFIX}${jobId}`;
    const jobData = await this.cacheService.get<JobCacheData>(cacheKey);

    if (jobData) {
      const completed = {
        ...jobData,
        status: 'completed',
        progress: 100,
        result,
        completedAt: new Date().toISOString(),
        duration: Date.now() - new Date(jobData.createdAt).getTime(),
      };

      // Keep completed jobs longer for retrieval
      await this.cacheService.set(cacheKey, completed, this.JOB_CACHE_TTL * 4);
      this.logger.log(`Job ${jobId} completed successfully`);

      // Send webhook if configured
      if (jobData.dto?.webhookUrl) {
        await this.sendWebhook(jobData.dto.webhookUrl, completed);
      }
    }
  }

  async failJob(jobId: string, error: string) {
    const cacheKey = `${this.JOB_CACHE_PREFIX}${jobId}`;
    const jobData = await this.cacheService.get<JobCacheData>(cacheKey);

    if (jobData) {
      const failed = {
        ...jobData,
        status: 'failed',
        error,
        failedAt: new Date().toISOString(),
      };

      await this.cacheService.set(cacheKey, failed, this.JOB_CACHE_TTL);
      this.logger.error(`Job ${jobId} failed: ${error}`);
    }
  }

  async getJobData(jobId: string): Promise<JobCacheData | null> {
    const cacheKey = `${this.JOB_CACHE_PREFIX}${jobId}`;
    return await this.cacheService.get<JobCacheData>(cacheKey);
  }

  async getJob(jobId: string): Promise<Job | undefined> {
    return await this.pdfQueue.getJob(jobId);
  }

  private async sendWebhook(url: string, data: unknown) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        this.logger.warn(
          `Webhook failed: ${response.status} ${response.statusText}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Webhook error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
