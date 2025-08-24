import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { CreateOrderHandler } from './create-order.handler';
import { CreateOrderCommand } from './create-order.command';
import { OrdersRepository } from '@visapi/backend-repositories';
import { EventBusService } from '@visapi/backend-events';
import { OrderTransformerService } from '../services/order-transformer.service';
import { OrderValidatorService } from '../services/order-validator.service';
import { OrderSyncService } from '../services/order-sync.service';
import { ViziWebhookDto } from '@visapi/visanet-types';

describe('CreateOrderHandler', () => {
  let handler: CreateOrderHandler;
  let ordersRepository: jest.Mocked<OrdersRepository>;
  let eventBusService: jest.Mocked<EventBusService>;
  let eventBus: jest.Mocked<EventBus>;
  let transformerService: jest.Mocked<OrderTransformerService>;
  let validatorService: jest.Mocked<OrderValidatorService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateOrderHandler,
        {
          provide: OrdersRepository,
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: EventBusService,
          useValue: {
            publish: jest.fn(),
          },
        },
        {
          provide: EventBus,
          useValue: {
            publish: jest.fn(),
          },
        },
        {
          provide: OrderTransformerService,
          useValue: {
            transformWebhookToOrder: jest.fn(),
          },
        },
        {
          provide: OrderValidatorService,
          useValue: {
            validateOrderData: jest.fn(),
            sanitizeOrderData: jest.fn(),
          },
        },
        {
          provide: OrderSyncService,
          useValue: {
            queueCBBSync: jest.fn(),
            queueWhatsAppMessage: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<CreateOrderHandler>(CreateOrderHandler);
    ordersRepository = module.get(OrdersRepository);
    eventBusService = module.get(EventBusService);
    eventBus = module.get(EventBus);
    transformerService = module.get(OrderTransformerService);
    validatorService = module.get(OrderValidatorService);
    syncService = module.get<jest.Mocked<OrderSyncService>>(OrderSyncService);
  });

  describe('execute', () => {
    it('should successfully create an order with valid data', async () => {
      // Arrange
      const webhookData: Partial<ViziWebhookDto> = {
        order: { id: 'ORD-123' },
        form: { id: 'FORM-456' },
      };

      const command = new CreateOrderCommand(webhookData, 'correlation-123');

      const transformedData = { order_id: 'ORD-123', branch: 'IL' };
      const sanitizedData = { ...transformedData, amount: 1000 };
      const createdOrder = {
        id: 'uuid-123',
        order_id: 'ORD-123',
        branch: 'IL',
        amount: 1000,
        client_email: 'test@example.com',
        whatsapp_alerts_enabled: true,
      };

      transformerService.transformWebhookToOrder.mockReturnValue(
        transformedData,
      );
      validatorService.validateOrderData.mockReturnValue({
        isValid: true,
        missingFields: [],
      });
      validatorService.sanitizeOrderData.mockReturnValue(sanitizedData);
      ordersRepository.create.mockResolvedValue(createdOrder);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result).toBe('uuid-123');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(transformerService.transformWebhookToOrder).toHaveBeenCalledWith(
        webhookData,
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(validatorService.validateOrderData).toHaveBeenCalledWith(
        transformedData,
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(validatorService.sanitizeOrderData).toHaveBeenCalledWith(
        transformedData,
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(ordersRepository.create).toHaveBeenCalledWith(sanitizedData);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(eventBusService.publish).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'OrderCreatedForSync',
          orderId: 'ORD-123',
        }),
      );
    });

    it('should handle duplicate order gracefully', async () => {
      // Arrange
      const webhookData: Partial<ViziWebhookDto> = { order: { id: 'ORD-DUP' } };
      const command = new CreateOrderCommand(webhookData);

      const transformedData = { order_id: 'ORD-DUP' };
      const existingOrder = { id: 'existing-uuid', order_id: 'ORD-DUP' };

      transformerService.transformWebhookToOrder.mockReturnValue(
        transformedData,
      );
      validatorService.validateOrderData.mockReturnValue({
        isValid: true,
        missingFields: [],
      });
      validatorService.sanitizeOrderData.mockReturnValue(transformedData);

      // Simulate duplicate key error
      const duplicateError = Object.assign(new Error('duplicate key'), {
        code: '23505',
      });
      ordersRepository.create.mockRejectedValue(duplicateError);
      ordersRepository.findOne.mockResolvedValue(existingOrder);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result).toBe('existing-uuid');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(ordersRepository.findOne).toHaveBeenCalledWith({
        where: { order_id: 'ORD-DUP' },
      });
    });

    it('should throw error when validation fails', async () => {
      // Arrange
      const webhookData: Partial<ViziWebhookDto> = {
        order: { id: 'ORD-INVALID' },
      };
      const command = new CreateOrderCommand(webhookData);

      transformerService.transformWebhookToOrder.mockReturnValue({});
      validatorService.validateOrderData.mockReturnValue({
        isValid: false,
        missingFields: ['order_id', 'branch'],
      });

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'Order validation failed: order_id, branch',
      );
    });
  });
});
