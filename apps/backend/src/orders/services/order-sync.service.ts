import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@visapi/core-config';
import { QueueService } from '../../queue/queue.service';
import { QUEUE_NAMES } from '@visapi/shared-types';
import {
  EventBusService,
  OrderSyncRequestedEvent,
} from '@visapi/backend-events';

export interface OrderSyncOptions {
  orderId: string;
  branch: string;
  whatsappAlertsEnabled: boolean;
}

/**
 * OrderSyncService - Handles synchronization of orders with external systems
 * Extracted from orders.service.ts to follow single responsibility principle
 */
@Injectable()
export class OrderSyncService {
  private readonly logger = new Logger(OrderSyncService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly queueService: QueueService,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Queue CBB sync for IL branch orders
   * This triggers the contact synchronization with CBB/WhatsApp system
   */
  async queueCBBSync(options: OrderSyncOptions): Promise<void> {
    const { orderId, branch, whatsappAlertsEnabled } = options;

    // Only sync IL branch orders
    if (!this.shouldSyncWithCBB(branch)) {
      this.logger.debug(
        `CBB sync skipped for non-IL branch order ${orderId} (branch: ${branch})`,
      );
      return;
    }

    try {
      const syncDelay = this.configService.cbbSyncDelayMs || 2000;

      // Add job to CBB sync queue
      await this.queueService.addJob(
        QUEUE_NAMES.CBB_SYNC,
        'sync-contact',
        { orderId },
        {
          delay: syncDelay,
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: false,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );

      this.logger.log(
        `CBB sync queued for IL branch order ${orderId} (WhatsApp alerts: ${whatsappAlertsEnabled}, delay: ${syncDelay}ms)`,
      );

      // Emit domain event for audit trail
      await this.eventBus.publish(
        new OrderSyncRequestedEvent({
          orderId,
          syncType: 'CBB',
          branch,
          whatsappAlertsEnabled,
          delayMs: syncDelay,
        }),
      );
    } catch (error) {
      // Don't fail the order creation if queue fails
      this.logger.error(
        `Failed to queue CBB sync for order ${orderId}:`,
        error,
      );

      // Still emit event for tracking, but with error status
      await this.eventBus.publish(
        new OrderSyncRequestedEvent({
          orderId,
          syncType: 'CBB',
          branch,
          whatsappAlertsEnabled,
          delayMs: 0,
          error: (error as Error).message,
        }),
      );
    }
  }

  /**
   * Queue WhatsApp message for orders with alerts enabled
   */
  async queueWhatsAppMessage(
    orderId: string,
    whatsappAlertsEnabled: boolean,
    branch: string,
  ): Promise<void> {
    // Only queue if WhatsApp alerts are enabled AND it's IL branch
    if (!whatsappAlertsEnabled || !this.shouldSyncWithCBB(branch)) {
      this.logger.debug(
        `WhatsApp message skipped for order ${orderId} (alerts: ${whatsappAlertsEnabled}, branch: ${branch})`,
      );
      return;
    }

    try {
      const messageDelay = this.configService.whatsappMessageDelayMs || 5000;

      await this.queueService.addJob(
        QUEUE_NAMES.WHATSAPP_MESSAGES,
        'send-order-confirmation',
        { orderId },
        {
          delay: messageDelay,
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: false,
          backoff: {
            type: 'exponential',
            delay: 10000,
          },
        },
      );

      this.logger.log(
        `WhatsApp message queued for order ${orderId} (delay: ${messageDelay}ms)`,
      );

      // Emit event for tracking
      await this.eventBus.publish(
        new OrderSyncRequestedEvent({
          orderId,
          syncType: 'WhatsApp',
          branch,
          whatsappAlertsEnabled,
          delayMs: messageDelay,
        }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to queue WhatsApp message for order ${orderId}:`,
        error,
      );
    }
  }

  /**
   * Queue order for workflow processing
   */
  async queueWorkflowProcessing(
    orderId: string,
    workflowTriggers?: string[],
  ): Promise<void> {
    if (!workflowTriggers || workflowTriggers.length === 0) {
      this.logger.debug(`No workflow triggers configured for order ${orderId}`);
      return;
    }

    try {
      const workflowDelay =
        this.configService.workflowProcessingDelayMs || 1000;

      for (const triggerId of workflowTriggers) {
        await this.queueService.addJob(
          QUEUE_NAMES.DEFAULT,
          'process-order-workflow',
          { orderId, triggerId },
          {
            delay: workflowDelay,
            attempts: 5,
            removeOnComplete: true,
            removeOnFail: false,
            backoff: {
              type: 'exponential',
              delay: 3000,
            },
          },
        );

        this.logger.log(
          `Workflow processing queued for order ${orderId} with trigger ${triggerId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to queue workflow processing for order ${orderId}:`,
        error,
      );
    }
  }

  /**
   * Queue order for batch processing (e.g., bulk operations)
   */
  async queueBatchProcessing(
    orderIds: string[],
    operation: string,
    priority = 'normal',
  ): Promise<void> {
    if (orderIds.length === 0) {
      return;
    }

    try {
      const batchSize = this.configService.workflowBatchProcessingSize || 50;
      const batches = this.createBatches(orderIds, batchSize);

      for (const [index, batch] of batches.entries()) {
        await this.queueService.addJob(
          QUEUE_NAMES.BULK,
          operation,
          { orderIds: batch, batchIndex: index },
          {
            priority: priority === 'high' ? 1 : priority === 'low' ? 3 : 2,
            attempts: 3,
            removeOnComplete: true,
            removeOnFail: false,
          },
        );

        this.logger.log(
          `Batch ${index + 1}/${batches.length} queued for ${operation} with ${batch.length} orders`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to queue batch processing for ${orderIds.length} orders:`,
        error,
      );
    }
  }

  /**
   * Check if branch should sync with CBB
   */
  private shouldSyncWithCBB(branch: string): boolean {
    const normalizedBranch = branch?.toLowerCase();
    return normalizedBranch === 'il';
  }

  /**
   * Create batches from array
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Get sync status summary
   * Note: Detailed queue status requires direct BullMQ queue access
   */
  getSyncStatusSummary(orderId: string): {
    orderId: string;
    message: string;
  } {
    return {
      orderId,
      message:
        'Sync operations have been queued. Check queue dashboard for details.',
    };
  }

  /**
   * Request retry of failed sync operations
   * Note: Actual retry logic should be handled by queue processors
   */
  async requestSyncRetry(orderId: string): Promise<void> {
    this.logger.log(
      `Retry requested for order ${orderId}. Queue processors will handle retry logic.`,
    );

    // Emit event for tracking
    await this.eventBus.publish(
      new OrderSyncRequestedEvent({
        orderId,
        syncType: 'CBB',
        branch: 'il',
        whatsappAlertsEnabled: true,
        delayMs: 0,
      }),
    );
  }
}
