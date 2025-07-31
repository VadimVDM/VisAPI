import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import {
  TerminusModule,
  HealthCheckService,
  HealthCheckResult,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from './indicators/redis.health';
import { SupabaseHealthIndicator } from './indicators/supabase.health';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;

  const mockHealthCheckService = {
    check: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: RedisHealthIndicator,
          useValue: {
            isHealthy: jest.fn(),
          },
        },
        {
          provide: SupabaseHealthIndicator,
          useValue: {
            isHealthy: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get(HealthCheckService);
    module.get<RedisHealthIndicator>(RedisHealthIndicator);
    module.get<SupabaseHealthIndicator>(SupabaseHealthIndicator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return healthy status when all services are up', async () => {
      const mockHealthResult: HealthCheckResult = {
        status: 'ok',
        info: {
          redis: {
            status: 'up',
          },
          database: {
            status: 'up',
          },
        },
        error: {},
        details: {
          redis: {
            status: 'up',
          },
          database: {
            status: 'up',
          },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(mockHealthResult);

      const result = await controller.check();

      expect(result).toEqual(mockHealthResult);
      expect(mockHealthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
        expect.any(Function),
      ]);
    });

    it('should return error status when services are down', async () => {
      const mockHealthResult: HealthCheckResult = {
        status: 'error',
        info: {},
        error: {
          redis: {
            status: 'down',
          },
          database: {
            status: 'down',
          },
        },
        details: {
          redis: {
            status: 'down',
          },
          database: {
            status: 'down',
          },
        },
      };

      const error = new Error('Service Unavailable');
      (error as any).response = mockHealthResult;

      mockHealthCheckService.check.mockRejectedValue(error);

      await expect(controller.check()).rejects.toThrow(error);
    });
  });

  describe('liveness', () => {
    it('should return ok status for liveness probe', () => {
      const result = controller.liveness();

      expect(result).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
      });
    });
  });
});
