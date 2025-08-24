import { ICommand } from '@nestjs/cqrs';

/**
 * Command to sync an order to CBB system
 * Triggers the synchronization workflow for a specific order
 */
export class SyncOrderToCBBCommand implements ICommand {
  constructor(
    public readonly orderId: string,
    public readonly branch: string,
    public readonly whatsappAlertsEnabled: boolean,
    public readonly correlationId?: string,
  ) {}
}
