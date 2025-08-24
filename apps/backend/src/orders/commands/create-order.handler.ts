import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { CreateOrderCommand } from './create-order.command';
import { OrdersRepository } from '@visapi/backend-repositories';
import { EventBusService, OrderCreatedEvent } from '@visapi/backend-events';
import { OrderTransformerService } from '../services/order-transformer.service';
import { OrderValidatorService } from '../services/order-validator.service';
import { OrderSyncService } from '../services/order-sync.service';
import { OrderCreatedForSyncEvent } from '../events/order-created-for-sync.event';

/**
 * Handler for CreateOrderCommand
 * Orchestrates the order creation process with clean separation of concerns
 */
@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler implements ICommandHandler<CreateOrderCommand> {
  private readonly logger = new Logger(CreateOrderHandler.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly transformerService: OrderTransformerService,
    private readonly validatorService: OrderValidatorService,
    private readonly syncService: OrderSyncService,
    private readonly eventBusService: EventBusService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateOrderCommand): Promise<string> {
    const { webhookData, correlationId } = command;

    this.logger.debug(
      `[${correlationId}] Processing CreateOrderCommand for order: ${webhookData.order?.id}`,
    );

    // Transform webhook data
    const orderData =
      this.transformerService.transformWebhookToOrder(webhookData);

    // Validate order data
    const validationResult = this.validatorService.validateOrderData(orderData);
    if (!validationResult.isValid) {
      throw new Error(
        `Order validation failed: ${validationResult.missingFields.join(', ')}`,
      );
    }

    // Sanitize order data
    const sanitizedData = this.validatorService.sanitizeOrderData(orderData);

    try {
      // Create order in repository
      const order = await this.ordersRepository.create(sanitizedData);

      this.logger.log(
        `[${correlationId}] Order created successfully: ${order.id}`,
      );

      // Publish domain event
      await this.eventBusService.publish(
        new OrderCreatedEvent(
          order.order_id,
          order.client_email,
          order.branch,
          order.amount,
          correlationId,
          order.id,
        ),
      );

      // Trigger async processes through events using proper event class
      this.eventBus.publish(
        new OrderCreatedForSyncEvent(
          order.order_id,
          order.branch,
          order.whatsapp_alerts_enabled,
          correlationId,
        ),
      );

      return order.id;
    } catch (error) {
      // Handle duplicate orders gracefully
      const isDuplicateError =
        error instanceof Error &&
        (('code' in error && error.code === '23505') ||
          error.message?.includes('duplicate key'));

      if (isDuplicateError) {
        this.logger.warn(
          `[${correlationId}] Order ${sanitizedData.order_id} already exists`,
        );

        const existingOrder = await this.ordersRepository.findOne({
          where: { order_id: sanitizedData.order_id },
        });

        if (existingOrder) {
          return existingOrder.id;
        }
      }

      throw error;
    }
  }
}
