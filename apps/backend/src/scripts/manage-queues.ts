#!/usr/bin/env node
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app/app.module';
import { QueueService } from '../queue/queue.service';
import { QUEUE_NAMES } from '@visapi/shared-types';
import { Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

const logger = new Logger('QueueManager');

async function main() {
  const action = process.argv[2];
  const queueName = process.argv[3];

  if (!action) {
    console.error('Usage: npm run queue:manage <action> [queue-name]');
    console.error(
      'Actions: status, pause, resume, clean-delayed, clean-failed, resume-all',
    );
    process.exit(1);
  }

  // Bootstrap NestJS app without starting HTTP server
  const app = await NestFactory.createApplicationContext(AppModule);
  const queueService = app.get(QueueService);

  try {
    switch (action) {
      case 'status':
        const metrics = await queueService.getQueueMetrics(queueName);
        console.log('Queue Metrics:');
        console.log(JSON.stringify(metrics, null, 2));
        break;

      case 'pause':
        if (!queueName) {
          console.error('Queue name required for pause action');
          process.exit(1);
        }
        await queueService.pauseQueue(queueName);
        logger.log(`Queue ${queueName} paused`);
        break;

      case 'resume':
        if (!queueName) {
          console.error('Queue name required for resume action');
          process.exit(1);
        }
        await queueService.resumeQueue(queueName);
        logger.log(`Queue ${queueName} resumed`);
        break;

      case 'resume-all':
        // Resume all queues
        const queuesToResume = [
          QUEUE_NAMES.CRITICAL,
          QUEUE_NAMES.DEFAULT,
          QUEUE_NAMES.BULK,
          QUEUE_NAMES.CBB_SYNC,
          QUEUE_NAMES.WHATSAPP_MESSAGES,
        ];

        for (const q of queuesToResume) {
          await queueService.resumeQueue(q);
          logger.log(`Resumed queue: ${q}`);
        }
        logger.log('All queues resumed successfully');
        break;

      case 'clean-delayed':
        if (!queueName) {
          console.error('Queue name required for clean-delayed action');
          process.exit(1);
        }
        await queueService.cleanQueue(queueName, 0, 'delayed');
        logger.log(`Cleaned delayed jobs from ${queueName}`);
        break;

      case 'clean-failed':
        if (!queueName) {
          console.error('Queue name required for clean-failed action');
          process.exit(1);
        }
        await queueService.cleanQueue(queueName, 0, 'failed');
        logger.log(`Cleaned failed jobs from ${queueName}`);
        break;

      case 'clean-whatsapp-old':
        // Clean up the old 56 WhatsApp messages
        logger.log('Cleaning old WhatsApp messages...');

        // Get the whatsapp queue directly
        const whatsappQueue = app.get<Queue>('BullQueue_WHATSAPP_MESSAGES');

        // Get all delayed jobs
        const delayedJobs = await whatsappQueue.getDelayed();
        logger.log(`Found ${delayedJobs.length} delayed jobs`);

        // Remove all except the latest (job 57)
        let removedCount = 0;
        for (const job of delayedJobs) {
          // Skip job 57 (our test job)
          if (job.id === '57') {
            logger.log(`Keeping job ${job.id} (test job)`);
            continue;
          }

          await job.remove();
          removedCount++;
        }

        logger.log(`Removed ${removedCount} old WhatsApp jobs`);
        break;

      default:
        console.error(`Unknown action: ${action}`);
        process.exit(1);
    }
  } catch (error) {
    logger.error('Error managing queues:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
