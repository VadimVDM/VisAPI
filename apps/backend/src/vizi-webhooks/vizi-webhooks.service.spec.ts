import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ViziWebhooksService } from './vizi-webhooks.service';
import { QueueService } from '../queue/queue.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { SupabaseService } from '@visapi/core-supabase';
import { LogService } from '@visapi/backend-logging';
import { OrdersService } from '../orders/orders.service';

describe('ViziWebhooksService', () => {
  let service: ViziWebhooksService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const mockQueueService = {
      addJob: jest.fn(),
    };

    const mockWorkflowsService = {
      getWorkflowsByName: jest.fn(),
    };

    const mockSupabaseService = {
      serviceClient: {
        from: jest.fn(),
      },
    };

    const mockLogService = {
      createLog: jest.fn(),
    };

    const mockOrdersService = {
      createOrder: jest.fn(),
      updateOrderProcessing: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ViziWebhooksService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
        {
          provide: WorkflowsService,
          useValue: mockWorkflowsService,
        },
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
        {
          provide: LogService,
          useValue: mockLogService,
        },
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    }).compile();

    service = module.get<ViziWebhooksService>(ViziWebhooksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
