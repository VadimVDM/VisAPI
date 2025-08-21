import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job, RepeatableJob } from 'bullmq';
import {
  QUEUE_NAMES,
  QUEUE_PRIORITIES,
  QueueMetrics,
} from '@visapi/shared-types';
import { ConfigService } from '@visapi/core-config';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QUEUE_NAMES.CRITICAL) private criticalQueue: Queue,
    @InjectQueue(QUEUE_NAMES.DEFAULT) private defaultQueue: Queue,
    @InjectQueue(QUEUE_NAMES.BULK) private bulkQueue: Queue,
    @InjectQueue(QUEUE_NAMES.CBB_SYNC) private cbbSyncQueue: Queue,
    private readonly config: ConfigService,
  ) {}

  private getQueue(queueName: string): Queue {
    switch (queueName) {
      case QUEUE_NAMES.CRITICAL:
        return this.criticalQueue;
      case QUEUE_NAMES.BULK:
        return this.bulkQueue;
      case QUEUE_NAMES.CBB_SYNC:
        return this.cbbSyncQueue;
      case QUEUE_NAMES.DEFAULT:
      default:
        return this.defaultQueue;
    }
  }

  async addJob<T>(
    queueName: string,
    jobName: string,
    data: T,
    options?: {
      delay?: number;
      attempts?: number;
      priority?: number;
      removeOnComplete?: boolean;
      removeOnFail?: boolean;
    },
  ): Promise<Job<T>> {
    const queue = this.getQueue(queueName);

    const defaultOptions = {
      attempts: this.config.queueMaxRetries,
      backoff: {
        type: 'exponential',
        delay: this.config.queueRetryDelay,
      },
      removeOnComplete: true,
      removeOnFail: false,
    };

    return queue.add(jobName, data, {
      ...defaultOptions,
      ...options,
      priority: options?.priority || this.getDefaultPriority(queueName),
    }) as Promise<Job<T>>;
  }

  async getJob<T>(
    queueName: string,
    jobId: string,
  ): Promise<Job<T> | undefined> {
    const queue = this.getQueue(queueName);
    return queue.getJob(jobId) as Promise<Job<T> | undefined>;
  }

  async getQueueMetrics(queueName?: string): Promise<QueueMetrics[]> {
    const queues = queueName
      ? [{ name: queueName, queue: this.getQueue(queueName) }]
      : [
          { name: QUEUE_NAMES.CRITICAL, queue: this.criticalQueue },
          { name: QUEUE_NAMES.DEFAULT, queue: this.defaultQueue },
          { name: QUEUE_NAMES.BULK, queue: this.bulkQueue },
          { name: QUEUE_NAMES.CBB_SYNC, queue: this.cbbSyncQueue },
        ];

    const metrics: QueueMetrics[] = [];

    for (const { name, queue } of queues) {
      const [counts, isPaused] = await Promise.all([
        queue.getJobCounts(),
        queue.isPaused(),
      ]);

      metrics.push({
        name,
        counts: {
          waiting: counts.waiting || 0,
          active: counts.active || 0,
          completed: counts.completed || 0,
          failed: counts.failed || 0,
          delayed: counts.delayed || 0,
        },
        isPaused,
      });
    }

    return metrics;
  }

  private getDefaultPriority(queueName: string): number {
    switch (queueName) {
      case QUEUE_NAMES.CRITICAL:
        return QUEUE_PRIORITIES.CRITICAL;
      case QUEUE_NAMES.BULK:
        return QUEUE_PRIORITIES.BULK;
      case QUEUE_NAMES.DEFAULT:
      default:
        return QUEUE_PRIORITIES.DEFAULT;
    }
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
  }

  async drainQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.drain();
  }

  async cleanQueue(
    queueName: string,
    grace: number,
    status: 'completed' | 'wait' | 'active' | 'delayed' | 'failed',
  ): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.clean(grace, 0, status);
  }

  async addRepeatableJob<T extends Record<string, unknown>>(
    queueName: string,
    jobName: string,
    data: T,
    repeatOptions: {
      pattern: string; // Cron expression
      tz?: string; // Timezone
    },
  ): Promise<Job<T>> {
    const queue = this.getQueue(queueName);

    // Create a unique job ID based on workflow ID to prevent duplicates
    const jobId = data.workflowId
      ? `cron-${data.workflowId as string}`
      : undefined;

    return queue.add(jobName, data, {
      jobId,
      repeat: {
        pattern: repeatOptions.pattern,
        tz: repeatOptions.tz || 'UTC',
      },
      attempts: this.config.queueMaxRetries,
      backoff: {
        type: 'exponential',
        delay: this.config.queueRetryDelay,
      },
      removeOnComplete: true,
      removeOnFail: false,
      priority: this.getDefaultPriority(queueName),
    }) as Promise<Job<T>>;
  }

  async removeRepeatableJob(
    queueName: string,
    workflowId: string,
  ): Promise<void> {
    const queue = this.getQueue(queueName);
    const repeatableJobs = await queue.getRepeatableJobs();

    const jobToRemove = repeatableJobs.find(
      (job) => job.id === `cron-${workflowId}`,
    );

    if (jobToRemove) {
      await queue.removeRepeatableByKey(jobToRemove.key);
    }
  }

  async getRepeatableJobs(
    queueName: string = QUEUE_NAMES.DEFAULT,
  ): Promise<RepeatableJob[]> {
    const queue = this.getQueue(queueName);
    return queue.getRepeatableJobs();
  }
}
