import { ICommand } from '@nestjs/cqrs';
import { ViziWebhookDto } from '@visapi/visanet-types';

/**
 * Command to create a new order from a Vizi webhook
 * Encapsulates all data needed for order creation
 */
export class CreateOrderCommand implements ICommand {
  constructor(
    public readonly webhookData: ViziWebhookDto,
    public readonly correlationId?: string,
  ) {}
}
