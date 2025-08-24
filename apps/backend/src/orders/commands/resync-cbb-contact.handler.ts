import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger, NotFoundException } from '@nestjs/common';
import { ResyncCBBContactCommand } from './resync-cbb-contact.command';
import { CBBSyncOrchestratorService } from '../../queue/services/cbb-sync-orchestrator.service';
import { OrdersRepository } from '@visapi/backend-repositories';
import { CBBContactSyncResult } from '@visapi/shared-types';
import { LogService } from '@visapi/backend-logging';

/**
 * Handler for ResyncCBBContactCommand
 * Manually triggers CBB contact synchronization for recovery/admin purposes
 */
@CommandHandler(ResyncCBBContactCommand)
export class ResyncCBBContactHandler
  implements ICommandHandler<ResyncCBBContactCommand>
{
  private readonly logger = new Logger(ResyncCBBContactHandler.name);

  constructor(
    private readonly syncOrchestrator: CBBSyncOrchestratorService,
    private readonly ordersRepository: OrdersRepository,
    private readonly logService: LogService,
  ) {}

  async execute(
    command: ResyncCBBContactCommand,
  ): Promise<CBBContactSyncResult> {
    const { orderId, correlationId } = command;

    this.logger.log(
      `[${correlationId}] Processing ResyncCBBContactCommand for Vizi order: ${orderId}`,
    );

    // Verify order exists - look up by Vizi order ID
    const orders = await this.ordersRepository.findMany({
      where: { order_id: orderId },
    });
    const order = orders?.[0];

    if (!order) {
      throw new NotFoundException(`Order not found with Vizi ID: ${orderId}`);
    }

    // Log the resync request
    await this.logService.createLog({
      level: 'info',
      message: `Manual CBB resync requested for order ${orderId}`,
      metadata: {
        database_id: order.id,
        vizi_order_id: orderId,
        phone_number: order.client_phone,
        branch: order.branch,
        source: 'admin_resync',
        correlation_id: correlationId,
      },
      correlation_id: correlationId,
    });

    try {
      // Execute the sync using the same orchestrator service
      // This ensures we follow the exact same process as automatic sync
      const result = await this.syncOrchestrator.syncOrderToCBB(orderId);

      this.logger.log(
        `[${correlationId}] CBB resync completed for order ${orderId}`,
        result,
      );

      // Log success
      await this.logService.createLog({
        level: 'info',
        message: `CBB resync successful for order ${orderId}`,
        metadata: {
          database_id: order.id,
          vizi_order_id: orderId,
          result,
          source: 'admin_resync',
          correlation_id: correlationId,
        },
        correlation_id: correlationId,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `[${correlationId}] CBB resync failed for order ${orderId}: ${errorMessage}`,
        error,
      );

      // Log failure
      await this.logService.createLog({
        level: 'error',
        message: `CBB resync failed for order ${orderId}`,
        metadata: {
          database_id: order.id,
          vizi_order_id: orderId,
          error: errorMessage,
          source: 'admin_resync',
          correlation_id: correlationId,
        },
        correlation_id: correlationId,
      });

      throw error;
    }
  }
}
