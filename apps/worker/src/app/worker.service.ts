import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Worker } from 'bullmq';
import { ConfigService } from '@visapi/core-config';
import { QUEUE_NAMES, JOB_NAMES } from '@visapi/shared-types';
import { SlackProcessor } from './processors/slack.processor';
import { WhatsAppProcessor } from './processors/whatsapp.processor';
import { PdfProcessor } from './processors/pdf.processor';
import { DlqProcessor } from './processors/dlq.processor';
import { WorkflowProcessor } from './processors/workflow.processor';
import { LogPruneProcessor } from './processors/log-prune.processor';
import type { Job } from 'bullmq';

@Injectable()
export class WorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerService.name);
  private workers: Worker[] = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly slackProcessor: SlackProcessor,
    private readonly whatsAppProcessor: WhatsAppProcessor,
    private readonly pdfProcessor: PdfProcessor,
    private readonly dlqProcessor: DlqProcessor,
    private readonly workflowProcessor: WorkflowProcessor,
    private readonly logPruneProcessor: LogPruneProcessor,
  ) {}

  onModuleInit(): void {
    const redisUrl = this.configService.redisUrl;
    const connection = {
      url: redisUrl,
    };

    // Create workers for each queue
    const criticalWorker = new Worker(
      QUEUE_NAMES.CRITICAL,
      async (job) => {
        this.logger.log(
          `Processing critical job ${job.id} of type ${job.name}`,
        );
        return this.processJob(job);
      },
      {
        connection,
        concurrency: 5,
      },
    );

    const defaultWorker = new Worker(
      QUEUE_NAMES.DEFAULT,
      async (job) => {
        this.logger.log(`Processing default job ${job.id} of type ${job.name}`);
        return this.processJob(job);
      },
      {
        connection,
        concurrency: 10,
      },
    );

    const bulkWorker = new Worker(
      QUEUE_NAMES.BULK,
      async (job) => {
        this.logger.log(`Processing bulk job ${job.id} of type ${job.name}`);
        return this.processJob(job);
      },
      {
        connection,
        concurrency: 20,
      },
    );

    // For now, create a DLQ queue with a different name
    const dlqWorker = new Worker(
      'dlq',
      async (job) => {
        this.logger.log(`Processing DLQ job ${job.id}`);
        return this.dlqProcessor.process(job);
      },
      {
        connection,
        concurrency: 1,
      },
    );

    // Register event handlers
    [criticalWorker, defaultWorker, bulkWorker, dlqWorker].forEach((worker) => {
      worker.on('completed', (job) => {
        this.logger.log(`Job ${job.id} completed successfully`);
      });

      worker.on('failed', (job, err) => {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const stack = err instanceof Error ? err.stack : undefined;
        this.logger.error(`Job ${job?.id} failed: ${errorMessage}`, stack);
      });

      worker.on('error', (err) => {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const stack = err instanceof Error ? err.stack : undefined;
        this.logger.error(`Worker error: ${errorMessage}`, stack);
      });
    });

    this.workers = [criticalWorker, defaultWorker, bulkWorker, dlqWorker];
    this.logger.log('Workers initialized and running');
  }

  async onModuleDestroy() {
    this.logger.log('Closing workers...');
    await Promise.all(this.workers.map((worker) => worker.close()));
    this.logger.log('All workers closed');
  }

  private async processJob(job: Job<unknown>): Promise<unknown> {
    switch (job.name) {
      case JOB_NAMES.SEND_SLACK:
      case 'slack.send':
        if (this.isSlackJob(job)) {
          return this.slackProcessor.process(job);
        }
        break;
      case JOB_NAMES.SEND_WHATSAPP:
      case 'whatsapp.send':
        if (this.isWhatsAppJob(job)) {
          return this.whatsAppProcessor.process(job);
        }
        break;
      case JOB_NAMES.GENERATE_PDF:
      case 'pdf.generate':
        if (this.isPdfJob(job)) {
          return this.pdfProcessor.process(job);
        }
        break;
      case JOB_NAMES.PROCESS_WORKFLOW:
        if (this.isWorkflowJob(job)) {
          return this.workflowProcessor.process(job.data);
        }
        break;
      case JOB_NAMES.PRUNE_LOGS:
        if (this.isLogPruneJob(job)) {
          return this.logPruneProcessor.process(job);
        }
        break;
      default:
        break;
    }

    throw new Error(`Unknown job type: ${job.name}`);
  }

  private isSlackJob(
    job: Job<unknown>,
  ): job is Parameters<SlackProcessor['process']>[0] {
    return job.name === JOB_NAMES.SEND_SLACK || job.name === 'slack.send';
  }

  private isWhatsAppJob(
    job: Job<unknown>,
  ): job is Parameters<WhatsAppProcessor['process']>[0] {
    return job.name === JOB_NAMES.SEND_WHATSAPP || job.name === 'whatsapp.send';
  }

  private isPdfJob(
    job: Job<unknown>,
  ): job is Parameters<PdfProcessor['process']>[0] {
    return job.name === JOB_NAMES.GENERATE_PDF || job.name === 'pdf.generate';
  }

  private isWorkflowJob(
    job: Job<unknown>,
  ): job is Job<Parameters<WorkflowProcessor['process']>[0]> {
    return job.name === JOB_NAMES.PROCESS_WORKFLOW;
  }

  private isLogPruneJob(
    job: Job<unknown>,
  ): job is Parameters<LogPruneProcessor['process']>[0] {
    return job.name === JOB_NAMES.PRUNE_LOGS;
  }
}
