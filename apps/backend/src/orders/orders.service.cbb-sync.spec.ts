import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { OrdersService } from './orders.service';
import { ViziWebhookDto } from '@visapi/visanet-types';

describe('OrdersService - CQRS Integration', () => {
  let service: OrdersService;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };

  const mockWebhookData: ViziWebhookDto = {
    order: {
      id: 'IL250819GB16',
      form_id: 'form-123',
      branch: 'IL',
      domain: 'visanet.app',
      payment_processor: 'stripe',
      payment_id: 'pay_123',
      amount: 100,
      currency: 'GBP',
      status: 'active',
      coupon: null,
    },
    form: {
      id: 'form-123',
      country: 'UK',
      client: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: { code: '+44', number: '7700900123' },
        whatsappAlertsEnabled: true,
      },
      product: {
        name: 'UK Tourist Visa',
        country: 'UK',
        docType: 'tourist',
        docName: 'UK Tourist Visa',
      },
      quantity: 2,
      urgency: 'urgent',
      termsAgreed: true,
      orderId: 'IL250819GB16',
      applicants: [
        {
          passport: {
            number: 'ABC123456',
            country: 'IL',
            expiry: '2030-01-01',
          },
          files: {
            face: 'https://example.com/face.jpg',
            passport: 'https://example.com/passport.jpg',
          },
        },
      ],
    },
  };

  beforeEach(async () => {
    commandBus = {
      execute: jest.fn().mockResolvedValue('order-id-123'),
    };

    queryBus = {
      execute: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);

    // Suppress console logs during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CQRS Command Execution', () => {
    it('should execute CreateOrderCommand via CommandBus', async () => {
      // Act
      const result = await service.createOrder(mockWebhookData);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          webhookData: mockWebhookData,
          correlationId: undefined,
        }),
      );
      expect(result).toBe('order-id-123');
    });

    it('should execute CreateOrderCommand with correlation ID when provided', async () => {
      // Act
      const result = await service.createOrder(
        mockWebhookData,
        'test-correlation-123',
      );

      // Assert
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          webhookData: mockWebhookData,
          correlationId: 'test-correlation-123',
        }),
      );
      expect(result).toBe('order-id-123');
    });

    it('should handle command bus errors gracefully', async () => {
      // Arrange
      commandBus.execute.mockRejectedValue(
        new Error('Command execution failed'),
      );

      // Act & Assert
      await expect(service.createOrder(mockWebhookData)).rejects.toThrow(
        'Command execution failed',
      );
      expect(commandBus.execute).toHaveBeenCalled();
    });
  });

  describe('syncOrderToCBB', () => {
    it('should execute SyncOrderToCBBCommand via CommandBus', async () => {
      // Arrange
      commandBus.execute.mockResolvedValue(undefined);

      // Act
      await service.syncOrderToCBB('order-123', 'IL', true, 'correlation-456');

      // Assert
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-123',
          branch: 'IL',
          whatsappAlertsEnabled: true,
          correlationId: 'correlation-456',
        }),
      );
    });

    it('should handle sync command errors gracefully', async () => {
      // Arrange
      commandBus.execute.mockRejectedValue(new Error('Sync failed'));

      // Act & Assert
      await expect(
        service.syncOrderToCBB('order-123', 'IL', true),
      ).rejects.toThrow('Sync failed');
    });
  });

  describe('updateOrderProcessing', () => {
    it('should execute UpdateOrderProcessingCommand via CommandBus', async () => {
      // Arrange
      commandBus.execute.mockResolvedValue(undefined);

      // Act
      await service.updateOrderProcessing(
        'order-123',
        'workflow-123',
        'job-456',
        'correlation-789',
      );

      // Assert
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-123',
          workflowId: 'workflow-123',
          jobId: 'job-456',
          correlationId: 'correlation-789',
        }),
      );
    });
  });

  describe('getOrders', () => {
    it('should execute GetOrdersQuery via QueryBus', async () => {
      // Arrange
      const mockOrders = [{ id: 'order-1' }, { id: 'order-2' }];
      queryBus.execute.mockResolvedValue(mockOrders);

      // Act
      const result = await service.getOrders(
        { branch: 'IL' },
        { page: 1, limit: 10 },
      );

      // Assert
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: { branch: 'IL' },
          pagination: { page: 1, limit: 10 },
        }),
      );
      expect(result).toEqual(mockOrders);
    });
  });

  describe('getOrderById', () => {
    it('should execute GetOrderByIdQuery via QueryBus', async () => {
      // Arrange
      const mockOrder = { id: 'order-123', order_id: 'IL250819GB16' };
      queryBus.execute.mockResolvedValue(mockOrder);

      // Act
      const result = await service.getOrderById('order-123');

      // Assert
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-123',
          includeRelations: false,
        }),
      );
      expect(result).toEqual(mockOrder);
    });
  });
});
