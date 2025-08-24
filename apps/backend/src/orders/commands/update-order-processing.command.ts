import { ICommand } from '@nestjs/cqrs';

/**
 * Command to update order processing status
 * Marks an order as processed with workflow and job information
 */
export class UpdateOrderProcessingCommand implements ICommand {
  constructor(
    public readonly orderId: string,
    public readonly workflowId?: string,
    public readonly jobId?: string,
    public readonly correlationId?: string,
  ) {}
}
