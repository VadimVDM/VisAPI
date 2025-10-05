import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { QUEUE_NAMES } from '@visapi/shared-types';
import { PdfJobService, JobCacheData } from './pdf-job.service';
import {
  PdfJobStatusDto,
  JobStatus,
  PdfResultDto,
} from '../dto/pdf-job-status.dto';
import { JobMetadata } from '../dto/generate-pdf.dto';

@Injectable()
export class PdfStatusService {
  constructor(
    @InjectQueue(QUEUE_NAMES.PDF) private readonly pdfQueue: Queue,
    private readonly pdfJobService: PdfJobService,
  ) {}

  async getJobStatus(jobId: string): Promise<PdfJobStatusDto> {
    // First check cache
    const cachedData = await this.pdfJobService.getJobData(jobId);
    if (cachedData) {
      return this.mapCachedToDto(cachedData);
    }

    // Then check the queue
    const job = await this.pdfJobService.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    return this.mapJobToDto(job);
  }

  private mapCachedToDto(data: JobCacheData): PdfJobStatusDto {
    return {
      jobId: data.jobId,
      status: this.mapStatus(data.status),
      progress: data.progress || 0,
      createdAt: data.createdAt,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      duration: data.duration,
      result: data.result,
      error: data.error,
      attempts: data.attempts,
      metadata: data.metadata,
    };
  }

  private async mapJobToDto(job: Job): Promise<PdfJobStatusDto> {
    const state = await job.getState();
    const progress = job.progress || 0;

    return {
      jobId: job.id || '',
      status: this.mapQueueStatus(state),
      progress:
        typeof progress === 'object' &&
        progress !== null &&
        'percentage' in progress
          ? ((progress as Record<string, unknown>).percentage as number) || 0
          : Number(progress) || 0,
      createdAt: new Date(job.timestamp).toISOString(),
      startedAt: job.processedOn
        ? new Date(job.processedOn).toISOString()
        : undefined,
      completedAt: job.finishedOn
        ? new Date(job.finishedOn).toISOString()
        : undefined,
      duration:
        job.finishedOn && job.processedOn
          ? job.finishedOn - job.processedOn
          : undefined,
      result: job.returnvalue as PdfResultDto | undefined,
      error: job.failedReason,
      attempts: job.attemptsMade,
      metadata:
        job.data && typeof job.data === 'object' && 'metadata' in job.data
          ? (job.data as { metadata: JobMetadata }).metadata
          : undefined,
    };
  }

  private mapStatus(status: string): JobStatus {
    switch (status.toLowerCase()) {
      case 'queued':
      case 'waiting':
        return JobStatus.QUEUED;
      case 'processing':
      case 'active':
        return JobStatus.PROCESSING;
      case 'completed':
      case 'succeeded':
        return JobStatus.COMPLETED;
      case 'failed':
        return JobStatus.FAILED;
      case 'cancelled':
        return JobStatus.CANCELLED;
      default:
        return JobStatus.QUEUED;
    }
  }

  private mapQueueStatus(state: string): JobStatus {
    switch (state) {
      case 'waiting':
      case 'delayed':
        return JobStatus.QUEUED;
      case 'active':
        return JobStatus.PROCESSING;
      case 'completed':
        return JobStatus.COMPLETED;
      case 'failed':
        return JobStatus.FAILED;
      default:
        return JobStatus.QUEUED;
    }
  }
}
