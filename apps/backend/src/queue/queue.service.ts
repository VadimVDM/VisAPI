import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { QUEUE_NAMES, QUEUE_PRIORITIES } from '@visapi/shared-types';
import { ConfigService } from '@visapi/core-config';

interface QueueMetrics {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QUEUE_NAMES.CRITICAL) private criticalQueue: Queue,
    @InjectQueue(QUEUE_NAMES.DEFAULT) private defaultQueue: Queue,
    @InjectQueue(QUEUE_NAMES.BULK) private bulkQueue: Queue,
    private readonly config: ConfigService
  ) {}

  private getQueue(queueName: string): Queue {
    switch (queueName) {
      case QUEUE_NAMES.CRITICAL:
        return this.criticalQueue;
      case QUEUE_NAMES.BULK:
        return this.bulkQueue;
      case QUEUE_NAMES.DEFAULT:
      default:
        return this.defaultQueue;
    }
  }

  async addJob(
    queueName: string,
    jobName: string,
    data: any,
    options?: {
      delay?: number;
      attempts?: number;
      priority?: number;
      removeOnComplete?: boolean;
      removeOnFail?: boolean;
    }
  ): Promise<Job> {
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
    });
  }

  async getJob(queueName: string, jobId: string): Promise<Job | undefined> {
    const queue = this.getQueue(queueName);
    return queue.getJob(jobId);
  }

  async getQueueMetrics(queueName?: string): Promise<QueueMetrics[]> {
    const queues = queueName
      ? [{ name: queueName, queue: this.getQueue(queueName) }]
      : [
          { name: QUEUE_NAMES.CRITICAL, queue: this.criticalQueue },
          { name: QUEUE_NAMES.DEFAULT, queue: this.defaultQueue },
          { name: QUEUE_NAMES.BULK, queue: this.bulkQueue },
        ];

    const metrics: QueueMetrics[] = [];

    for (const { name, queue } of queues) {
      const counts = await queue.getJobCounts();
      metrics.push({
        name,
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
        delayed: counts.delayed || 0,
      });
    }

    return metrics;
  }

  async checkHealth(): Promise<boolean> {
    try {
      // Try to add and remove a test job
      const job = await this.defaultQueue.add('health-check', { test: true });
      await job.remove();
      return true;
    } catch {
      return false;
    }
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
    limit: number,
    status: 'completed' | 'wait' | 'active' | 'delayed' | 'failed'
  ): Promise<string[]> {
    const queue = this.getQueue(queueName);
    return queue.clean(grace, limit, status);
  }
}
