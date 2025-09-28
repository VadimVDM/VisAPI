import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge, register } from 'prom-client';

@Injectable()
export class CBBSyncMetricsService {
  private readonly syncCounter: Counter<string>;
  private readonly syncDuration: Histogram<string>;
  private readonly syncErrors: Counter<string>;
  private readonly syncAttempts: Counter<string>;
  private readonly activeSync: Gauge<string>;
  private readonly whatsappAvailability: Counter<string>;
  private readonly contactOperations: Counter<string>;

  constructor() {
    // Track total sync operations
    this.syncCounter = new Counter({
      name: 'cbb_sync_total',
      help: 'Total number of CBB sync operations',
      labelNames: ['status', 'action', 'branch'],
    });

    // Track sync duration
    this.syncDuration = new Histogram({
      name: 'cbb_sync_duration_seconds',
      help: 'Duration of CBB sync operations in seconds',
      labelNames: ['status', 'action'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    });

    // Track sync errors
    this.syncErrors = new Counter({
      name: 'cbb_sync_errors_total',
      help: 'Total number of CBB sync errors',
      labelNames: ['error_type', 'branch'],
    });

    // Track sync attempts (retries)
    this.syncAttempts = new Counter({
      name: 'cbb_sync_attempts_total',
      help: 'Total number of CBB sync attempts including retries',
      labelNames: ['branch'],
    });

    // Track active sync operations
    this.activeSync = new Gauge({
      name: 'cbb_sync_active',
      help: 'Number of currently active CBB sync operations',
    });

    // Track WhatsApp availability
    this.whatsappAvailability = new Counter({
      name: 'cbb_whatsapp_availability_total',
      help: 'WhatsApp availability check results',
      labelNames: ['available', 'branch'],
    });

    // Track contact operations
    this.contactOperations = new Counter({
      name: 'cbb_contact_operations_total',
      help: 'CBB contact create/update operations',
      labelNames: ['operation', 'status'],
    });

    // Register all metrics
    register.registerMetric(this.syncCounter);
    register.registerMetric(this.syncDuration);
    register.registerMetric(this.syncErrors);
    register.registerMetric(this.syncAttempts);
    register.registerMetric(this.activeSync);
    register.registerMetric(this.whatsappAvailability);
    register.registerMetric(this.contactOperations);
  }

  /**
   * Record a sync operation start
   */
  startSync(): () => number {
    this.activeSync.inc();
    const startTime = Date.now();

    return () => {
      this.activeSync.dec();
      return (Date.now() - startTime) / 1000;
    };
  }

  /**
   * Record sync completion
   */
  recordSyncComplete(
    status: 'success' | 'partial' | 'failed' | 'skipped',
    action: 'created' | 'updated' | 'skipped',
    branch: string,
    duration: number,
  ): void {
    this.syncCounter.inc({ status, action, branch });
    this.syncDuration.observe({ status, action }, duration);
  }

  /**
   * Record sync error
   */
  recordSyncError(errorType: string, branch: string): void {
    this.syncErrors.inc({ error_type: errorType, branch });
  }

  /**
   * Record sync attempt
   */
  recordSyncAttempt(branch: string): void {
    this.syncAttempts.inc({ branch });
  }

  /**
   * Record WhatsApp availability check
   */
  recordWhatsAppAvailability(available: boolean, branch: string): void {
    this.whatsappAvailability.inc({
      available: available ? 'yes' : 'no',
      branch,
    });
  }

  /**
   * Record contact operation
   */
  recordContactOperation(
    operation: 'create' | 'update' | 'fetch',
    status: 'success' | 'failed',
  ): void {
    this.contactOperations.inc({ operation, status });
  }

  /**
   * Get current metrics summary
   */
  async getMetricsSummary(): Promise<{
    totalSyncs: number;
    successRate: number;
    averageDuration: number;
    errorRate: number;
    whatsappAvailabilityRate: number;
  }> {
    const metrics = await register.getMetricsAsJSON();

    interface Metric {
      name: string;
      values?: {
        value: number;
        labels?: Record<string, string>;
      }[];
      aggregator?: string;
      value?: number;
    }

    // Parse metrics to calculate summary
    let totalSyncs = 0;
    let successfulSyncs = 0;
    let totalDuration = 0;
    let durationCount = 0;
    let totalErrors = 0;
    let whatsappAvailable = 0;
    let whatsappTotal = 0;

    for (const metric of metrics as Metric[]) {
      if (metric.name === 'cbb_sync_total') {
        const values = metric.values || [];
        for (const value of values) {
          totalSyncs += value.value || 0;
          if (value.labels?.status === 'success') {
            successfulSyncs += value.value || 0;
          }
        }
      }

      if (metric.name === 'cbb_sync_duration_seconds') {
        // For histograms, we need to look for specific aggregations
        if (metric.aggregator === 'sum') {
          totalDuration += metric.value || 0;
        } else if (metric.aggregator === 'count') {
          durationCount += metric.value || 0;
        }
      }

      if (metric.name === 'cbb_sync_errors_total') {
        const values = metric.values || [];
        for (const value of values) {
          totalErrors += value.value || 0;
        }
      }

      if (metric.name === 'cbb_whatsapp_availability_total') {
        const values = metric.values || [];
        for (const value of values) {
          whatsappTotal += value.value || 0;
          if (value.labels?.available === 'yes') {
            whatsappAvailable += value.value || 0;
          }
        }
      }
    }

    return {
      totalSyncs,
      successRate: totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 0,
      averageDuration: durationCount > 0 ? totalDuration / durationCount : 0,
      errorRate: totalSyncs > 0 ? (totalErrors / totalSyncs) * 100 : 0,
      whatsappAvailabilityRate:
        whatsappTotal > 0 ? (whatsappAvailable / whatsappTotal) * 100 : 0,
    };
  }
}
