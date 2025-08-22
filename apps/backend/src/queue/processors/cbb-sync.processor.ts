import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CBBContactSyncResult } from '@visapi/shared-types';
import { LogService } from '@visapi/backend-logging';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';
import { CBBSyncOrchestratorService } from '../services/cbb-sync-orchestrator.service';

interface CBBSyncJobData {
  orderId: string;
}

/**
 * Queue processor for CBB contact synchronization
 * Handles job processing, metrics, and error handling
 * Delegates sync logic to orchestrator service
 */
@Injectable()
@Processor('cbb-sync')
export class CBBSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(CBBSyncProcessor.name);

  constructor(
    private readonly syncOrchestrator: CBBSyncOrchestratorService,
    private readonly logService: LogService,
    @InjectMetric('cbb_sync_total')
    private readonly syncTotalCounter: Counter<string>,
    @InjectMetric('cbb_sync_success')
    private readonly syncSuccessCounter: Counter<string>,
    @InjectMetric('cbb_sync_failures')
    private readonly syncFailureCounter: Counter<string>,
    @InjectMetric('cbb_sync_duration')
    private readonly syncDurationHistogram: Histogram<string>,
    @InjectMetric('cbb_contacts_created')
    private readonly contactsCreatedCounter: Counter<string>,
    @InjectMetric('cbb_contacts_updated')
    private readonly contactsUpdatedCounter: Counter<string>,
    @InjectMetric('cbb_whatsapp_available')
    private readonly whatsappAvailableCounter: Counter<string>,
    @InjectMetric('cbb_whatsapp_unavailable')
    private readonly whatsappUnavailableCounter: Counter<string>,
  ) {
    super();
  }

  /**
   * Process CBB sync job
   */
  async process(job: Job<CBBSyncJobData>): Promise<CBBContactSyncResult> {
    const { orderId } = job.data;
    const startTime = Date.now();

    this.logger.log(`Processing CBB sync job for order: ${orderId}`);
    this.syncTotalCounter.inc();

    // Log job start
    await this.logJobStart(orderId, job.id);

    try {
      // Delegate to orchestrator service
      const result = await this.syncOrchestrator.syncOrderToCBB(orderId);

      // Update metrics based on result
      this.updateMetrics(result, startTime);

      // Log success
      this.logger.log(`CBB sync completed for order ${orderId}`, result);

      return result;
    } catch (error) {
      // Handle error
      await this.handleJobError(orderId, error, startTime);
      throw error;
    }
  }

  /**
   * Log job start to database
   */
  private async logJobStart(orderId: string, jobId?: string): Promise<void> {
    await this.logService.createLog({
      level: 'info',
      message: 'Starting CBB contact sync',
      metadata: {
        order_id: orderId,
        job_id: jobId,
        source: 'cbb_sync',
      },
    });
  }

  /**
   * Update Prometheus metrics based on sync result
   */
  private updateMetrics(result: CBBContactSyncResult, startTime: number): void {
    // Record duration
    const duration = (Date.now() - startTime) / 1000;
    this.syncDurationHistogram.observe(duration);

    // Success counter
    this.syncSuccessCounter.inc();

    // Action counters
    if (result.action === 'created') {
      this.contactsCreatedCounter.inc();
    } else if (result.action === 'updated') {
      this.contactsUpdatedCounter.inc();
    }

    // WhatsApp availability
    if (result.hasWhatsApp) {
      this.whatsappAvailableCounter.inc();
    } else if (result.status === 'no_whatsapp') {
      this.whatsappUnavailableCounter.inc();
    }
  }

  /**
   * Handle job processing error
   */
  private async handleJobError(
    orderId: string,
    error: unknown,
    startTime: number,
  ): Promise<void> {
    this.logger.error(`CBB sync failed for order ${orderId}:`, error);

    // Update metrics
    const duration = (Date.now() - startTime) / 1000;
    this.syncDurationHistogram.observe(duration);
    this.syncFailureCounter.inc();

    // Delegate error handling to orchestrator
    await this.syncOrchestrator.handleSyncError(orderId, error);
  }
}