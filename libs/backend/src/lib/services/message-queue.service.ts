import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, QueueEvents, Job } from 'bullmq';
import { ConversationCategory, TemplateParameter } from '../types/whatsapp.types';

export interface WhatsAppMessageJob {
  orderId?: string;
  phoneNumber: string;
  templateName: string;
  languageCode: string;
  parameters: TemplateParameter[];
  conversationCategory?: ConversationCategory;
  retryCount?: number;
  priority?: number;
}

export interface MessageQueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

@Injectable()
export class MessageQueueService {
  private readonly logger = new Logger(MessageQueueService.name);
  private queue: Queue<WhatsAppMessageJob> | null = null;
  private queueEvents: QueueEvents | null = null;
  private readonly queueName = 'whatsapp-messages';

  constructor(private readonly configService: ConfigService) {
    this.initializeQueue();
  }

  private initializeQueue(): void {
    try {
      const redisConfig = {
        host: this.configService.get('REDIS_HOST', 'localhost'),
        port: parseInt(this.configService.get('REDIS_PORT', '6379'), 10),
        password: this.configService.get('REDIS_PASSWORD'),
        tls: this.configService.get('REDIS_TLS', 'false') === 'true' ? {} : undefined,
      };

      this.queue = new Queue<WhatsAppMessageJob>(this.queueName, {
        connection: redisConfig,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: {
            age: 24 * 3600,
            count: 100,
          },
          removeOnFail: {
            age: 7 * 24 * 3600,
          },
        },
      });

      this.queueEvents = new QueueEvents(this.queueName, {
        connection: redisConfig,
      });

      this.setupEventListeners();
      
      this.logger.log('WhatsApp message queue initialized');
    } catch (error: any) {
      this.logger.error(`Failed to initialize queue: ${error.message}`);
    }
  }

  private setupEventListeners(): void {
    if (!this.queueEvents) return;

    this.queueEvents.on('completed', ({ jobId, returnvalue }) => {
      this.logger.log(`Job ${jobId} completed successfully`);
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      this.logger.error(`Job ${jobId} failed: ${failedReason}`);
    });

    this.queueEvents.on('progress', ({ jobId, data }) => {
      this.logger.log(`Job ${jobId} progress: ${JSON.stringify(data)}`);
    });
  }

  async addMessage(
    jobData: WhatsAppMessageJob,
    options?: {
      delay?: number;
      priority?: number;
      attempts?: number;
    },
  ): Promise<Job<WhatsAppMessageJob> | null> {
    if (!this.queue) {
      this.logger.error('Queue not initialized');
      return null;
    }

    try {
      const job = await this.queue.add('send-message', jobData, {
        delay: options?.delay,
        priority: options?.priority || 0,
        attempts: options?.attempts || 3,
      });

      this.logger.log(`Added message job ${job.id} for ${jobData.phoneNumber}`);
      return job;
    } catch (error: any) {
      this.logger.error(`Failed to add message to queue: ${error.message}`);
      return null;
    }
  }

  async addBulkMessages(
    messages: WhatsAppMessageJob[],
    options?: {
      delay?: number;
      priority?: number;
    },
  ): Promise<Job<WhatsAppMessageJob>[]> {
    if (!this.queue) {
      this.logger.error('Queue not initialized');
      return [];
    }

    try {
      const jobs = await this.queue.addBulk(
        messages.map((data) => ({
          name: 'send-message',
          data,
          opts: {
            delay: options?.delay,
            priority: options?.priority || 0,
          },
        })),
      );

      this.logger.log(`Added ${jobs.length} messages to queue`);
      return jobs;
    } catch (error: any) {
      this.logger.error(`Failed to add bulk messages: ${error.message}`);
      return [];
    }
  }

  async retryFailedJob(jobId: string): Promise<void> {
    if (!this.queue) {
      this.logger.error('Queue not initialized');
      return;
    }

    try {
      const job = await this.queue.getJob(jobId);
      
      if (!job) {
        this.logger.error(`Job ${jobId} not found`);
        return;
      }

      if (await job.isFailed()) {
        await job.retry();
        this.logger.log(`Retried job ${jobId}`);
      } else {
        this.logger.warn(`Job ${jobId} is not in failed state`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to retry job: ${error.message}`);
    }
  }

  async getQueueStats(): Promise<MessageQueueStats> {
    if (!this.queue) {
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      };
    }

    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getCompletedCount(),
        this.queue.getFailedCount(),
        this.queue.getDelayedCount(),
      ]);

      return {
        waiting,
        active,
        completed,
        failed,
        delayed,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get queue stats: ${error.message}`);
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      };
    }
  }

  async getFailedJobs(limit = 20): Promise<Job<WhatsAppMessageJob>[]> {
    if (!this.queue) {
      return [];
    }

    try {
      return await this.queue.getFailed(0, limit);
    } catch (error: any) {
      this.logger.error(`Failed to get failed jobs: ${error.message}`);
      return [];
    }
  }

  async clearFailedJobs(): Promise<void> {
    if (!this.queue) {
      return;
    }

    try {
      await this.queue.clean(0, 1000, 'failed');
      this.logger.log('Cleared failed jobs');
    } catch (error: any) {
      this.logger.error(`Failed to clear failed jobs: ${error.message}`);
    }
  }

  async pauseQueue(): Promise<void> {
    if (!this.queue) {
      return;
    }

    try {
      await this.queue.pause();
      this.logger.log('Queue paused');
    } catch (error: any) {
      this.logger.error(`Failed to pause queue: ${error.message}`);
    }
  }

  async resumeQueue(): Promise<void> {
    if (!this.queue) {
      return;
    }

    try {
      await this.queue.resume();
      this.logger.log('Queue resumed');
    } catch (error: any) {
      this.logger.error(`Failed to resume queue: ${error.message}`);
    }
  }

  async drainQueue(): Promise<void> {
    if (!this.queue) {
      return;
    }

    try {
      await this.queue.drain();
      this.logger.log('Queue drained');
    } catch (error: any) {
      this.logger.error(`Failed to drain queue: ${error.message}`);
    }
  }

  async getJob(jobId: string): Promise<Job<WhatsAppMessageJob> | undefined> {
    if (!this.queue) {
      return undefined;
    }

    try {
      const job = await this.queue.getJob(jobId);
      return job || undefined;
    } catch (error: any) {
      this.logger.error(`Failed to get job: ${error.message}`);
      return undefined;
    }
  }

  async getJobs(
    types: ('completed' | 'failed' | 'delayed' | 'active' | 'waiting' | 'paused')[],
    start = 0,
    end = 20,
  ): Promise<Job<WhatsAppMessageJob>[]> {
    if (!this.queue) {
      return [];
    }

    try {
      return await this.queue.getJobs(types, start, end);
    } catch (error: any) {
      this.logger.error(`Failed to get jobs: ${error.message}`);
      return [];
    }
  }

  async scheduleMessage(
    jobData: WhatsAppMessageJob,
    scheduleAt: Date,
  ): Promise<Job<WhatsAppMessageJob> | null> {
    const delay = scheduleAt.getTime() - Date.now();
    
    if (delay < 0) {
      this.logger.warn('Schedule time is in the past, sending immediately');
      return this.addMessage(jobData);
    }

    return this.addMessage(jobData, { delay });
  }

  async cancelJob(jobId: string): Promise<void> {
    if (!this.queue) {
      return;
    }

    try {
      const job = await this.queue.getJob(jobId);
      
      if (job) {
        await job.remove();
        this.logger.log(`Cancelled job ${jobId}`);
      } else {
        this.logger.warn(`Job ${jobId} not found`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to cancel job: ${error.message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
    }
    if (this.queueEvents) {
      await this.queueEvents.close();
    }
  }
}