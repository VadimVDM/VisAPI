import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ViziWebhooksController } from './vizi-webhooks.controller';
import { ViziWebhooksService } from './vizi-webhooks.service';
import { AuthService } from '../auth/auth.service';
import { MetricsService } from '../metrics/metrics.service';
import { LogService } from '@visapi/backend-logging';

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
        Reflector,
      ],
    }).compile();

    controller = module.get<ViziWebhooksController>(ViziWebhooksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
