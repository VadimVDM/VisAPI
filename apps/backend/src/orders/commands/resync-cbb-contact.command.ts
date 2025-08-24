import { ICommand } from '@nestjs/cqrs';

/**
 * Command to manually resync a CBB contact for an order
 * Used for admin recovery operations when sync failed or needs refresh
 */
export class ResyncCBBContactCommand implements ICommand {
  constructor(
    public readonly orderId: string,
    public readonly correlationId?: string,
  ) {}
}
