import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { SyncOrderToCBBCommand } from './sync-order-to-cbb.command';
import { OrderSyncService } from '../services/order-sync.service';

/**
 * Handler for SyncOrderToCBBCommand
 * Manages the CBB synchronization process
 */
@CommandHandler(SyncOrderToCBBCommand)
export class SyncOrderToCBBHandler
  implements ICommandHandler<SyncOrderToCBBCommand>
{
  private readonly logger = new Logger(SyncOrderToCBBHandler.name);

  constructor(private readonly syncService: OrderSyncService) {}

  async execute(command: SyncOrderToCBBCommand): Promise<void> {
    const { orderId, branch, whatsappAlertsEnabled, correlationId } = command;

    this.logger.log(
      `[${correlationId}] Processing SyncOrderToCBBCommand for order: ${orderId}`,
    );

    // Queue CBB synchronization
    await this.syncService.queueCBBSync({
      orderId,
      branch,
      whatsappAlertsEnabled,
    });

    // Queue WhatsApp notification if enabled
    if (whatsappAlertsEnabled) {
      await this.syncService.queueWhatsAppMessage(
        orderId,
        whatsappAlertsEnabled,
        branch,
      );
    }

    this.logger.log(
      `[${correlationId}] Order ${orderId} queued for CBB sync and notifications`,
    );
  }
}
