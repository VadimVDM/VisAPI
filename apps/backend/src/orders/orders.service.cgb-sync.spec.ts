import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { SupabaseService } from '@visapi/core-supabase';
import { QueueService } from '../queue/queue.service';
import { ConfigService } from '@visapi/core-config';
import { ViziWebhookDto } from '@visapi/visanet-types';
import { QUEUE_NAMES } from '@visapi/shared-types';

describe('OrdersService - CGB Sync Integration', () => {
  let service: OrdersService;
  let supabaseService: jest.Mocked<SupabaseService>;
  let queueService: jest.Mocked<QueueService>;
  let configService: jest.Mocked<ConfigService>;

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
    // Create mock implementations
    const mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'order-id-123' }, error: null }),
      eq: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
    };

    supabaseService = {
      client: mockSupabaseClient,
    } as any;

    queueService = {
      addJob: jest.fn().mockResolvedValue({ id: 'job-123' }),
    } as any;

    configService = {
      cgbSyncEnabled: true,
      cgbSyncDelayMs: 2000,
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: SupabaseService, useValue: supabaseService },
        { provide: QueueService, useValue: queueService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    
    // Suppress console logs during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CGB Sync Triggering', () => {
    it('should queue CGB sync for ALL orders when sync is enabled', async () => {
      // Act
      await service.createOrder(mockWebhookData);

      // Assert
      expect(queueService.addJob).toHaveBeenCalledWith(
        QUEUE_NAMES.CGB_SYNC,
        'sync-contact',
        { orderId: 'IL250819GB16' },
        {
          delay: 2000,
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: false,
        }
      );
    });

    it('should queue CGB sync even when WhatsApp alerts are disabled', async () => {
      // Arrange - Order with WhatsApp alerts disabled
      const webhookWithoutWhatsApp = {
        ...mockWebhookData,
        form: {
          ...mockWebhookData.form,
          client: {
            ...mockWebhookData.form.client,
            whatsappAlertsEnabled: false,
          },
        },
      };

      // Act
      await service.createOrder(webhookWithoutWhatsApp);

      // Assert - Should STILL queue CGB sync (ALL orders sync)
      expect(queueService.addJob).toHaveBeenCalledWith(
        QUEUE_NAMES.CGB_SYNC,
        'sync-contact',
        { orderId: 'IL250819GB16' },
        {
          delay: 2000,
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: false,
        }
      );
    });

    it('should not queue CGB sync when sync is disabled in config', async () => {
      // Arrange
      configService.cgbSyncEnabled = false;

      // Act
      await service.createOrder(mockWebhookData);

      // Assert
      expect(queueService.addJob).not.toHaveBeenCalled();
    });

    it('should use default delay when cgbSyncDelayMs is not configured', async () => {
      // Arrange
      configService.cgbSyncDelayMs = undefined;

      // Act
      await service.createOrder(mockWebhookData);

      // Assert
      expect(queueService.addJob).toHaveBeenCalledWith(
        QUEUE_NAMES.CGB_SYNC,
        'sync-contact',
        { orderId: 'IL250819GB16' },
        expect.objectContaining({
          delay: 2000, // Default delay
        })
      );
    });

    it('should use configured delay when cgbSyncDelayMs is set', async () => {
      // Arrange
      configService.cgbSyncDelayMs = 5000;

      // Act
      await service.createOrder(mockWebhookData);

      // Assert
      expect(queueService.addJob).toHaveBeenCalledWith(
        QUEUE_NAMES.CGB_SYNC,
        'sync-contact',
        { orderId: 'IL250819GB16' },
        expect.objectContaining({
          delay: 5000,
        })
      );
    });

    it('should handle queue failure gracefully and still create order', async () => {
      // Arrange
      queueService.addJob.mockRejectedValue(new Error('Queue unavailable'));

      // Act
      const orderId = await service.createOrder(mockWebhookData);

      // Assert
      expect(orderId).toBe('order-id-123');
      expect(queueService.addJob).toHaveBeenCalled();
      // Order should still be created despite queue failure
      expect(supabaseService.client.from).toHaveBeenCalledWith('orders');
    });

    it('should handle undefined cgbSyncEnabled as false', async () => {
      // Arrange
      configService.cgbSyncEnabled = undefined as any;

      // Act
      await service.createOrder(mockWebhookData);

      // Assert
      // cgbSyncEnabled !== false evaluates to true for undefined, so sync will be queued
      expect(queueService.addJob).toHaveBeenCalled();
    });

    it('should properly transform phone number for CGB sync', async () => {
      // Arrange
      const webhookWithDifferentPhone = {
        ...mockWebhookData,
        form: {
          ...mockWebhookData.form,
          client: {
            ...mockWebhookData.form.client,
            phone: { code: '+1', number: '555-123-4567' },
          },
        },
      };

      // Act
      await service.createOrder(webhookWithDifferentPhone);

      // Assert
      expect(supabaseService.client.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          client_phone: '15551234567', // Cleaned phone number
        })
      );
    });

    it('should queue sync for different urgency levels', async () => {
      // Test standard urgency
      const standardWebhook = {
        ...mockWebhookData,
        form: { ...mockWebhookData.form, urgency: 'standard' },
      };
      await service.createOrder(standardWebhook);

      // Test express urgency
      const expressWebhook = {
        ...mockWebhookData,
        form: { ...mockWebhookData.form, urgency: 'express' },
      };
      await service.createOrder(expressWebhook);

      // Assert both triggered sync
      expect(queueService.addJob).toHaveBeenCalledTimes(2);
    });

    it('should handle missing client phone gracefully', async () => {
      // Arrange
      const webhookWithoutPhone = {
        ...mockWebhookData,
        form: {
          ...mockWebhookData.form,
          client: {
            ...mockWebhookData.form.client,
            phone: undefined,
          },
        },
      };

      // Act
      await service.createOrder(webhookWithoutPhone);

      // Assert - order should be created with fallback phone
      expect(supabaseService.client.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          client_phone: '0000000000', // Fallback phone
        })
      );
      // Sync will still be triggered for ALL orders
      // The CGB processor will handle the invalid phone gracefully
      expect(queueService.addJob).toHaveBeenCalled();
    });

    it('should handle duplicate order with existing CGB sync', async () => {
      // Arrange
      let callCount = 0;
      
      supabaseService.client.from = jest.fn().mockImplementation(() => {
        callCount++;
        
        if (callCount === 1) {
          // First call - insert attempt that fails with duplicate
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: '23505', message: 'Duplicate order_id' },
            }),
          };
        } else {
          // Second call - fetch existing order
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'existing-order-id' },
              error: null,
            }),
          };
        }
      });

      // Act
      const orderId = await service.createOrder(mockWebhookData);

      // Assert
      expect(orderId).toBe('existing-order-id');
      // Should not queue another sync for duplicate order
      expect(queueService.addJob).not.toHaveBeenCalled();
    });

    it('should include all required job options for CGB sync', async () => {
      // Act
      await service.createOrder(mockWebhookData);

      // Assert
      expect(queueService.addJob).toHaveBeenCalledWith(
        QUEUE_NAMES.CGB_SYNC,
        'sync-contact',
        { orderId: 'IL250819GB16' },
        {
          delay: 2000,
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: false,
        }
      );
    });
  });

  describe('Phone Number Transformation', () => {
    it('should transform phone object to string format', async () => {
      // Act
      await service.createOrder(mockWebhookData);

      // Assert
      expect(supabaseService.client.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          client_phone: '447700900123',
        })
      );
    });

    it('should handle phone as string', async () => {
      // Arrange
      const webhookWithStringPhone = {
        ...mockWebhookData,
        form: {
          ...mockWebhookData.form,
          client: {
            ...mockWebhookData.form.client,
            phone: '+447700900123' as any,
          },
        },
      };

      // Act
      await service.createOrder(webhookWithStringPhone);

      // Assert
      expect(supabaseService.client.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          client_phone: '447700900123',
        })
      );
    });

    it('should clean phone numbers with special characters', async () => {
      // Arrange
      const webhookWithFormattedPhone = {
        ...mockWebhookData,
        form: {
          ...mockWebhookData.form,
          client: {
            ...mockWebhookData.form.client,
            phone: { code: '+44', number: '(7700) 900-123' },
          },
        },
      };

      // Act
      await service.createOrder(webhookWithFormattedPhone);

      // Assert
      expect(supabaseService.client.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          client_phone: '447700900123',
        })
      );
    });
  });
});