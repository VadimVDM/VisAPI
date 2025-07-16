import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MetricsService } from './metrics.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class QueueMetricsService implements OnModuleInit {
  constructor(
    @InjectQueue('critical') private readonly criticalQueue: Queue,
    @InjectQueue('default') private readonly defaultQueue: Queue,
    @InjectQueue('bulk') private readonly bulkQueue: Queue,
    private readonly metricsService: MetricsService
  ) {}

  async onModuleInit() {
    // Collect metrics on startup
    await this.collectQueueMetrics();
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async collectQueueMetrics() {
    const queues = [
      { name: 'critical', queue: this.criticalQueue },
      { name: 'default', queue: this.defaultQueue },
      { name: 'bulk', queue: this.bulkQueue },
    ];

    for (const { name, queue } of queues) {
      try {
        const [waiting, active, completed, failed, delayed] = await Promise.all(
          [
            queue.getWaitingCount(),
            queue.getActiveCount(),
            queue.getCompletedCount(),
            queue.getFailedCount(),
            queue.getDelayedCount(),
          ]
        );

        // Set queue depth metrics
        this.metricsService.setQueueDepth(name, 'waiting', waiting);
        this.metricsService.setQueueDepth(name, 'active', active);
        this.metricsService.setQueueDepth(name, 'completed', completed);
        this.metricsService.setQueueDepth(name, 'failed', failed);
        this.metricsService.setQueueDepth(name, 'delayed', delayed);
      } catch (error) {
        // Log error but don't crash the metrics collection
        console.error(`Failed to collect metrics for queue ${name}:`, error);
      }
    }
  }

  // Helper method to record job metrics from worker
  recordJobMetrics(
    jobName: string,
    queue: string,
    success: boolean,
    duration: number
  ): void {
    this.metricsService.recordJobExecution(jobName, queue, success, duration);
  }
}
