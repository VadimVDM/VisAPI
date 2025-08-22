import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { UpdateOrderProcessingCommand } from './update-order-processing.command';
import { OrdersRepository } from '@visapi/backend-repositories';
import { EventBusService, OrderProcessedEvent } from '@visapi/backend-events';

/**
 * Handler for UpdateOrderProcessingCommand
 * Updates order status and emits relevant events
 */
@CommandHandler(UpdateOrderProcessingCommand)
export class UpdateOrderProcessingHandler implements ICommandHandler<UpdateOrderProcessingCommand> {
  private readonly logger = new Logger(UpdateOrderProcessingHandler.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly eventBusService: EventBusService,
  ) {}

  async execute(command: UpdateOrderProcessingCommand): Promise<void> {
    const { orderId, workflowId, jobId, correlationId } = command;

    const order = await this.ordersRepository.findOne({
      where: { order_id: orderId },
    });

    if (!order) {
      this.logger.warn(`[${correlationId}] Order ${orderId} not found for processing update`);
      return;
    }

    await this.ordersRepository.markAsProcessed(order.id, workflowId, jobId);
    
    this.logger.log(`[${correlationId}] Order ${orderId} processing status updated`);

    // Emit domain event if workflow and job are provided
    if (workflowId && jobId) {
      await this.eventBusService.publish(
        new OrderProcessedEvent(
          orderId,
          workflowId,
          jobId,
          correlationId,
          order.id,
        ),
      );
    }
  }
}