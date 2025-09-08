import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ViziWebhooksController } from './vizi-webhooks.controller';
import { ViziWebhooksService } from './vizi-webhooks.service';
import { AuthService } from '../auth/auth.service';
import { MetricsService } from '../metrics/metrics.service';
import { LogService } from '@visapi/backend-logging';
import { OrdersService } from '../orders/orders.service';
import { IdempotencyService } from '@visapi/util-redis';
import { OrdersRepository } from '@visapi/backend-repositories';
import { QueueService } from '../queue/queue.service';
import { SupabaseService } from '@visapi/core-supabase';

describe('ViziWebhooksController', () => {
  let controller: ViziWebhooksController;

  beforeEach(async () => {
    const mockViziWebhooksService = {
      processViziOrder: jest.fn(),
    };

    const mockAuthService = {
      validateApiKey: jest.fn(),
      checkScopes: jest.fn(),
    };

    const mockMetricsService = {
      recordApiKeyValidation: jest.fn(),
    };

    const mockLogService = {
      createLog: jest.fn(),
    };

    const mockOrdersService = {
      createOrder: jest.fn(),
      updateOrderProcessing: jest.fn(),
    };

    const mockIdempotencyService = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const mockCommandBus = {
      execute: jest.fn(),
    };

    const mockQueryBus = {
      execute: jest.fn(),
    };

    const mockOrdersRepository = {
      findById: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const mockQueueService = {
      addJob: jest.fn(),
    };

    const mockSupabaseService = {
      client: {
        from: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ViziWebhooksController],
      providers: [
        {
          provide: ViziWebhooksService,
          useValue: mockViziWebhooksService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
        {
          provide: LogService,
          useValue: mockLogService,
        },
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
        {
          provide: IdempotencyService,
          useValue: mockIdempotencyService,
        },
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
        {
          provide: QueryBus,
          useValue: mockQueryBus,
        },
        {
          provide: OrdersRepository,
          useValue: mockOrdersRepository,
        },
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<ViziWebhooksController>(ViziWebhooksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
