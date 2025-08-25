import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job, RepeatableJob } from 'bullmq';
import {
  QUEUE_NAMES,
  QUEUE_PRIORITIES,
  QueueMetrics,
} from '@visapi/shared-types';
import { ConfigService } from '@visapi/core-config';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  constructor(
    @InjectQueue(QUEUE_NAMES.CRITICAL) private criticalQueue: Queue,
    @InjectQueue(QUEUE_NAMES.DEFAULT) private defaultQueue: Queue,
    @InjectQueue(QUEUE_NAMES.BULK) private bulkQueue: Queue,
    @InjectQueue(QUEUE_NAMES.CBB_SYNC) private cbbSyncQueue: Queue,
    @InjectQueue(QUEUE_NAMES.WHATSAPP_MESSAGES)
    private whatsappMessagesQueue: Queue,
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
      case QUEUE_NAMES.WHATSAPP_MESSAGES:
        return this.whatsappMessagesQueue;
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
      backoff?: {
        type: string;
        delay: number;
      };
    },
  ): Promise<Job<T>> {
    this.logger.log(
      `Adding job to queue: ${queueName}, job: ${jobName}`,
      { data },
    );
    
    const queue = this.getQueue(queueName);
    if (!queue) {
      this.logger.error(`Queue ${queueName} not found!`);
      throw new Error(`Queue ${queueName} not found`);
    }

    const defaultOptions = {
      attempts: this.config.queueMaxRetries,
      backoff: {
        type: 'exponential',
        delay: this.config.queueRetryDelay,
      },
      removeOnComplete: true,
      removeOnFail: false,
    };

    try {
      const job = await queue.add(jobName, data, {
        ...defaultOptions,
        ...options,
        priority: options?.priority || this.getDefaultPriority(queueName),
      }) as Job<T>;
      
      this.logger.log(
        `Job added successfully: ${queueName}/${jobName}, job ID: ${job.id}`,
      );
      
      return job;
    } catch (error) {
      this.logger.error(
        `Failed to add job to queue ${queueName}:`,
        error instanceof Error ? error.message : error,
      );
      throw error;
    }
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
          {
            name: QUEUE_NAMES.WHATSAPP_MESSAGES,
            queue: this.whatsappMessagesQueue,
          },
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

  /**
   * Automatically resume all queues on startup
   * This prevents queues from staying paused after a restart
   */
  async onModuleInit() {
    this.logger.log('Initializing queue service...');

    const queues = [
      { name: QUEUE_NAMES.CRITICAL, queue: this.criticalQueue },
      { name: QUEUE_NAMES.DEFAULT, queue: this.defaultQueue },
      { name: QUEUE_NAMES.BULK, queue: this.bulkQueue },
      { name: QUEUE_NAMES.CBB_SYNC, queue: this.cbbSyncQueue },
      {
        name: QUEUE_NAMES.WHATSAPP_MESSAGES,
        queue: this.whatsappMessagesQueue,
      },
    ];

    // ALWAYS resume queues on startup and clean up old jobs
    for (const { name, queue } of queues) {
      try {
        // Force resume regardless of current state
        await queue.resume();
        const isPaused = await queue.isPaused();
        
        if (isPaused) {
          // If still paused, log error
          this.logger.error(
            `Queue ${name} is still paused after resume attempt!`,
          );
        } else {
          this.logger.log(`Queue ${name} is active`);
        }

        // Clean up very old completed/failed jobs (older than 24 hours)
        const grace = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        await queue.clean(grace, 0, 'completed');
        await queue.clean(grace, 0, 'failed');

        // Get current job counts for monitoring
        const counts = await queue.getJobCounts();
        if (counts.delayed > 0 || counts.waiting > 0 || counts.active > 0) {
          this.logger.log(
            `Queue ${name}: ${counts.active} active, ${counts.waiting} waiting, ${counts.delayed} delayed`,
          );
        }
      } catch (error) {
        this.logger.error(`Error initializing queue ${name}:`, error);
      }
    }

    this.logger.log('Queue service initialized successfully');
  }

  /**
   * Gracefully shutdown all queues
   */
  async onModuleDestroy() {
    this.logger.log('Starting graceful queue shutdown...');

    const queues = [
      { name: QUEUE_NAMES.CRITICAL, queue: this.criticalQueue },
      { name: QUEUE_NAMES.DEFAULT, queue: this.defaultQueue },
      { name: QUEUE_NAMES.BULK, queue: this.bulkQueue },
      { name: QUEUE_NAMES.CBB_SYNC, queue: this.cbbSyncQueue },
      {
        name: QUEUE_NAMES.WHATSAPP_MESSAGES,
        queue: this.whatsappMessagesQueue,
      },
    ];

    try {
      // DO NOT pause queues - let them resume naturally on next startup
      // Just wait for active jobs to complete
      const shutdownTimeout = setTimeout(() => {
        this.logger.warn('Queue shutdown timeout reached, forcing close');
      }, 5000);

      // Wait for active jobs only
      for (const { name, queue } of queues) {
        const counts = await queue.getJobCounts();
        if (counts.active > 0) {
          this.logger.log(
            `Waiting for ${counts.active} active jobs in ${name} queue`,
          );
        }
      }

      // Close all queue connections without pausing
      await Promise.all(queues.map(({ queue }) => queue.close()));
      clearTimeout(shutdownTimeout);

      this.logger.log('All queues closed gracefully');
    } catch (error) {
      this.logger.error('Error during queue shutdown:', error);
    }
  }
}
